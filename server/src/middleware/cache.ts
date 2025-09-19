import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

// Enhanced Redis client configuration for production performance
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
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
  maxLoadingTimeout: 10000,
  // TLS support for production
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  // Sentinel support
  sentinels: process.env.REDIS_SENTINELS ? JSON.parse(process.env.REDIS_SENTINELS) : undefined,
  name: process.env.REDIS_SENTINEL_NAME || 'mymaster'
};

// Prefer REDIS_URL if provided, otherwise fall back to host/port
const redisUrl = process.env.REDIS_URL;

// Determine if Redis should be enabled
const isRedisConfigured = Boolean(redisUrl || process.env.REDIS_HOST || process.env.REDIS_PORT) && process.env.NODE_ENV === 'production';

// Create Redis instance or a no-op stub in dev when not configured
const redis: any = isRedisConfigured
  ? (redisUrl ? new Redis(redisUrl, redisConfig) : new Redis(redisConfig))
  : {
      get: async (_key: string) => null,
      setex: async (_key: string, _ttl: number, _val: string) => undefined,
      keys: async (_pattern: string) => [] as string[],
      del: async (..._keys: string[]) => 0,
      info: async () => '',
      dbsize: async () => 0,
      on: (_event: string, _cb: (...args: any[]) => void) => undefined,
      // Enhanced methods for performance
      mget: async (_keys: string[]) => [],
      mset: async (_keyValues: Record<string, string>) => undefined,
      pipeline: () => ({
        get: () => ({ exec: async () => [] }),
        setex: () => ({ exec: async () => [] }),
        del: () => ({ exec: async () => [] }),
        exec: async () => []
      })
    };

if (!isRedisConfigured) {
  console.log('ℹ️ Redis caching disabled in development mode. Set NODE_ENV=production and REDIS_URL to enable caching.');
}

// Enhanced Redis event handling
if (isRedisConfigured) {
  redis.on('error', (err: any) => {
    console.error('❌ Redis connection error:', err);
    console.error('🔍 Error details:', {
      code: err.code,
      syscall: err.syscall,
      address: err.address,
      port: err.port
    });
  });

  redis.on('connect', () => {
    console.log('✅ Redis connected successfully');
    console.log(`🌐 Host: ${redis.options.host || 'unknown'}`);
    console.log(`🚪 Port: ${redis.options.port || 'unknown'}`);
    console.log(`🗄️ Database: ${redis.options.db || 0}`);
  });

  redis.on('ready', () => {
    console.log('🚀 Redis ready for operations');
  });

  redis.on('close', () => {
    console.log('🔒 Redis connection closed');
  });

  redis.on('reconnecting', (delay: number) => {
    console.log(`🔄 Redis reconnecting in ${delay}ms`);
  });

  redis.on('end', () => {
    console.log('🏁 Redis connection ended');
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
      if (process.env.CACHE_SKIP_AUTH === 'true' && (req as any).user) {
        return next();
      }

      // Create cache key with query parameters
      const cacheKey = `cache:${req.originalUrl}:${JSON.stringify(req.query)}`;
      
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
      const originalJson = res.json;
      res.json = function(data: any) {
        // Cache the response data
        redis.setex(cacheKey, duration, JSON.stringify(data))
          .catch(err => console.error('Cache set error:', err));
        
        // Call original method
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
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
      keys.forEach(key => pipeline.del(key));
      await pipeline.exec();
      
      console.log(`🗑️ Cache invalidated for pattern: ${pattern} (${keys.length} keys)`);
      return keys.length;
    }
    return 0;
  } catch (error) {
    console.error('Cache invalidation error:', error);
    return 0;
  }
};

// Enhanced session cache with TTL
export const sessionCache = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.sessionID;
    
    if (!sessionId) {
      return next();
    }

    const cacheKey = `session:${sessionId}`;
    const cachedSession = await redis.get(cacheKey);
    
    if (cachedSession) {
      // Extend session TTL
      await redis.expire(cacheKey, 3600); // 1 hour
    }
    
    next();
  } catch (error) {
    console.error('Session cache error:', error);
    next();
  }
};

