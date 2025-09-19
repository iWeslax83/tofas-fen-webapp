import { AxiosResponse } from 'axios';

// Standard API response structure
export interface ApiResponse<T = any> {
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
  details?: any;
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
    response: AxiosResponse<ApiResponse<T>> | AxiosResponse<T> | any,
    fallback: T
  ): T {
    try {
      if (!response) return fallback;
      
      // Handle axios response
      if (response.data !== undefined) {
        return this.extractData(response);
      }
      
      // Handle direct data
      if (response && typeof response === 'object') {
        if ('data' in response) {
          return response.data;
        }
        return response;
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
  static isSuccess(response: AxiosResponse<ApiResponse<any>> | AxiosResponse<any> | any): boolean {
    if (!response) return false;
    
    // Check HTTP status
    if (response.status && (response.status < 200 || response.status >= 300)) {
      return false;
    }
    
    // Check custom success flag
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      return (response.data as ApiResponse).success === true;
    }
    
    return true;
  }

  /**
   * Extract error message from response
   */
  static extractError(response: any): string {
    if (!response) return 'Bilinmeyen hata';
    
    // Handle axios error response
    if (response.response?.data) {
      const errorData = response.response.data;
      if (typeof errorData === 'string') return errorData;
      if (errorData.error) return errorData.error;
      if (errorData.message) return errorData.message;
      if (errorData.errors && Array.isArray(errorData.errors)) {
        return errorData.errors.join(', ');
      }
    }
    
    // Handle direct error object
    if (response.error) return response.error;
    if (response.message) return response.message;
    
    // Handle HTTP status errors
    if (response.status) {
      switch (response.status) {
        case 400: return 'Geçersiz istek';
        case 401: return 'Yetkisiz erişim';
        case 403: return 'Erişim reddedildi';
        case 404: return 'Kaynak bulunamadı';
        case 500: return 'Sunucu hatası';
        default: return `HTTP ${response.status} hatası`;
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
      code,
      status
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
    } catch (error: any) {
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
    } catch (error: any) {
      const errorMessage = this.extractError(error);
      return { data: fallback, error: errorMessage };
    }
  }
}

// Convenience functions for common use cases
export const extractData = <T>(response: any, fallback: T): T => 
  ApiResponseHandler.extractDataSafe(response, fallback);

export const extractDataArray = <T>(response: any, fallback: T[] = []): T[] => 
  ApiResponseHandler.extractDataArray(response, fallback);

export const extractDataItem = <T>(response: any, fallback: T): T => 
  ApiResponseHandler.extractDataItem(response, fallback);

export const isSuccess = (response: any): boolean => 
  ApiResponseHandler.isSuccess(response);

export const extractError = (response: any): string => 
  ApiResponseHandler.extractError(response);

export const handleResponse = <T>(apiCall: Promise<any>, fallback: T) => 
  ApiResponseHandler.handleResponse(apiCall, fallback);

export const handleResponseArray = <T>(apiCall: Promise<any>, fallback: T[] = []) => 
  ApiResponseHandler.handleResponseArray(apiCall, fallback);
