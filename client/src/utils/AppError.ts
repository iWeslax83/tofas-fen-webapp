/**
 * Frontend Application Error Class
 * Provides structured error handling for client-side errors
 */
export class AppError extends Error {
  public readonly type: string;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly originalError: Error | undefined;
  public readonly timestamp: string;

  constructor(
    message: string,
    type: string = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: Partial<ErrorContext> = {},
    originalError?: Error
  ) {
    super(message);

    this.name = this.constructor.name;
    this.type = type;
    this.severity = severity;
    this.context = {
      timestamp: Date.now(),
      ...context
    } as ErrorContext;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Create a network error
   */
  static network(message: string = 'Network error occurred', context?: Partial<ErrorContext>): AppError {
    return new AppError(message, ErrorType.NETWORK, ErrorSeverity.MEDIUM, context);
  }

  /**
   * Create a validation error
   */
  static validation(message: string, context?: Partial<ErrorContext>): AppError {
    return new AppError(message, ErrorType.VALIDATION, ErrorSeverity.LOW, context);
  }

  /**
   * Create an authentication error
   */
  static unauthorized(message: string = 'Unauthorized access', context?: Partial<ErrorContext>): AppError {
    return new AppError(message, ErrorType.AUTHENTICATION, ErrorSeverity.HIGH, context);
  }

  /**
   * Create an authorization error
   */
  static forbidden(message: string = 'Access forbidden', context?: Partial<ErrorContext>): AppError {
    return new AppError(message, ErrorType.AUTHORIZATION, ErrorSeverity.HIGH, context);
  }

  /**
   * Create a not found error
   */
  static notFound(message: string = 'Resource not found', context?: Partial<ErrorContext>): AppError {
    return new AppError(message, ErrorType.NOT_FOUND, ErrorSeverity.MEDIUM, context);
  }

  /**
   * Create a timeout error
   */
  static timeout(message: string = 'Request timeout', context?: Partial<ErrorContext>): AppError {
    return new AppError(message, ErrorType.TIMEOUT, ErrorSeverity.MEDIUM, context);
  }

  /**
   * Create a rate limit error
   */
  static rateLimit(message: string = 'Too many requests', context?: Partial<ErrorContext>): AppError {
    return new AppError(message, ErrorType.RATE_LIMIT, ErrorSeverity.MEDIUM, context);
  }

  /**
   * Create a server error
   */
  static server(message: string = 'Server error occurred', context?: Partial<ErrorContext>): AppError {
    return new AppError(message, ErrorType.SERVER, ErrorSeverity.HIGH, context);
  }

  /**
   * Create a parsing error
   */
  static parsing(message: string = 'Failed to parse response', context?: Partial<ErrorContext>): AppError {
    return new AppError(message, ErrorType.PARSING, ErrorSeverity.MEDIUM, context);
  }

  /**
   * Create a storage error
   */
  static storage(message: string = 'Storage operation failed', context?: Partial<ErrorContext>): AppError {
    return new AppError(message, ErrorType.STORAGE, ErrorSeverity.HIGH, context);
  }

  /**
   * Convert error to user-friendly message
   */
  getUserMessage(): string {
    switch (this.type) {
      case ErrorType.NETWORK:
        return 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.';
      case ErrorType.VALIDATION:
        return this.message;
      case ErrorType.AUTHENTICATION:
        return 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.';
      case ErrorType.AUTHORIZATION:
        return 'Bu işlemi yapmaya yetkiniz yok.';
      case ErrorType.NOT_FOUND:
        return 'Aradığınız kaynak bulunamadı.';
      case ErrorType.TIMEOUT:
        return 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.';
      case ErrorType.RATE_LIMIT:
        return 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.';
      case ErrorType.SERVER:
        return 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.';
      case ErrorType.PARSING:
        return 'Veri işleme hatası oluştu.';
      case ErrorType.STORAGE:
        return 'Veri saklama hatası oluştu.';
      default:
        return this.message || 'Beklenmeyen bir hata oluştu.';
    }
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      timestamp: this.timestamp,
      context: this.context,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
    };
  }
}

/**
 * Error types for better categorization
 */
export enum ErrorType {
  NETWORK = 'NETWORK_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  TIMEOUT = 'TIMEOUT_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  SERVER = 'SERVER_ERROR',
  CLIENT = 'CLIENT_ERROR',
  PARSING = 'PARSING_ERROR',
  STORAGE = 'STORAGE_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error context interface
 */
export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  requestId?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  response?: unknown;
  additionalData?: Record<string, unknown>;
}
