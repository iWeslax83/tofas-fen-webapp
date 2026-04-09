import { Request, Response, NextFunction } from 'express';
import Redis, { RedisOptions } from 'ioredis';
import logger from '../utils/logger';

/**
 * Build a user-segmented cache key. ALL cache writers must use this helper
 * (or produce keys with the same `cache:<user>:<role>:<url>:<query>` shape)
 * so that per-user segmentation is consistent and invalidateCache('cache:*')
 * patterns don't leak across users.
 */
export function buildCacheKey(parts: {
  userId: string;
  role: string;
  url: string;
  query?: Record<string, unknown>;
}): string {
  const query = parts.query ? JSON.stringify(parts.query) : '';
  return `cache:${parts.userId}:${parts.role}:${parts.url}:${query}`;
}

// Node system error interface for Redis error handling
interface NodeSystemError extends Error {
  code?: string;
  syscall?: string;
  address?: string;
  port?: number;
}

// Redis stub type for dev mode (no-op implementation)
interface RedisStub {
  get: (key: string) => Promise<string | null>;
  setex: (key: string, ttl: number, val: string) => Promise<undefined>;
  keys: (pattern: string) => Promise<string[]>;
  del: (...keys: string[]) => Promise<number>;
  info: (section?: string) => Promise<string>;
  dbsize: () => Promise<number>;
  quit: () => Promise<string>;
  on: (event: string, cb: (...args: unknown[]) => void) => undefined;
  mget: (keys: string[]) => Promise<(string | null)[]>;
  mset: (keyValues: Record<string, string>) => Promise<undefined>;
  ping: () => Promise<string>;
  expire: (key: string, seconds: number) => Promise<number>;
  pipeline: () => {
    get: () => { exec: () => Promise<unknown[]> };
    setex: (key: string, ttl: number, value: string) => { exec: () => Promise<unknown[]> };
    del: (key: string) => { exec: () => Promise<unknown[]> };
    exec: () => Promise<unknown[]>;
  };
  options: { host?: string; port?: number; db?: number };
}

// Enhanced Redis client configuration for production performance
const redisConfig: RedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  showFriendlyErrorStack: process.env.NODE_ENV === 'development',
  // Connection pool settings
  lazyConnect: true,
  // Performance optimizations
  keepAlive: 30000,
  family: 4, // IPv4
  // Cluster support
  enableOfflineQueue: false,
  // Memory optimization
  connectTimeout: 10000,
  // TLS support for production
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  // Sentinel support
  sentinels: process.env.REDIS_SENTINELS ? JSON.parse(process.env.REDIS_SENTINELS) : undefined,
  name: process.env.REDIS_SENTINEL_NAME || 'mymaster',
};

// Prefer REDIS_URL if provided, otherwise fall back to host/port
const redisUrl = process.env.REDIS_URL;

// Determine if Redis should be enabled
const isRedisConfigured =
  Boolean(redisUrl || process.env.REDIS_HOST || process.env.REDIS_PORT) &&
  process.env.NODE_ENV === 'production';

// Create Redis instance or a no-op stub in dev when not configured
const redis: Redis | RedisStub = isRedisConfigured
  ? redisUrl
    ? new Redis(redisUrl, redisConfig)
    : new Redis(redisConfig)
  : {
      get: async (_key: string) => null,
      setex: async (_key: string, _ttl: number, _val: string) => undefined,
      keys: async (_pattern: string) => [] as string[],
      del: async (..._keys: string[]) => 0,
      info: async () => '',
      dbsize: async () => 0,
      on: (_event: string, _cb: (...args: unknown[]) => void) => undefined,
      ping: async () => 'PONG',
      expire: async (_key: string, _seconds: number) => 0,
      // Enhanced methods for performance
      mget: async (_keys: string[]) => [],
      mset: async (_keyValues: Record<string, string>) => undefined,
      pipeline: () => ({
        get: () => ({ exec: async () => [] }),
        setex: (_key: string, _ttl: number, _value: string) => ({ exec: async () => [] }),
        del: (_key: string) => ({ exec: async () => [] }),
        exec: async () => [],
      }),
      quit: async () => 'OK',
      options: {},
    };

