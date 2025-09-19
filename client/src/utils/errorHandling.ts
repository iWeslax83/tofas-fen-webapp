import { toast } from 'react-hot-toast';
import { Analytics } from './monitoring';

// Error Types
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Error Categories
export interface ErrorCategory {
  type: ErrorType;
  severity: ErrorSeverity;
  userMessage: string;
  recoveryAction?: string;
  shouldRetry: boolean;
  maxRetries: number;
  retryDelay: number;
}

// Error Context
export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  timestamp: number;
  url?: string;
  userAgent?: string;
}

// Enhanced Error Class
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly originalError?: Error;
  public readonly retryCount: number;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: Partial<ErrorContext> = {},
    originalError?: Error,
    retryCount: number = 0
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.context = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...context
    };
    this.originalError = originalError;
    this.retryCount = retryCount;
  }
}

// Error Categories Configuration
const ERROR_CATEGORIES: Record<ErrorType, ErrorCategory> = {
  [ErrorType.NETWORK]: {
    type: ErrorType.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    userMessage: 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.',
    recoveryAction: 'Ağ bağlantısını kontrol edin',
    shouldRetry: true,
    maxRetries: 3,
    retryDelay: 2000
  },
  [ErrorType.AUTHENTICATION]: {
    type: ErrorType.AUTHENTICATION,
    severity: ErrorSeverity.HIGH,
    userMessage: 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
    recoveryAction: 'Tekrar giriş yapın',
    shouldRetry: false,
    maxRetries: 0,
    retryDelay: 0
  },
  [ErrorType.AUTHORIZATION]: {
    type: ErrorType.AUTHORIZATION,
    severity: ErrorSeverity.HIGH,
    userMessage: 'Bu işlemi gerçekleştirmek için yetkiniz bulunmuyor.',
    recoveryAction: 'Yöneticinizle iletişime geçin',
    shouldRetry: false,
    maxRetries: 0,
    retryDelay: 0
  },
  [ErrorType.VALIDATION]: {
    type: ErrorType.VALIDATION,
    severity: ErrorSeverity.LOW,
    userMessage: 'Lütfen girdiğiniz bilgileri kontrol edin.',
    recoveryAction: 'Form bilgilerini düzeltin',
    shouldRetry: false,
    maxRetries: 0,
    retryDelay: 0
  },
  [ErrorType.SERVER]: {
    type: ErrorType.SERVER,
    severity: ErrorSeverity.HIGH,
    userMessage: 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.',
    recoveryAction: 'Birkaç dakika sonra tekrar deneyin',
    shouldRetry: true,
    maxRetries: 2,
    retryDelay: 5000
  },
  [ErrorType.CLIENT]: {
    type: ErrorType.CLIENT,
    severity: ErrorSeverity.MEDIUM,
    userMessage: 'Bir hata oluştu. Sayfayı yenilemeyi deneyin.',
    recoveryAction: 'Sayfayı yenileyin',
    shouldRetry: true,
    maxRetries: 1,
    retryDelay: 1000
  },
  [ErrorType.UNKNOWN]: {
    type: ErrorType.UNKNOWN,
    severity: ErrorSeverity.MEDIUM,
    userMessage: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
    recoveryAction: 'Tekrar deneyin',
    shouldRetry: true,
    maxRetries: 1,
    retryDelay: 3000
  }
};

