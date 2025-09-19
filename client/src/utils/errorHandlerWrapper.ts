import { ErrorType, ErrorSeverity, AppError } from './errorHandling';

// Error handling wrapper for API calls
export class ErrorHandlerWrapper {
  /**
   * Wrap API calls with standardized error handling
   */
  static async wrapApiCall<T>(
    apiCall: () => Promise<T>,
    context: {
      component: string;
      action: string;
      userId?: string;
    }
  ): Promise<T> {
    try {
      return await apiCall();
    } catch (error) {
      // Categorize error based on response
      const errorType = this.categorizeError(error);
      const severity = this.determineSeverity(error, errorType);
      
      const appError = new AppError(
        this.getErrorMessage(error),
        errorType,
        severity,
        {
          component: context.component,
          action: context.action,
          userId: context.userId,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent
        },
        error as Error
      );
      
      throw appError;
    }
  }

  /**
   * Categorize error based on response properties
   */
  private static categorizeError(error: any): ErrorType {
    if (!error) return ErrorType.UNKNOWN;
    
    // Network errors
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      return ErrorType.NETWORK;
    }
    
    // HTTP status based categorization
    if (error.response?.status) {
      const status = error.response.status;
      
      if (status === 401) return ErrorType.AUTHENTICATION;
      if (status === 403) return ErrorType.AUTHORIZATION;
      if (status >= 400 && status < 500) return ErrorType.CLIENT;
      if (status >= 500) return ErrorType.SERVER;
    }
    
    // Validation errors
    if (error.response?.data?.error?.includes('validation') || 
        error.response?.data?.error?.includes('required')) {
      return ErrorType.VALIDATION;
    }
    
    return ErrorType.UNKNOWN;
  }

  /**
   * Determine error severity based on type and context
   */
  private static determineSeverity(error: any, type: ErrorType): ErrorSeverity {
    switch (type) {
      case ErrorType.AUTHENTICATION:
      case ErrorType.AUTHORIZATION:
        return ErrorSeverity.HIGH;
      case ErrorType.NETWORK:
      case ErrorType.SERVER:
        return ErrorSeverity.MEDIUM;
      case ErrorType.VALIDATION:
        return ErrorSeverity.LOW;
      case ErrorType.CLIENT:
        return ErrorSeverity.MEDIUM;
      default:
        return ErrorSeverity.MEDIUM;
    }
  }

  /**
   * Extract user-friendly error message
   */
  private static getErrorMessage(error: any): string {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    
    if (error.message) {
      return error.message;
    }
    
    return 'Beklenmeyen bir hata oluştu';
  }
}

// Hook for using error handling in components
export function useApiErrorHandler() {
  return {
    wrapApiCall: ErrorHandlerWrapper.wrapApiCall
  };
}
