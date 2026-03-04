import { Redis } from 'ioredis';
import logger from './logger';

/**
 * Token Blacklist Manager
 * Manages blacklisted tokens for security purposes
 */
class TokenBlacklistManager {
  private redis: Redis | any;
  private static instance: TokenBlacklistManager;
  private isConnected: boolean = false;
  private memoryStore: Map<string, number> = new Map(); // token → expiresAt timestamp
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize Redis connection (prefer REDIS_URL if provided)
    const redisUrl = process.env.REDIS_URL;
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    try {
      if (redisUrl) {
        this.redis = new Redis(redisUrl as any, {
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          retryStrategy: (times: number) => {
            if (times > 3) {
              if (isDevelopment) {
                logger.warn('Redis connection failed, continuing without Redis in development mode');
                return null; // Stop retrying in development
              }
              return null; // Stop retrying after 3 attempts
            }
            return Math.min(times * 50, 2000);
          },
          enableOfflineQueue: false
        });
      } else {
        this.redis = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          retryStrategy: (times: number) => {
            if (times > 3) {
              if (isDevelopment) {
                logger.warn('Redis connection failed, continuing without Redis in development mode');
                return null;
              }
              return null;
            }
            return Math.min(times * 50, 2000);
          },
          enableOfflineQueue: false
        } as any);
      }

      // Handle Redis connection errors gracefully
      this.redis.on('error', (error: Error) => {
        this.isConnected = false;
        if (isDevelopment) {
          logger.warn('Redis connection error (development mode, continuing without Redis):', error.message);
        } else {
          logger.error('Redis connection error:', error);
        }
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis connected for token blacklist');
        // Sync in-memory entries to Redis on reconnect
        this.syncMemoryToRedis();
      });
    } catch (error) {
      logger.warn('Failed to initialize Redis, continuing without token blacklist:', error);
      this.isConnected = false;
      // Create a no-op Redis instance
      this.redis = {
        get: async () => null,
        setex: async () => undefined,
        del: async () => 0,
        keys: async () => [],
        quit: async () => undefined,
        on: () => undefined
      } as any;
    }
  }

  static getInstance(): TokenBlacklistManager {
    if (!TokenBlacklistManager.instance) {
      TokenBlacklistManager.instance = new TokenBlacklistManager();
    }
    return TokenBlacklistManager.instance;
  }

  /**
   * Start periodic cleanup of expired in-memory entries (every 5 minutes)
   */
  private startCleanupInterval(): void {
    if (this.cleanupInterval) return;
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [token, expiresAt] of this.memoryStore) {
        if (expiresAt <= now) {
          this.memoryStore.delete(token);
        }
      }
    }, 5 * 60 * 1000);
    // Allow process to exit without waiting for this interval
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Sync in-memory blacklist entries to Redis on reconnect
   */
  private async syncMemoryToRedis(): Promise<void> {
    if (!this.isConnected) return;
    const now = Date.now();
    for (const [token, expiresAt] of this.memoryStore) {
      if (expiresAt <= now) {
        this.memoryStore.delete(token);
        continue;
      }
      try {
        const ttl = Math.max(0, Math.floor((expiresAt - now) / 1000));
        if (ttl > 0) {
          await this.redis.setex(`blacklist:${token}`, ttl, '1');
        }
      } catch {
        // Best-effort sync
      }
    }
  }

  /**
   * Add token to blacklist
   */
  async addToBlacklist(token: string, expiresAt: number): Promise<void> {
    // Always write to in-memory store
    if (expiresAt > Date.now()) {
      this.memoryStore.set(token, expiresAt);
      this.startCleanupInterval();
    }

    // Also write to Redis if connected
    if (this.isConnected) {
      try {
        const ttl = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        if (ttl > 0) {
          await this.redis.setex(`blacklist:${token}`, ttl, '1');
        }
      } catch (error) {
        logger.warn('Error adding token to blacklist in Redis:', error);
      }
    }
  }

  /**
   * Check if token is blacklisted
   */
  async isBlacklisted(token: string): Promise<boolean> {
    // Check in-memory first
    const memExpiry = this.memoryStore.get(token);
    if (memExpiry !== undefined) {
      if (memExpiry > Date.now()) {
        return true;
      }
      // Expired, clean up
      this.memoryStore.delete(token);
    }

    // Then check Redis
    if (this.isConnected) {
      try {
        const result = await this.redis.get(`blacklist:${token}`);
        return result === '1';
      } catch (error) {
        logger.warn('Error checking token blacklist in Redis:', error);
      }
    }

    return false;
  }

  /**
   * Remove token from blacklist (for testing purposes)
   */
  async removeFromBlacklist(token: string): Promise<void> {
    this.memoryStore.delete(token);
    try {
      await this.redis.del(`blacklist:${token}`);
    } catch (error) {
      logger.warn('Error removing token from blacklist:', error);
    }
  }

  /**
   * Clear all blacklisted tokens (for testing purposes)
   */
  async clearBlacklist(): Promise<void> {
    this.memoryStore.clear();
    try {
      const keys = await this.redis.keys('blacklist:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      logger.warn('Error clearing blacklist:', error);
    }
  }

  /**
   * Get blacklist statistics
   */
  async getBlacklistStats(): Promise<{ count: number; memory: string }> {
    try {
      const keys = await this.redis.keys('blacklist:*');
      const info = await this.redis.memory('USAGE', 'blacklist:*');
      
      return {
        count: keys.length,
        memory: String(info || '0')
      };
    } catch (error) {
      logger.warn('Error getting blacklist stats:', error);
      return { count: 0, memory: '0' };
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      logger.warn('Error closing Redis connection:', error);
    }
  }
}

export const tokenBlacklist = TokenBlacklistManager.getInstance();
