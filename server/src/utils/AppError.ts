/**
 * Custom Application Error Class
 * Provides structured error handling with status codes and operational flags
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: string;
  public readonly path?: string;
  public readonly method?: string;
  public readonly userId?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    path?: string,
    method?: string,
    userId?: string
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    this.path = path || '';
    this.method = method || '';
    this.userId = userId || '';

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Create a validation error
   */
  static validation(message: string, path?: string, method?: string, userId?: string): AppError {
    return new AppError(message, 400, true, path, method, userId);
  }

  /**
   * Create an authentication error
   */
  static unauthorized(message: string = 'Unauthorized', path?: string, method?: string, userId?: string): AppError {
    return new AppError(message, 401, true, path, method, userId);
  }

  /**
   * Create an authorization error
   */
  static forbidden(message: string = 'Forbidden', path?: string, method?: string, userId?: string): AppError {
    return new AppError(message, 403, true, path, method, userId);
  }

  /**
   * Create a not found error
   */
  static notFound(message: string = 'Resource not found', path?: string, method?: string, userId?: string): AppError {
    return new AppError(message, 404, true, path, method, userId);
  }

  /**
   * Create a conflict error
   */
  static conflict(message: string, path?: string, method?: string, userId?: string): AppError {
    return new AppError(message, 409, true, path, method, userId);
  }

  /**
   * Create a rate limit error
   */
  static tooManyRequests(message: string = 'Too many requests', path?: string, method?: string, userId?: string): AppError {
    return new AppError(message, 429, true, path, method, userId);
  }

  /**
   * Create an internal server error
   */
  static internal(message: string = 'Internal server error', path?: string, method?: string, userId?: string): AppError {
    return new AppError(message, 500, true, path, method, userId);
  }

  /**
   * Create a service unavailable error
   */
  static serviceUnavailable(message: string = 'Service unavailable', path?: string, method?: string, userId?: string): AppError {
    return new AppError(message, 503, true, path, method, userId);
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      timestamp: this.timestamp,
      path: this.path,
      method: this.method,
      userId: this.userId,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
    };
  }
}

/**
 * Error types for better categorization
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  CONFLICT = 'CONFLICT_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE_ERROR',
  DATABASE = 'DATABASE_ERROR',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR'
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
 * Enhanced error interface for logging
 */
export interface ErrorContext {
  userId?: string;
  requestId?: string;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
  path?: string;
  method?: string;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  severity?: ErrorSeverity;
  type?: ErrorType;
  additionalData?: Record<string, unknown>;
}