// Enhanced cache helpers with performance optimizations
export const cacheHelpers = {
  // Get multiple keys efficiently
  async mget(keys: string[]) {
    try {
      return await redis.mget(keys);
    } catch (error) {
      console.error('Cache mget error:', error);
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
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  },

  // Enhanced club caching
  async setClub(clubId: string, clubData: any, duration: number = 1800) {
    try {
      const clubKey = `club:${clubId}`;
      const clubDataKey = `club:${clubId}:data`;
      const clubMembersKey = `club:${clubId}:members`;
      
      const pipeline = redis.pipeline();
      
      // Cache club data
      pipeline.setex(clubDataKey, duration, JSON.stringify(clubData));
      
      // Cache club members separately for faster access
      if (clubData.members) {
        pipeline.setex(clubMembersKey, duration, JSON.stringify(clubData.members));
      }
      
      // Set club key with TTL
      pipeline.setex(clubKey, duration, '1');
      
      await pipeline.exec();
      
      console.log(`💾 Club ${clubId} cached for ${duration}s`);
      return true;
    } catch (error) {
      console.error('Set club cache error:', error);
      return false;
    }
  },

  // Enhanced club cache invalidation
  async invalidateClub(clubId: string) {
    try {
      const patterns = [
        `club:${clubId}`,
        `club:${clubId}:*`,
        `club:${clubId}:data`,
        `club:${clubId}:members`
      ];
      
      let totalInvalidated = 0;
      for (const pattern of patterns) {
        totalInvalidated += await invalidateCache(pattern);
      }
      
      console.log(`🗑️ Club ${clubId} cache invalidated (${totalInvalidated} keys)`);
      return totalInvalidated;
    } catch (error) {
      console.error('Invalidate club cache error:', error);
      return 0;
    }
  },

  // User cache management
  async setUser(userId: string, userData: any, duration: number = 3600) {
    try {
      const userKey = `user:${userId}`;
      const userProfileKey = `user:${userId}:profile`;
      
      const pipeline = redis.pipeline();
      
      // Cache user profile (without sensitive data)
      const { sifre, resetToken, forgotPasswordToken, ...profileData } = userData;
      pipeline.setex(userProfileKey, duration, JSON.stringify(profileData));
      
      // Set user key with TTL
      pipeline.setex(userKey, duration, '1');
      
      await pipeline.exec();
      
      console.log(`💾 User ${userId} cached for ${duration}s`);
      return true;
    } catch (error) {
      console.error('Set user cache error:', error);
      return false;
    }
  },

  // User cache invalidation
  async invalidateUser(userId: string) {
    try {
      const patterns = [
        `user:${userId}`,
        `user:${userId}:*`,
        `user:${userId}:profile`
      ];
      
      let totalInvalidated = 0;
      for (const pattern of patterns) {
        totalInvalidated += await invalidateCache(pattern);
      }
      
      console.log(`🗑️ User ${userId} cache invalidated (${totalInvalidated} keys)`);
      return totalInvalidated;
    } catch (error) {
      console.error('Invalidate user cache error:', error);
      return 0;
    }
  },

  // Bulk cache operations
  async bulkSet(operations: Array<{ key: string; value: any; ttl: number }>) {
    try {
      const pipeline = redis.pipeline();
      
      operations.forEach(({ key, value, ttl }) => {
        pipeline.setex(key, ttl, JSON.stringify(value));
      });
      
      await pipeline.exec();
      
      console.log(`💾 Bulk cached ${operations.length} items`);
      return true;
    } catch (error) {
      console.error('Bulk cache set error:', error);
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
        info: info.split('\r\n').reduce((acc: any, line: string) => {
          const [key, value] = line.split(':');
          if (key && value) {
            acc[key] = value;
          }
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Get cache stats error:', error);
      return null;
    }
  }
};

// Cache cleanup function
export const cleanupCache = async () => {
  try {
    // Get all cache keys
    const keys = await redis.keys('cache:*');
    
    if (keys.length > 0) {
      // Delete expired cache keys
      const pipeline = redis.pipeline();
      keys.forEach(key => pipeline.del(key));
      await pipeline.exec();
      
      console.log(`🧹 Cleaned up ${keys.length} cache keys`);
      return keys.length;
    }
    
    return 0;
  } catch (error) {
    console.error('Cache cleanup error:', error);
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
      info: await redis.info('memory')
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

// Export all cache functions
export { redis }; 