// Error Handler Class
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorQueue: AppError[] = [];
  private isProcessing = false;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Categorize error based on type and context
  public categorizeError(error: unknown, context?: Partial<ErrorContext>): AppError {
    let type = ErrorType.UNKNOWN;
    let message = 'Beklenmeyen bir hata oluştu';

    // Network errors
    if ((error as any).code === 'NETWORK_ERROR' || (error as any).message?.includes('Network Error')) {
      type = ErrorType.NETWORK;
      message = 'İnternet bağlantısı hatası';
    }
    // HTTP status based categorization
    else if ((error as any).response?.status) {
      const status = (error as any).response.status;
      
      switch (status) {
        case 401:
          type = ErrorType.AUTHENTICATION;
          message = (error as any).response.data?.message || 'Kimlik doğrulama hatası';
          break;
        case 403:
          type = ErrorType.AUTHORIZATION;
          message = (error as any).response.data?.message || 'Yetki hatası';
          break;
        case 400:
          type = ErrorType.VALIDATION;
          message = (error as any).response.data?.message || 'Geçersiz istek';
          break;
        case 404:
          type = ErrorType.CLIENT;
          message = (error as any).response.data?.message || 'Kaynak bulunamadı';
          break;
        case 500:
        case 502:
        case 503:
          type = ErrorType.SERVER;
          message = (error as any).response.data?.message || 'Sunucu hatası';
          break;
        default:
          type = ErrorType.UNKNOWN;
          message = (error as any).response.data?.message || 'Bir hata oluştu';
      }
    }
    // Validation errors
    else if ((error as any).name === 'ValidationError' || (error as any).message?.includes('validation')) {
      type = ErrorType.VALIDATION;
      message = (error as any).message || 'Doğrulama hatası';
    }
    // Client-side errors
    else if ((error as any).name === 'TypeError' || (error as any).name === 'ReferenceError') {
      type = ErrorType.CLIENT;
      message = (error as any).message || 'İstemci hatası';
    }

    const category = ERROR_CATEGORIES[type];
    return new AppError(
      message,
      type,
      category.severity,
      context,
      error as Error
    );
  }

  // Handle error with user notification
  async handleError(error: unknown, context?: Partial<ErrorContext>): Promise<void> {
    const appError = this.categorizeError(error, context);
    
    // Add to queue for processing
    this.errorQueue.push(appError);
    
    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processErrorQueue();
    }

    // Show user notification
    this.showUserNotification(appError);
    
    // Track error analytics
    this.trackError(appError);
  }

  // Process error queue
  private async processErrorQueue(): Promise<void> {
    if (this.isProcessing || this.errorQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.errorQueue.length > 0) {
      const error = this.errorQueue.shift();
      if (error) {
        await this.processError(error);
      }
    }
    
    this.isProcessing = false;
  }

  // Process individual error
  private async processError(error: AppError): Promise<void> {
    const category = ERROR_CATEGORIES[error.type];
    
    // Handle authentication errors
    if (error.type === ErrorType.AUTHENTICATION) {
      // Redirect to login
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    }
    
    // Handle critical errors
    if (error.severity === ErrorSeverity.CRITICAL) {
      // Log critical error and potentially show modal
      // Critical error logged to monitoring service
    }
  }

  // Show user-friendly notification
  private showUserNotification(error: AppError): void {
    const category = ERROR_CATEGORIES[error.type];
    
    // Don't show toast for low severity errors
    if (error.severity === ErrorSeverity.LOW) {
      return;
    }

    const toastOptions = {
      duration: this.getToastDuration(error.severity),
      icon: this.getToastIcon(error.type),
      style: {
        background: this.getToastBackground(error.severity),
        color: '#fff',
        borderRadius: '8px',
        padding: '12px 16px',
        fontSize: '14px',
        fontWeight: '500'
      }
    };

    toast.error(category.userMessage, toastOptions);
  }

  // Get toast duration based on severity
  private getToastDuration(severity: ErrorSeverity): number {
    switch (severity) {
      case ErrorSeverity.LOW: return 3000;
      case ErrorSeverity.MEDIUM: return 5000;
      case ErrorSeverity.HIGH: return 7000;
      case ErrorSeverity.CRITICAL: return 10000;
      default: return 5000;
    }
  }

  // Get toast icon based on error type
  private getToastIcon(type: ErrorType): string {
    switch (type) {
      case ErrorType.NETWORK: return '🌐';
      case ErrorType.AUTHENTICATION: return '🔐';
      case ErrorType.AUTHORIZATION: return '🚫';
      case ErrorType.VALIDATION: return '⚠️';
      case ErrorType.SERVER: return '🖥️';
      case ErrorType.CLIENT: return '💻';
      default: return '❌';
    }
  }

  // Get toast background based on severity
  private getToastBackground(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.LOW: return '#f59e0b';
      case ErrorSeverity.MEDIUM: return '#dc2626';
      case ErrorSeverity.HIGH: return '#b91c1c';
      case ErrorSeverity.CRITICAL: return '#7f1d1d';
      default: return '#dc2626';
    }
  }

  // Track error for analytics
  private trackError(error: AppError): void {
    const analytics = Analytics.getInstance();
    
    analytics.trackError(error, {
      type: error.type,
      severity: error.severity,
      retryCount: error.retryCount,
      ...error.context
    });
  }

  // Retry mechanism
  async retryOperation<T>(
    operation: () => Promise<T>,
    context?: Partial<ErrorContext>,
    maxRetries?: number
  ): Promise<T> {
    let lastError: AppError;
    const retryCount = maxRetries || ERROR_CATEGORIES[ErrorType.UNKNOWN].maxRetries;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = this.categorizeError(error, {
          ...context
        });

        const category = ERROR_CATEGORIES[lastError.type];
        
        // Don't retry if error type doesn't support retry
        if (!category.shouldRetry || attempt >= category.maxRetries) {
          throw lastError;
        }

        // Wait before retry
        await this.delay(category.retryDelay);
        
        // Show retry notification
        if (attempt < retryCount) {
          toast.loading(`Tekrar deneniyor... (${attempt + 1}/${retryCount})`, {
            duration: category.retryDelay
          });
        }
      }
    }

    throw lastError!;
  }

  // Utility delay function
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get error recovery suggestion
  getRecoverySuggestion(error: AppError): string | null {
    const category = ERROR_CATEGORIES[error.type];
    return category.recoveryAction || null;
  }

  // Check if error should be retried
  shouldRetry(error: AppError): boolean {
    const category = ERROR_CATEGORIES[error.type];
    return category.shouldRetry && error.retryCount < category.maxRetries;
  }

  // Get error statistics
  getErrorStats(): { total: number; byType: Record<ErrorType, number>; bySeverity: Record<ErrorSeverity, number> } {
    const stats = {
      total: this.errorQueue.length,
      byType: {} as Record<ErrorType, number>,
      bySeverity: {} as Record<ErrorSeverity, number>
    };

    this.errorQueue.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
    });

    return stats;
  }

  // Clear error queue
  clearErrorQueue(): void {
    this.errorQueue = [];
  }
}

// Global error handler instance
export const errorHandler = ErrorHandler.getInstance();

// React Hook for error handling
export const useErrorHandler = () => {
  const handleError = (error: unknown, context?: Partial<ErrorContext>) => {
    return errorHandler.handleError(error, context);
  };

  const retryOperation = <T>(
    operation: () => Promise<T>,
    context?: Partial<ErrorContext>,
    maxRetries?: number
  ) => {
    return errorHandler.retryOperation(operation, context, maxRetries);
  };

  return {
    handleError,
    retryOperation,
    getRecoverySuggestion: (error: AppError) => errorHandler.getRecoverySuggestion(error),
    shouldRetry: (error: AppError) => errorHandler.shouldRetry(error)
  };
};

// Error boundary hook
export const useErrorBoundary = () => {
  const [error, setError] = useState<AppError | null>(null);

  const handleError = useCallback((error: unknown, context?: Partial<ErrorContext>) => {
    const appError = errorHandler.categorizeError(error, context);
    setError(appError);
    errorHandler.handleError(error, context);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError
  };
};

// Import React hooks
import { useState, useCallback } from 'react';
