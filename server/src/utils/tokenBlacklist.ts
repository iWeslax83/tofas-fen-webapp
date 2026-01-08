import { Redis } from 'ioredis';

/**
 * Token Blacklist Manager
 * Manages blacklisted tokens for security purposes
 */
class TokenBlacklistManager {
  private redis: Redis;
  private static instance: TokenBlacklistManager;

  constructor() {
    // Initialize Redis connection (prefer REDIS_URL if provided)
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.redis = new Redis(redisUrl as any);
    } else {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      } as any);
    }

    // Handle Redis connection errors
    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      console.log('Redis connected for token blacklist');
    });
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
    try {
      const ttl = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      
      if (ttl > 0) {
        await this.redis.setex(`blacklist:${token}`, ttl, '1');
      }
    } catch (error) {
      console.error('Error adding token to blacklist:', error);
    }
  }

  /**
   * Check if token is blacklisted
   */
  async isBlacklisted(token: string): Promise<boolean> {
    try {
      const result = await this.redis.get(`blacklist:${token}`);
      return result === '1';
    } catch (error) {
      console.error('Error checking token blacklist:', error);
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
      console.error('Error removing token from blacklist:', error);
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
      console.error('Error clearing blacklist:', error);
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
      console.error('Error getting blacklist stats:', error);
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
      console.error('Error closing Redis connection:', error);
    }
  }
}

export const tokenBlacklist = TokenBlacklistManager.getInstance();
