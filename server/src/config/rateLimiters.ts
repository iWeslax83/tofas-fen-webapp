import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';
import express from 'express';
import logger from '../utils/logger';

/**
 * All rate limiter configurations - extracted from index.ts.
 */

const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 5 * 60 * 1000);
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 500);

export const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.',
    retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: express.Request, res: express.Response) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.',
      retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
      limit: RATE_LIMIT_MAX_REQUESTS,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
  },
});

export const readOnlyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 300,
  message: {
    error: 'Çok fazla okuma isteği gönderildi. Lütfen biraz bekleyin.',
    retryAfter: 300,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: express.Request, res: express.Response) => {
    res.status(429).json({
      error: 'Read rate limit exceeded',
      message: 'Çok fazla okuma isteği gönderildi. Lütfen biraz bekleyin.',
      retryAfter: 300,
      limit: 300,
      windowMs: 5 * 60 * 1000,
    });
  },
});

export const mealsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 500,
  message: {
    error: 'Çok fazla yemek listesi isteği gönderildi. Lütfen biraz bekleyin.',
    retryAfter: 300,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: express.Request, res: express.Response) => {
    res.status(429).json({
      error: 'Meals rate limit exceeded',
      message: 'Çok fazla yemek listesi isteği gönderildi. Lütfen biraz bekleyin.',
      retryAfter: 300,
      limit: 500,
      windowMs: 5 * 60 * 1000,
    });
  },
});

const AUTH_RATE_LIMIT_WINDOW_MS = Number(
  process.env.AUTH_RATE_LIMIT_WINDOW_MS || RATE_LIMIT_WINDOW_MS,
);
const AUTH_RATE_LIMIT_MAX = Number(
  process.env.NODE_ENV === 'production'
    ? process.env.AUTH_RATE_LIMIT_MAX || 5
    : process.env.AUTH_RATE_LIMIT_MAX || 100,
);

export const authLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX,
  skipSuccessfulRequests: true,
  message: {
    error: 'Çok fazla giriş denemesi. Lütfen biraz sonra tekrar deneyin.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const UPLOAD_RATE_LIMIT_WINDOW_MS = Number(
  process.env.UPLOAD_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000,
);
const UPLOAD_RATE_LIMIT_MAX = Number(process.env.UPLOAD_RATE_LIMIT_MAX || 10);

export const uploadLimiter = rateLimit({
  windowMs: UPLOAD_RATE_LIMIT_WINDOW_MS,
  max: UPLOAD_RATE_LIMIT_MAX,
  message: {
    error: 'Çok fazla dosya yükleme denemesi. Lütfen daha sonra tekrar deneyin.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const devLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 500,
  message: {
    error: 'Development rate limit exceeded',
    message: 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const devReadOnlyLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 500,
  message: {
    error: 'Development read rate limit exceeded',
    message: 'Çok fazla okuma isteği gönderildi. Lütfen biraz bekleyin.',
    retryAfter: 300,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

let redisStoreClient: ReturnType<typeof createClient> | null = null;

export function createRedisRateLimitStore(): RedisStore | undefined {
  try {
    const redisUrl =
      process.env.REDIS_URL ||
      `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`;
    if (!redisStoreClient) {
      redisStoreClient = createClient({ url: redisUrl });
      redisStoreClient.connect().catch(() => {
        logger.warn('Redis not available for rate limiting, using in-memory store');
        redisStoreClient = null;
      });
    }
    if (!redisStoreClient) return undefined;
    return new RedisStore({
      sendCommand: (...args: string[]) => (redisStoreClient as any).sendCommand(args),
    });
  } catch {
    logger.warn('Failed to create Redis rate limit store, using in-memory fallback');
    return undefined;
  }
}

export function createEndpointLimiter(opts: { windowMs: number; max: number; message: string }) {
  return rateLimit({
    windowMs: opts.windowMs,
    max: opts.max,
    message: { error: opts.message },
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisRateLimitStore() as any,
  });
}

/**
 * Apply rate limiters to the Express app.
 */
export function applyRateLimiters(app: express.Express): void {
  if (process.env.NODE_ENV === 'production') {
    app.use('/api', generalLimiter);
    app.use('/api/dormitory/meals', mealsLimiter);
    app.use('/api/announcements', readOnlyLimiter);
    app.use('/api/notes', readOnlyLimiter);
    app.use('/api/schedule', readOnlyLimiter);
  } else {
    app.use('/api', devLimiter);
    app.use('/api/dormitory/meals', devReadOnlyLimiter);
    app.use('/api/announcements', devReadOnlyLimiter);
    app.use('/api/notes', devReadOnlyLimiter);
    app.use('/api/schedule', devReadOnlyLimiter);
  }

  // Always apply auth and upload rate limiting
  app.use('/api/auth', authLimiter);
  app.use('/api/upload', uploadLimiter);
}
