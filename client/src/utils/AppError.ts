/**
 * Frontend Application Error Class
 * Provides structured error handling for client-side errors
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly isOperational: boolean;
  public readonly timestamp: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode?: number,
    isOperational: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode ?? undefined;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    this.context = context ?? undefined;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Create a network error
   */
  static network(message: string = 'Network error occurred', context?: Record<string, unknown>): AppError {
    return new AppError(message, 'NETWORK_ERROR', undefined, true, context);
  }

  /**
   * Create a validation error
   */
  static validation(message: string, context?: Record<string, unknown>): AppError {
    return new AppError(message, 'VALIDATION_ERROR', 400, true, context);
  }

  /**
   * Create an authentication error
   */
  static unauthorized(message: string = 'Unauthorized access', context?: Record<string, unknown>): AppError {
    return new AppError(message, 'UNAUTHORIZED_ERROR', 401, true, context);
  }

  /**
   * Create an authorization error
   */
  static forbidden(message: string = 'Access forbidden', context?: Record<string, unknown>): AppError {
    return new AppError(message, 'FORBIDDEN_ERROR', 403, true, context);
  }

  /**
   * Create a not found error
   */
  static notFound(message: string = 'Resource not found', context?: Record<string, unknown>): AppError {
    return new AppError(message, 'NOT_FOUND_ERROR', 404, true, context);
  }

  /**
   * Create a timeout error
   */
  static timeout(message: string = 'Request timeout', context?: Record<string, unknown>): AppError {
    return new AppError(message, 'TIMEOUT_ERROR', 408, true, context);
  }

  /**
   * Create a rate limit error
   */
  static rateLimit(message: string = 'Too many requests', context?: Record<string, unknown>): AppError {
    return new AppError(message, 'RATE_LIMIT_ERROR', 429, true, context);
  }

  /**
   * Create a server error
   */
  static server(message: string = 'Server error occurred', context?: Record<string, unknown>): AppError {
    return new AppError(message, 'SERVER_ERROR', 500, true, context);
  }

  /**
   * Create a parsing error
   */
  static parsing(message: string = 'Failed to parse response', context?: Record<string, unknown>): AppError {
    return new AppError(message, 'PARSING_ERROR', undefined, true, context);
  }

  /**
   * Create a storage error
   */
  static storage(message: string = 'Storage operation failed', context?: Record<string, unknown>): AppError {
    return new AppError(message, 'STORAGE_ERROR', undefined, true, context);
  }

  /**
   * Convert error to user-friendly message
   */
  getUserMessage(): string {
    switch (this.code) {
      case 'NETWORK_ERROR':
        return 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.';
      case 'VALIDATION_ERROR':
        return this.message;
      case 'UNAUTHORIZED_ERROR':
        return 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.';
      case 'FORBIDDEN_ERROR':
        return 'Bu işlemi yapmaya yetkiniz yok.';
      case 'NOT_FOUND_ERROR':
        return 'Aradığınız kaynak bulunamadı.';
      case 'TIMEOUT_ERROR':
        return 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.';
      case 'RATE_LIMIT_ERROR':
        return 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.';
      case 'SERVER_ERROR':
        return 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.';
      case 'PARSING_ERROR':
        return 'Veri işleme hatası oluştu.';
      case 'STORAGE_ERROR':
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
      code: this.code,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
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