if (!isRedisConfigured) {
  logger.info(
    'Redis caching disabled in development mode. Set NODE_ENV=production and REDIS_URL to enable caching.',
  );
}

// Enhanced Redis event handling
if (isRedisConfigured) {
  redis.on('error', (err: Error) => {
    const sysErr = err as NodeSystemError;
    logger.error('Redis connection error', {
      error: err instanceof Error ? err.message : err,
      code: sysErr.code,
      syscall: sysErr.syscall,
      address: sysErr.address,
      port: sysErr.port,
    });
  });

  redis.on('connect', () => {
    const opts = 'options' in redis ? redis.options : {};
    logger.info('Redis connected successfully', {
      host: (opts as Record<string, unknown>).host || 'unknown',
      port: (opts as Record<string, unknown>).port || 'unknown',
      database: (opts as Record<string, unknown>).db || 0,
    });
  });

  redis.on('ready', () => {
    logger.info('Redis ready for operations');
  });

  redis.on('close', () => {
    logger.info('Redis connection closed');
  });

  redis.on('reconnecting', (delay: number) => {
    logger.info('Redis reconnecting', { delayMs: delay });
  });

  redis.on('end', () => {
    logger.info('Redis connection ended');
  });
}

// Enhanced cache middleware with performance optimizations
export const cache = (duration: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip caching for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Skip caching for authenticated requests if configured
      if (process.env.CACHE_SKIP_AUTH === 'true' && req.user) {
        return next();
      }

      // B-M7: segment cache key by user identity and role. Use the exported
      // buildCacheKey helper so any other writer in the tree produces a
      // compatible shape and invalidateCache() patterns stay consistent.
      const cacheKey = buildCacheKey({
        userId: req.user?.userId ?? 'anon',
        role: req.user?.role ?? 'anon',
        url: req.originalUrl,
        query: req.query as Record<string, unknown>,
      });

      // Try to get from cache
      const cachedData = await redis.get(cacheKey);

      if (cachedData) {
        // Cache hit - return cached data
        const parsedData = JSON.parse(cachedData);

        // Add cache headers
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        res.set('X-Cache-TTL', duration.toString());

        return res.json(parsedData);
      }

      // Cache miss - add cache headers and continue
      res.set('X-Cache', 'MISS');
      res.set('X-Cache-Key', cacheKey);
      res.set('X-Cache-TTL', duration.toString());

      // Override response.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = function (data: unknown) {
        // Cache the response data
        redis
          .setex(cacheKey, duration, JSON.stringify(data))
          .catch((err: unknown) =>
            logger.error('Cache set error', { error: err instanceof Error ? err.message : err }),
          );

        // Call original method
        return originalJson(data);
      };

      next();
    } catch (error: unknown) {
      logger.error('Cache middleware error', {
        error: error instanceof Error ? error.message : error,
      });
      next(); // Continue without caching on error
    }
  };
};

// Enhanced cache invalidation with pattern matching
export const invalidateCache = async (pattern: string) => {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      // Use pipeline for better performance
      const pipeline = redis.pipeline();
      keys.forEach((key: string) => pipeline.del(key));
      await pipeline.exec();

      logger.info('Cache invalidated', { pattern, keysCount: keys.length });
      return keys.length;
    }
    return 0;
  } catch (error: unknown) {
    logger.error('Cache invalidation error', {
      error: error instanceof Error ? (error as Error).message : error,
    });
    return 0;
  }
};

// Enhanced session cache with TTL
export const sessionCache = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const sessionId = req.sessionID;

    if (!sessionId) {
      next();
      return;
    }

    const cacheKey = `session:${sessionId}`;
    const cachedSession = await redis.get(cacheKey);

    if (cachedSession) {
      // Extend session TTL
      await redis.expire(cacheKey, 3600); // 1 hour
    }

    next();
  } catch (error: unknown) {
    logger.error('Session cache error', {
      error: error instanceof Error ? (error as Error).message : error,
    });
    next();
  }
};

