import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';

// Mock rate limiter before importing routes
vi.mock('../../middleware/rateLimiter', () => ({
  authLimiter: (req: any, res: any, next: any) => next(),
  apiLimiter: (req: any, res: any, next: any) => next(),
}));

// Mock captcha middleware
vi.mock('../../middleware/captcha', () => ({
  captchaMiddleware: (req: any, res: any, next: any) => next(),
}));

// Mock tokenBlacklist
vi.mock('../../utils/tokenBlacklist', () => ({
  tokenBlacklist: {
    isBlacklisted: vi.fn().mockResolvedValue(false),
    add: vi.fn(),
    blacklist: vi.fn(),
  },
}));

// Mock security logger
vi.mock('../../utils/securityLogger', () => ({
  logSecurityEvent: vi.fn(),
  SecurityEvent: {},
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock AuthService
vi.mock('../../modules/auth/services/authService', () => ({
  AuthService: {
    authenticateUser: vi.fn(),
    registerUser: vi.fn(),
    rotateRefreshToken: vi.fn(),
  },
}));

// Mock jwt utilities - keep authenticateJWT real but mock token functions
vi.mock('../../utils/jwt', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    generateAccessToken: vi.fn(() => 'access-token'),
    generateRefreshToken: vi.fn(() => 'refresh-token'),
    generateTokenPair: vi.fn(() => ({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 900,
      refreshExpiresIn: 259200,
      tokenVersion: 0,
    })),
    verifyRefreshToken: vi.fn(() => ({ userId: 'testuser', tokenVersion: 1 })),
    logoutUser: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(() => ({ userId: 'testuser', role: 'user' })),
    sign: vi.fn(() => 'token'),
  },
  verify: vi.fn(() => ({ userId: 'testuser', role: 'user' })),
  sign: vi.fn(() => 'token'),
}));

vi.mock('../../models/User', () => ({
  User: {
    findOne: vi.fn(),
  },
}));

vi.mock('../../models/RefreshToken', () => ({
  RefreshToken: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../../mailService', () => ({
  sendMail: vi.fn().mockResolvedValue(true),
}));

import { AuthService } from '../../modules/auth/services/authService';
import { User } from '../../models/User';
import authRoutes from '../../modules/auth/routes/authRoutes';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/auth', authRoutes);
// Error handler for AppError
app.use((err: any, _req: any, res: any, _next: any) => {
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    ...(err.errors && { errors: err.errors }),
  });
});

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const mockResult = {
        user: {
          id: 'testuser',
          email: 'test@example.com',
          rol: 'user',
          adSoyad: 'Test User',
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 900,
          refreshExpiresIn: 259200,
          tokenVersion: 0,
        },
      };

      vi.mocked(AuthService.authenticateUser).mockResolvedValue(mockResult as any);

      const response = await request(app).post('/auth/login').send({
        id: 'testuser',
        sifre: 'password123',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body.user.id).toBe('testuser');
      expect(response.body.message).toBe('Giriş başarılı');
    });

    it('should return 401 for invalid credentials', async () => {
      const { AppError } = await import('../../utils/AppError');
      vi.mocked(AuthService.authenticateUser).mockRejectedValue(
        AppError.unauthorized('Geçersiz kullanıcı adı veya şifre'),
      );

      const response = await request(app).post('/auth/login').send({
        id: 'invaliduser',
        sifre: 'wrongpassword',
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Geçersiz kullanıcı adı veya şifre');
    });

    it('should return 401 for wrong password', async () => {
      const { AppError } = await import('../../utils/AppError');
      vi.mocked(AuthService.authenticateUser).mockRejectedValue(
        AppError.unauthorized('Geçersiz kullanıcı adı veya şifre'),
      );

      const response = await request(app).post('/auth/login').send({
        id: 'testuser',
        sifre: 'wrongpassword',
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Geçersiz kullanıcı adı veya şifre');
    });
  });

  describe('POST /auth/refresh-token', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const mockUser = {
        id: 'testuser',
        rol: 'user',
        email: 'test@example.com',
        tokenVersion: 1,
        isActive: true,
      };

      vi.mocked(User.findOne).mockResolvedValue(mockUser as any);
      vi.mocked(AuthService.rotateRefreshToken).mockResolvedValue({
        tokens: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 900,
          refreshExpiresIn: 259200,
          tokenVersion: 1,
        },
      } as any);

      const response = await request(app).post('/auth/refresh-token').send({
        refreshToken: 'valid-refresh-token',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Token yenilendi');
      expect(response.body).toHaveProperty('expiresIn');
    });

    it('should return 401 for invalid refresh token', async () => {
      const { verifyRefreshToken } = await import('../../utils/jwt');
      vi.mocked(verifyRefreshToken).mockReturnValueOnce(null);

      const response = await request(app).post('/auth/refresh-token').send({
        refreshToken: 'invalid-refresh-token',
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Geçersiz refresh token');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout user successfully', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Çıkış başarılı');
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user from session', async () => {
      const mockUser = {
        id: 'testuser',
        email: 'test@example.com',
        rol: 'user',
        toObject: () => ({
          id: 'testuser',
          email: 'test@example.com',
          rol: 'user',
        }),
      };

      vi.mocked(User.findOne).mockResolvedValue(mockUser as any);

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
    });

    it('should return current user from JWT', async () => {
      const mockUser = {
        id: 'testuser',
        email: 'test@example.com',
        rol: 'user',
        save: vi.fn().mockResolvedValue(true),
        toObject: () => ({
          id: 'testuser',
          email: 'test@example.com',
          rol: 'user',
        }),
      };

      vi.mocked(User.findOne).mockResolvedValue(mockUser as any);

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app).get('/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });
  });
});
