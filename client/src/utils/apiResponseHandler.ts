import { AxiosResponse } from 'axios';

// Standard API response structure
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  errors?: string[];
  warnings?: string[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

// Standard error response structure
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

// Response extraction utilities
export class ApiResponseHandler {
  /**
   * Extract data from API response with proper error handling
   */
  static extractData<T>(response: AxiosResponse<ApiResponse<T>> | AxiosResponse<T>): T {
    // Handle nested data structure (response.data.data)
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return (response.data as ApiResponse<T>).data;
    }

    // Handle direct data structure (response.data)
    return response.data as T;
  }

  /**
   * Extract data with fallback for different response structures
   */
  static extractDataSafe<T>(
    response: AxiosResponse<ApiResponse<T>> | AxiosResponse<T> | unknown,
    fallback: T
  ): T {
    try {
      if (!response) return fallback;

      // Handle axios response
      if (response && typeof response === 'object' && 'data' in response) {
        return this.extractData(response as AxiosResponse<ApiResponse<T>>);
      }

      // Handle direct data
      if (response && typeof response === 'object') {
        const respObj = response as Record<string, unknown>;
        if ('data' in respObj) {
          return respObj.data as T;
        }
        return response as T;
      }

      return fallback;
    } catch (error) {
      console.warn('Failed to extract data from response:', error);
      return fallback;
    }
  }

  /**
   * Extract data array with proper fallback
   */
  static extractDataArray<T>(
    response: AxiosResponse<ApiResponse<T[]>> | AxiosResponse<T[]> | any,
    fallback: T[] = []
  ): T[] {
    const data = this.extractDataSafe(response, fallback);
    return Array.isArray(data) ? data : fallback;
  }

  /**
   * Extract single data item with fallback
   */
  static extractDataItem<T>(
    response: AxiosResponse<ApiResponse<T>> | AxiosResponse<T> | any,
    fallback: T
  ): T {
    const data = this.extractDataSafe(response, fallback);
    return data || fallback;
  }

  /**
   * Check if response is successful
   */
  static isSuccess(response: AxiosResponse<ApiResponse<unknown>> | AxiosResponse<unknown> | unknown): boolean {
    if (!response) return false;

    // Check HTTP status
    if (typeof response === 'object' && response !== null && 'status' in response) {
      const status = (response as { status: number }).status;
      if (status < 200 || status >= 300) {
        return false;
      }
    }

    // Check custom success flag
    if (typeof response === 'object' && response !== null) {
      const respAny = response as Record<string, unknown>;
      const respData = respAny.data as Record<string, unknown> | undefined;
      if (respData && 'success' in respData) {
        return Boolean((respData as Record<string, unknown>)['success']);
      }
    }

    return true;
  }

  /**
   * Extract error message from response
   */
  static extractError(response: unknown): string {
    if (!response) return 'Bilinmeyen hata';

    const respAny = response as Record<string, unknown>;

    // Handle axios error response
    const axiosResp = respAny['response'] as Record<string, unknown> | undefined;
    const errorData = axiosResp?.['data'] as Record<string, unknown> | string | undefined;
    if (typeof errorData === 'string') return errorData;
    if (errorData && typeof errorData === 'object') {
      const errObj = errorData as Record<string, unknown>;

      // Many APIs wrap error details under "error"
      const nestedError = errObj['error'];
      if (typeof nestedError === 'string') {
        return nestedError;
      }
      if (nestedError && typeof nestedError === 'object') {
        const nestedObj = nestedError as Record<string, unknown>;
        const nestedMsg = nestedObj['message'];
        if (typeof nestedMsg === 'string' && nestedMsg.trim().length > 0) {
          return nestedMsg;
        }
      }

      // Direct message on root
      const directMsg = errObj['message'];
      if (typeof directMsg === 'string' && directMsg.trim().length > 0) {
        return directMsg;
      }

      // Aggregated errors array
      const errs = errObj['errors'] as unknown;
      if (Array.isArray(errs)) {
        const joined = (errs as unknown[])
          .map((e) => {
            if (typeof e === 'string') return e;
            if (e && typeof e === 'object' && 'message' in (e as Record<string, unknown>)) {
              const m = (e as Record<string, unknown>)['message'];
              return typeof m === 'string' ? m : '';
            }
            return '';
          })
          .filter(Boolean)
          .join(', ');
        if (joined) return joined;
      }
    }

    // Handle direct error object
    const directError = respAny['error'];
    if (typeof directError === 'string' && directError.trim().length > 0) {
      return directError;
    }
    if (directError && typeof directError === 'object') {
      const directErrObj = directError as Record<string, unknown>;
      const directErrMsg = directErrObj['message'];
      if (typeof directErrMsg === 'string' && directErrMsg.trim().length > 0) {
        return directErrMsg;
      }
    }

    const directMessage = respAny['message'];
    if (typeof directMessage === 'string' && directMessage.trim().length > 0) {
      return directMessage;
    }

    // Handle HTTP status errors
    const status = respAny['status'] as number | undefined;
    if (status) {
      switch (status) {
        case 400: return 'Geçersiz istek';
        case 401: return 'Yetkisiz erişim';
        case 403: return 'Erişim reddedildi';
        case 404: return 'Kaynak bulunamadı';
        case 500: return 'Sunucu hatası';
        default: return `HTTP ${status} hatası`;
      }
    }

    return 'Bilinmeyen hata';
  }

  /**
   * Create standardized error object
   */
  static createError(message: string, code?: string, status?: number): ApiError {
    return {
      message,
      code: code || 'UNKNOWN_ERROR',
      status: status || 500
    };
  }

  /**
   * Handle API response with proper error handling
   */
  static async handleResponse<T>(
    apiCall: Promise<AxiosResponse<T>>,
    fallback: T
  ): Promise<{ data: T; error: string | null }> {
    try {
      const response = await apiCall;
      const data = this.extractDataSafe(response, fallback);
      return { data, error: null };
    } catch (error: unknown) {
      const errorMessage = this.extractError(error);
      return { data: fallback, error: errorMessage };
    }
  }

  /**
   * Handle API response array with proper error handling
   */
  static async handleResponseArray<T>(
    apiCall: Promise<AxiosResponse<T[]>>,
    fallback: T[] = []
  ): Promise<{ data: T[]; error: string | null }> {
    try {
      const response = await apiCall;
      const data = this.extractDataArray(response, fallback);
      return { data, error: null };
    } catch (error: unknown) {
      const errorMessage = this.extractError(error);
      return { data: fallback, error: errorMessage };
    }
  }
}

// Convenience functions for common use cases
export const extractData = <T>(response: unknown, fallback: T): T =>
  ApiResponseHandler.extractDataSafe(response, fallback);

export const extractDataArray = <T>(response: unknown, fallback: T[] = []): T[] =>
  ApiResponseHandler.extractDataArray(response, fallback);

export const extractDataItem = <T>(response: unknown, fallback: T): T =>
  ApiResponseHandler.extractDataItem(response, fallback);

export const isSuccess = (response: unknown): boolean =>
  ApiResponseHandler.isSuccess(response);

export const extractError = (response: unknown): string =>
  ApiResponseHandler.extractError(response);

export const handleResponse = <T>(apiCall: Promise<AxiosResponse<T>>, fallback: T) =>
  ApiResponseHandler.handleResponse(apiCall, fallback);

export const handleResponseArray = <T>(apiCall: Promise<AxiosResponse<T[]>>, fallback: T[] = []) =>
  ApiResponseHandler.handleResponseArray(apiCall, fallback);
