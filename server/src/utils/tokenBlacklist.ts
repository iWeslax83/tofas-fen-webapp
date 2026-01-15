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
   * Add token to blacklist
   */
  async addToBlacklist(token: string, expiresAt: number): Promise<void> {
    if (!this.isConnected) {
      return; // Silently fail in development if Redis is not available
    }
    try {
      const ttl = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      
      if (ttl > 0) {
        await this.redis.setex(`blacklist:${token}`, ttl, '1');
      }
    } catch (error) {
      logger.warn('Error adding token to blacklist:', error);
    }
  }

  /**
   * Check if token is blacklisted
   */
  async isBlacklisted(token: string): Promise<boolean> {
    if (!this.isConnected) {
      return false; // Fail open for availability
    }
    try {
      const result = await this.redis.get(`blacklist:${token}`);
      return result === '1';
    } catch (error) {
      logger.warn('Error checking token blacklist:', error);
      return false; // Fail open for availability
    }
  }

  /**
   * Remove token from blacklist (for testing purposes)
   */
  async removeFromBlacklist(token: string): Promise<void> {
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
