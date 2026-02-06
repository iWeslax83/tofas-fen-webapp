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

      const errorContext: Partial<import('./errorHandling').ErrorContext> = {
        component: context.component,
        action: context.action,
        url: window.location.href,
        additionalData: {
          userAgent: navigator.userAgent
        }
      };

      if (context.userId) {
        errorContext.userId = context.userId;
      }

      const appError = new AppError(
        this.getErrorMessage(error),
        errorType,
        severity,
        errorContext,
        error as Error
      );

      throw appError;
    }
  }

  /**
   * Categorize error based on response properties
   */
  private static categorizeError(error: unknown): ErrorType {
    if (!error) return ErrorType.UNKNOWN;

    // Network errors
    if (typeof error === 'object' && error !== null) {
      const err = error as Record<string, any>;
      if (err.code === 'NETWORK_ERROR' || err.message?.includes('Network Error')) {
        return ErrorType.NETWORK;
      }

      // HTTP status based categorization
      if (err.response?.status) {
        const status = err.response.status;

        if (status === 401) return ErrorType.AUTHENTICATION;
        if (status === 403) return ErrorType.AUTHORIZATION;
        if (status >= 400 && status < 500) return ErrorType.CLIENT;
        if (status >= 500) return ErrorType.SERVER;
      }

      // Validation errors
      if (err.response?.data?.error?.includes('validation') ||
        err.response?.data?.error?.includes('required')) {
        return ErrorType.VALIDATION;
      }
    }

    return ErrorType.UNKNOWN;
  }

  /**
   * Determine error severity based on type and context
   */
  private static determineSeverity(_error: unknown, type: ErrorType): ErrorSeverity {
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
  private static getErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error !== null) {
      const err = error as Record<string, any>;
      if (err.response?.data?.error) {
        return err.response.data.error;
      }

      if (err.response?.data?.message) {
        return err.response.data.message;
      }

      if (err.message) {
        return err.message;
      }
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
