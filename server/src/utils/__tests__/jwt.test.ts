import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair,
  refreshTokens,
  authenticateJWT,
  authorizeRoles,
} from '../jwt';
import { Request, Response, NextFunction } from 'express';

// Mock modules
vi.mock('jsonwebtoken');
vi.mock('../../models', () => ({
  User: {
    findOne: vi.fn(),
  },
}));

// Helper to get current env secret (setup.ts sets this)
const getJwtSecret = () => process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';
const getRefreshSecret = () =>
  process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-key-for-testing-only';

describe('JWT Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Explicitly set env vars if not set by setup.ts (though they should be)
    if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
    if (!process.env.JWT_REFRESH_SECRET)
      process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
  });

  describe('generateAccessToken', () => {
    it('should generate access token', () => {
      const payload = { userId: '123', email: 'test@example.com', role: 'user' };
      vi.mocked(jwt.sign).mockImplementation(() => 'generated-token' as any);

      const token = generateAccessToken(payload);

      expect(token).toBe('generated-token');
      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        getJwtSecret(),
        expect.objectContaining({
          expiresIn: '15m',
          issuer: 'tofas-fen-webapp',
          audience: 'tofas-fen-users',
        }),
      );
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token', () => {
      const payload = { userId: '123', tokenVersion: 1 };
      vi.mocked(jwt.sign).mockImplementation(() => 'generated-refresh-token' as any);

      const token = generateRefreshToken(payload);

      expect(token).toBe('generated-refresh-token');
      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        getRefreshSecret(),
        expect.objectContaining({
          expiresIn: '3d',
          issuer: 'tofas-fen-webapp',
          audience: 'tofas-fen-users',
        }),
      );
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const token = 'valid-token';
      const mockPayload = { userId: 'test-user-id', email: 'test@example.com', role: 'user' };
      vi.mocked(jwt.verify).mockReturnValue(mockPayload as any);

      const payload = verifyAccessToken(token);

      expect(payload).toEqual(mockPayload);
      expect(jwt.verify).toHaveBeenCalledWith(
        token,
        getJwtSecret(),
        expect.objectContaining({
          issuer: 'tofas-fen-webapp',
          audience: 'tofas-fen-users',
        }),
      );
    });

    it('should return null for invalid token', () => {
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const token = 'invalid-token';
      const payload = verifyAccessToken(token);

      expect(payload).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const token = 'valid-refresh-token';
      const mockPayload = { userId: 'test-user-id', tokenVersion: 1 };
      vi.mocked(jwt.verify).mockReturnValue(mockPayload as any);

      const payload = verifyRefreshToken(token);

      expect(payload).toEqual(mockPayload);
      expect(jwt.verify).toHaveBeenCalledWith(
        token,
        getRefreshSecret(),
        expect.objectContaining({
          issuer: 'tofas-fen-webapp',
          audience: 'tofas-fen-users',
        }),
      );
    });
  });

  describe('generateTokenPair', () => {
    it('should generate access and refresh tokens', () => {
      const userId = '123';
      const role = 'user';
      const email = 'test@example.com';
      const tokenVersion = 1;

      vi.mocked(jwt.sign)
        .mockReturnValueOnce('access-token' as any)
        .mockReturnValueOnce('refresh-token' as any);

      const tokens = generateTokenPair(userId, role, email, tokenVersion);

      expect(tokens.accessToken).toBe('access-token');
      expect(tokens.refreshToken).toBe('refresh-token');
      expect(tokens.expiresIn).toBe(900); // 15 minutes in seconds
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const newTokenVersion = 1;
      const mockPayload = { userId: '123', tokenVersion: 1 };

      // Mock verify to return payload
      vi.mocked(jwt.verify).mockReturnValue(mockPayload as any);

      // Mock sign for new tokens
      vi.mocked(jwt.sign)
        .mockReturnValueOnce('new-access-token' as any)
        .mockReturnValueOnce('new-refresh-token' as any);

      // Mock User.findOne to return a valid user
      const { User } = await import('../../models');
      vi.mocked(User.findOne).mockResolvedValue({
        id: '123',
        rol: 'user',
        email: 'test@example.com',
      } as any);

      const tokens = await refreshTokens(refreshToken, newTokenVersion);

      expect(tokens.accessToken).toBe('new-access-token');
      expect(tokens.refreshToken).toBe('new-refresh-token');
      expect(tokens.expiresIn).toBe(900);
    });
  });

  describe('authenticateJWT', () => {
    it('should authenticate valid JWT token', async () => {
      const req = {
        headers: {
          authorization: 'Bearer valid-token',
        },
        cookies: {},
      } as unknown as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn() as NextFunction;

      const mockPayload = { userId: 'test-user-id', email: 'test@example.com', role: 'user' };
      vi.mocked(jwt.verify).mockReturnValue(mockPayload as any);

      // Mock blacklist check (assuming it's imported)
      // Since we can't easily mock the imported const, we might need to rely on it returning false by default in test env
      // or mock the module. For now let's assume it works or we mock the whole module if needed.
      // However, check if verifyAccessToken is called.

      await authenticateJWT(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual(mockPayload);
    });

    it('should return 401 for missing authorization header', async () => {
      const req = {
        headers: {},
        cookies: {},
      } as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn() as NextFunction;

      await authenticateJWT(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should use token from cookie if available', async () => {
      const req = {
        headers: {},
        cookies: { accessToken: 'cookie-token' },
      } as unknown as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn() as NextFunction;

      const mockPayload = { userId: 'test-user-id', role: 'user' };
      vi.mocked(jwt.verify).mockReturnValue(mockPayload as any);

      await authenticateJWT(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual(mockPayload);
    });

    it('should return 401 for invalid token', async () => {
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const req = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
        cookies: {},
      } as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn() as NextFunction;

      await authenticateJWT(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid or expired access token' }),
      );
    });
  });

  describe('authorizeRoles', () => {
    it('should allow access for authorized role', () => {
      const req = {
        user: { role: 'admin' },
      } as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn() as NextFunction;

      const middleware = authorizeRoles(['admin', 'user']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access for unauthorized role', () => {
      const req = {
        user: { role: 'guest' },
      } as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn() as NextFunction;

      const middleware = authorizeRoles(['admin', 'user']);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
