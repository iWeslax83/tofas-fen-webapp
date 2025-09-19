import { describe, it, expect, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair,
  refreshTokens,
  JWTPayload,
  RefreshTokenPayload
} from '../../utils/jwt';

// Mock environment variables
vi.mock('process', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-minimum-32-characters-long',
    JWT_REFRESH_SECRET: 'test-refresh-secret-minimum-32-characters-long'
  }
}));

describe('JWT Utils', () => {
  const mockPayload: JWTPayload = {
    userId: 'user123',
    role: 'student',
    email: 'test@example.com'
  };

  const mockRefreshPayload: RefreshTokenPayload = {
    userId: 'user123',
    tokenVersion: 1
  };

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = generateAccessToken(mockPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Verify token can be decoded
      const decoded = jwt.decode(token) as any;
      expect(decoded.userId).toBe('user123');
      expect(decoded.role).toBe('student');
      expect(decoded.email).toBe('test@example.com');
    });

    it('should include issuer and audience in token', () => {
      const token = generateAccessToken(mockPayload);
      const decoded = jwt.decode(token) as any;
      
      expect(decoded.iss).toBe('tofas-fen-webapp');
      expect(decoded.aud).toBe('tofas-fen-users');
    });

    it('should have correct expiration time', () => {
      const token = generateAccessToken(mockPayload);
      const decoded = jwt.decode(token) as any;
      
      const now = Math.floor(Date.now() / 1000);
      const exp = decoded.exp;
      const iat = decoded.iat;
      
      expect(exp - iat).toBe(15 * 60); // 15 minutes
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken(mockRefreshPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Verify token can be decoded
      const decoded = jwt.decode(token) as any;
      expect(decoded.userId).toBe('user123');
      expect(decoded.tokenVersion).toBe(1);
    });

    it('should have correct expiration time', () => {
      const token = generateRefreshToken(mockRefreshPayload);
      const decoded = jwt.decode(token) as any;
      
      const now = Math.floor(Date.now() / 1000);
      const exp = decoded.exp;
      const iat = decoded.iat;
      
      expect(exp - iat).toBe(7 * 24 * 60 * 60); // 7 days
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const token = generateAccessToken(mockPayload);
      const verified = verifyAccessToken(token);
      
      expect(verified).toEqual(mockPayload);
    });

    it('should return null for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      const verified = verifyAccessToken(invalidToken);
      
      expect(verified).toBeNull();
    });

    it('should return null for expired token', () => {
      // Create an expired token
      const expiredPayload = { ...mockPayload, exp: Math.floor(Date.now() / 1000) - 3600 };
      const expiredToken = jwt.sign(expiredPayload, 'test-jwt-secret-minimum-32-characters-long');
      
      const verified = verifyAccessToken(expiredToken);
      expect(verified).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const token = generateRefreshToken(mockRefreshPayload);
      const verified = verifyRefreshToken(token);
      
      expect(verified).toEqual(mockRefreshPayload);
    });

    it('should return null for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      const verified = verifyRefreshToken(invalidToken);
      
      expect(verified).toBeNull();
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const tokenPair = generateTokenPair('user123', 'student', 'test@example.com', 1);
      
      expect(tokenPair.accessToken).toBeDefined();
      expect(tokenPair.refreshToken).toBeDefined();
      expect(tokenPair.expiresIn).toBe(15 * 60);
      expect(tokenPair.refreshExpiresIn).toBe(7 * 24 * 60 * 60);
    });

    it('should generate valid tokens that can be verified', () => {
      const tokenPair = generateTokenPair('user123', 'student', 'test@example.com', 1);
      
      const accessVerified = verifyAccessToken(tokenPair.accessToken);
      const refreshVerified = verifyRefreshToken(tokenPair.refreshToken);
      
      expect(accessVerified).toBeDefined();
      expect(refreshVerified).toBeDefined();
      expect(accessVerified?.userId).toBe('user123');
      expect(refreshVerified?.userId).toBe('user123');
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const tokenPair = generateTokenPair('user123', 'student', 'test@example.com', 1);
      const newTokenPair = await refreshTokens(tokenPair.refreshToken, 1);
      
      expect(newTokenPair.accessToken).toBeDefined();
      expect(newTokenPair.refreshToken).toBeDefined();
      expect(newTokenPair.expiresIn).toBe(15 * 60);
      expect(newTokenPair.refreshExpiresIn).toBe(7 * 24 * 60 * 60);
    });

    it('should throw error for invalid refresh token', async () => {
      const invalidToken = 'invalid.token.here';
      
      await expect(refreshTokens(invalidToken, 1)).rejects.toThrow('Invalid refresh token');
    });

    it('should throw error for token version mismatch', async () => {
      const tokenPair = generateTokenPair('user123', 'student', 'test@example.com', 1);
      
      await expect(refreshTokens(tokenPair.refreshToken, 2)).rejects.toThrow('Token version mismatch');
    });
  });
});
