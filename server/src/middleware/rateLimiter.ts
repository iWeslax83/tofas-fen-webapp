import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
// import { tokenBlacklist } from '../utils/tokenBlacklist'; // Unused import removed

/**
 * Enhanced Rate Limiter with user-specific limits
 */
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: options.message || 'Too many requests',
      retryAfter: Math.ceil(options.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    keyGenerator: options.keyGenerator || ((req: Request) => {
      // Use user ID if authenticated, otherwise IP
      return (req as any).user?.userId || req.ip || 'anonymous';
    }),
    skip: options.skip || ((req: Request) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/status';
    }),
    handler: async (req: Request, res: Response) => {
      // Log rate limit violation
      console.warn('Rate limit exceeded', {
        ip: req.ip,
        userId: (req as any).user?.userId,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent')
      });

      res.status(429).json({
        error: 'Rate limit exceeded',
        message: options.message || 'Too many requests',
        retryAfter: Math.ceil(options.windowMs / 1000),
        limit: options.max,
        windowMs: options.windowMs,
        timestamp: new Date().toISOString()
      });
    }
  });
};

/**
 * General API rate limiter
 */
export const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.'
});

/**
 * Authentication rate limiter (stricter)
 */
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  message: 'Çok fazla giriş denemesi. Lütfen daha sonra tekrar deneyin.',
  skipSuccessfulRequests: true
});

/**
 * Upload rate limiter
 */
export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: 'Çok fazla dosya yükleme denemesi. Lütfen daha sonra tekrar deneyin.'
});

/**
 * Read-only endpoints rate limiter (more lenient)
 */
export const readOnlyLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 200, // 200 requests per 5 minutes
  message: 'Çok fazla okuma isteği gönderildi. Lütfen biraz bekleyin.'
});

/**
 * User-specific rate limiter
 */
export const userSpecificLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per 15 minutes per user
  message: 'Hesabınız için çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.',
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return req.ip || 'anonymous';
    }
    return `user:${userId}`;
  }
});

/**
 * IP-based rate limiter for unauthenticated requests
 */
export const ipLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes per IP
  message: 'IP adresinizden çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.',
  keyGenerator: (req: Request) => req.ip || 'unknown'
});

/**
 * Dynamic rate limiter based on user role
 */
export const roleBasedLimiter = (req: Request, res: Response, next: any) => {
  const user = (req as any).user;

  if (!user) {
    return ipLimiter(req, res, next);
  }

  // Different limits based on user role
  let maxRequests: number;
  const windowMs = 15 * 60 * 1000; // 15 minutes

  switch (user.role) {
    case 'admin':
      maxRequests = 1000; // Admins get higher limits
      break;
    case 'teacher':
      maxRequests = 200;
      break;
    case 'student':
      maxRequests = 100;
      break;
    case 'parent':
      maxRequests = 50;
      break;
    case 'hizmetli':
      maxRequests = 150;
      break;
    default:
      maxRequests = 50;
  }

  const limiter = createRateLimiter({
    windowMs,
    max: maxRequests,
    message: `Rolünüz için çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.`,
    keyGenerator: (_req: Request) => `role:${user.role}:${user.userId}`
  });

  return limiter(req, res, next as any);
};

/**
 * Adaptive rate limiter that adjusts based on server load
 */
export const adaptiveLimiter = (req: Request, res: Response, next: (err?: unknown) => void) => {
  // This would integrate with monitoring service to adjust limits
  // based on server CPU, memory, and response times

  const baseLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Sunucu yükü nedeniyle istek limiti düşürüldü. Lütfen daha sonra tekrar deneyin.'
  });

  return baseLimiter(req, res, next as any);
};

/**
 * Rate limiter for specific endpoints
 */
export const endpointSpecificLimiter = (endpoint: string, maxRequests: number) => {
  return createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: maxRequests,
    message: `${endpoint} endpoint'i için çok fazla istek gönderildi.`,
    keyGenerator: (req: Request) => {
      const userId = (req as any).user?.userId;
      return userId ? `endpoint:${endpoint}:user:${userId}` : `endpoint:${endpoint}:ip:${req.ip}`;
    }
  });
};