// Enhanced cache helpers with performance optimizations
export const cacheHelpers = {
  // Get multiple keys efficiently
  async mget(keys: string[]) {
    try {
      return await redis.mget(keys);
    } catch (error: unknown) {
      logger.error('Cache mget error', {
        error: error instanceof Error ? (error as Error).message : error,
      });
      return keys.map(() => null);
    }
  },

  // Set multiple key-value pairs efficiently
  async mset(keyValues: Record<string, string>, ttl?: number) {
    try {
      if (ttl) {
        const pipeline = redis.pipeline();
        Object.entries(keyValues).forEach(([key, value]) => {
          pipeline.setex(key, ttl, value);
        });
        await pipeline.exec();
      } else {
        await redis.mset(keyValues);
      }
      return true;
    } catch (error: unknown) {
      logger.error('Cache mset error', {
        error: error instanceof Error ? (error as Error).message : error,
      });
      return false;
    }
  },

  // User cache management
  async setUser(userId: string, userData: Record<string, unknown>, duration: number = 3600) {
    try {
      const userKey = `user:${userId}`;
      const userProfileKey = `user:${userId}:profile`;

      const pipeline = redis.pipeline();

      // Cache user profile (without sensitive data)
      const { sifre: _sifre, ...profileData } = userData;
      pipeline.setex(userProfileKey, duration, JSON.stringify(profileData));

      // Set user key with TTL
      pipeline.setex(userKey, duration, '1');

      await pipeline.exec();

      logger.info('User cached', { userId, durationSeconds: duration });
      return true;
    } catch (error: unknown) {
      logger.error('Set user cache error', {
        error: error instanceof Error ? (error as Error).message : error,
      });
      return false;
    }
  },

  // User cache invalidation
  async invalidateUser(userId: string) {
    try {
      const patterns = [`user:${userId}`, `user:${userId}:*`, `user:${userId}:profile`];

      let totalInvalidated = 0;
      for (const pattern of patterns) {
        totalInvalidated += await invalidateCache(pattern);
      }

      logger.info('User cache invalidated', { userId, keysCount: totalInvalidated });
      return totalInvalidated;
    } catch (error: unknown) {
      logger.error('Invalidate user cache error', {
        error: error instanceof Error ? (error as Error).message : error,
      });
      return 0;
    }
  },

  // Bulk cache operations
  async bulkSet(operations: Array<{ key: string; value: unknown; ttl: number }>) {
    try {
      const pipeline = redis.pipeline();

      operations.forEach(({ key, value, ttl }) => {
        pipeline.setex(key, ttl, JSON.stringify(value));
      });

      await pipeline.exec();

      logger.info('Bulk cached items', { count: operations.length });
      return true;
    } catch (error: unknown) {
      logger.error('Bulk cache set error', {
        error: error instanceof Error ? (error as Error).message : error,
      });
      return false;
    }
  },

  // Cache statistics
  async getStats() {
    try {
      const info = await redis.info();
      const dbsize = await redis.dbsize();

      return {
        dbsize,
        info: info.split('\r\n').reduce<Record<string, string>>((acc, line) => {
          const [key, value] = line.split(':');
          if (key && value) {
            acc[key] = value;
          }
          return acc;
        }, {}),
      };
    } catch (error: unknown) {
      logger.error('Get cache stats error', {
        error: error instanceof Error ? (error as Error).message : error,
      });
      return null;
    }
  },
};

// Cache cleanup function
export const cleanupCache = async () => {
  try {
    // Get all cache keys
    const keys = await redis.keys('cache:*');

    if (keys.length > 0) {
      // Delete expired cache keys
      const pipeline = redis.pipeline();
      keys.forEach((key: string) => pipeline.del(key));
      await pipeline.exec();

      logger.info('Cleaned up cache keys', { count: keys.length });
      return keys.length;
    }

    return 0;
  } catch (error: unknown) {
    logger.error('Cache cleanup error', {
      error: error instanceof Error ? (error as Error).message : error,
    });
    return 0;
  }
};

// Cache health check
export const checkCacheHealth = async () => {
  try {
    const startTime = Date.now();

    // Ping Redis
    await redis.ping();

    const responseTime = Date.now() - startTime;

    return {
      status: 'healthy',
      responseTime,
      dbsize: await redis.dbsize(),
      info: await redis.info('memory'),
    };
  } catch (error: unknown) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

// Export all cache functions
export { redis, isRedisConfigured };
