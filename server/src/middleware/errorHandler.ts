import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorContext, ErrorSeverity, ErrorType } from '../utils/AppError';
import logger from '../utils/logger';

/**
 * Global error handler middleware
 * Handles all errors in the application
 */
export const globalErrorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // If response was already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }

  let appError: AppError;

  // Convert regular Error to AppError if needed
  if (error instanceof AppError) {
    appError = error;
  } else {
    // Convert unknown errors to AppError. JSON parsing errors from
    // body-parser surface as SyntaxError with a 400 status field.
    const statusCode = error instanceof SyntaxError && (error as any).status === 400 ? 400 : 500;
    appError = new AppError(
      error.message || 'An unexpected error occurred',
      statusCode,
      false,
      req.path,
      req.method,
      (req as any).user?.userId,
    );
  }

  // Build error context for logging
  const errorContextData: ErrorContext = {
    userId: (req as unknown as { user?: { userId?: string } }).user?.userId,
    requestId: (req as unknown as { requestId?: string }).requestId,
    sessionId: (req as unknown as { sessionId?: string }).sessionId,
    userAgent: req.get('User-Agent') || '',
    ip: req.ip || req.connection.remoteAddress || '',
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    headers: req.headers as Record<string, string>,
    severity: getErrorSeverity(appError.statusCode),
    type: getErrorType(appError.statusCode),
    additionalData: {
      originalError: error.name,
      stack: error.stack,
    },
  };

  // Log the error
  logError(appError, errorContextData);

  // Send error response
  sendErrorResponse(res, appError, req);
};

/**
 * Determine error severity based on status code
 */
function getErrorSeverity(statusCode: number): ErrorSeverity {
  if (statusCode >= 500) return ErrorSeverity.HIGH;
  if (statusCode >= 400) return ErrorSeverity.MEDIUM;
  return ErrorSeverity.LOW;
}

/**
 * Determine error type based on status code
 */
function getErrorType(statusCode: number): ErrorType {
  switch (statusCode) {
    case 400:
      return ErrorType.VALIDATION;
    case 401:
      return ErrorType.AUTHENTICATION;
    case 403:
      return ErrorType.AUTHORIZATION;
    case 404:
      return ErrorType.NOT_FOUND;
    case 409:
      return ErrorType.CONFLICT;
    case 429:
      return ErrorType.RATE_LIMIT;
    case 500:
      return ErrorType.INTERNAL;
    case 503:
      return ErrorType.SERVICE_UNAVAILABLE;
    default:
      return ErrorType.INTERNAL;
  }
}

/**
 * Log error with appropriate level
 */
function logError(appError: AppError, context: ErrorContext): void {
  const logData = {
    error: appError.toJSON(),
    context,
    timestamp: new Date().toISOString(),
  };

  if (appError.statusCode >= 500) {
    logger.error('Server Error', logData);
  } else if (appError.statusCode >= 400) {
    logger.warn('Client Error', logData);
  } else {
    logger.info('Application Error', logData);
  }
}

/**
 * Send error response to client
 */
function sendErrorResponse(res: Response, appError: AppError, req: Request): void {
  // B-M5: stack traces must NEVER leak in production, even if a misbuilt
  // image somehow carries NODE_ENV=development. Require both NODE_ENV to be
  // exactly 'development' AND an explicit EXPOSE_ERROR_DETAILS=true flag.
  const isDevelopment =
    process.env.NODE_ENV === 'development' && process.env.EXPOSE_ERROR_DETAILS === 'true';

  // Prepare response data
  const responseData: any = {
    success: false,
    error: {
      message: appError.message,
      statusCode: appError.statusCode,
      timestamp: appError.timestamp,
    },
  };

  // Add additional details in development (gated)
  if (isDevelopment && responseData.error) {
    const errObj = responseData.error as Record<string, any>;
    responseData.error = {
      ...errObj,
      name: appError.name,
      stack: appError.stack,
      path: appError.path,
      method: appError.method,
    };
  }

  // Add request ID if available
  if ((req as any).requestId) {
    responseData.requestId = (req as any).requestId;
  }

  // Send response
  res.status(appError.statusCode).json(responseData);
}

/**
 * Handle unhandled promise rejections
 */
export const handleUnhandledRejection = (reason: unknown, promise: Promise<unknown>): void => {
  logger.error('Unhandled Promise Rejection', {
    reason,
    promise,
    timestamp: new Date().toISOString(),
  });

  // In production, you might want to exit the process
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
};

/**
 * Handle uncaught exceptions
 */
export const handleUncaughtException = (error: Error): void => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });

  // In production, you might want to exit the process
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Validation error handler
 */
export const handleValidationError = (error: any): AppError => {
  const errors = Object.values(error.errors).map((err: any) => err.message);
  const message = `Validation Error: ${errors.join(', ')}`;
  return AppError.validation(message);
};

/**
 * JWT error handler
 */
export const handleJWTError = (): AppError => {
  return AppError.unauthorized('Invalid token. Please log in again.');
};

/**
 * JWT expired error handler
 */
export const handleJWTExpiredError = (): AppError => {
  return AppError.unauthorized('Your token has expired. Please log in again.');
};

/**
 * MongoDB duplicate key error handler
 */
export const handleDuplicateKeyError = (error: any): AppError => {
  const field = Object.keys(error.keyValue)[0];
  const value = error.keyValue[field];
  const message = `${field} '${value}' already exists`;
  return AppError.conflict(message);
};

/**
 * MongoDB cast error handler
 */
export const handleCastError = (error: any): AppError => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return AppError.validation(message);
};
