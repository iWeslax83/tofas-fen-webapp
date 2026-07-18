import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { AuthController } from '../../../modules/auth/controllers/authController';
import { User } from '../../../models/User';
import { AppError } from '../../../utils/AppError';
import bcrypt from 'bcryptjs';

// Mock dependencies
vi.mock('../../../models/User');
vi.mock('bcryptjs');
vi.mock('../../../utils/jwt');
vi.mock('../../../modules/auth/services/authService');

import { AuthService } from '../../../modules/auth/services/authService';

describe('AuthController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      user: undefined,
      cookies: {},
      ip: '127.0.0.1',
      get: vi.fn().mockReturnValue('test-user-agent'),
    };
    mockResponse = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
      clearCookie: vi.fn().mockReturnThis(),
      cookie: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const mockResult = {
        user: { id: 'user123', adSoyad: 'John Doe', rol: 'student' },
        tokens: { accessToken: 'at', refreshToken: 'rt', expiresIn: 900, refreshExpiresIn: 604800 },
      };

      (AuthService.authenticateUser as any).mockResolvedValue(mockResult);

      mockRequest.body = { id: 'user123', sifre: 'password123' };

      await AuthController.login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(AuthService.authenticateUser).toHaveBeenCalledWith(
        'user123',
        'password123',
        undefined,
        expect.any(Object),
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Giriş başarılı',
          user: expect.objectContaining({ id: 'user123' }),
        }),
      );
    });

    it('should throw validation error for missing credentials', async () => {
      mockRequest.body = { id: 'user123' };

      await AuthController.login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      mockRequest.cookies = { accessToken: 'at', refreshToken: 'rt' };

      await AuthController.logout(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Çıkış başarılı',
      });
    });
  });

  describe('getProfile', () => {
    it('should get user profile successfully', async () => {
      const mockUser = { id: 'user123', adSoyad: 'John Doe', rol: 'student' };
      (User.findOne as any).mockResolvedValue(mockUser);
      mockRequest.user = { userId: 'user123', role: 'student' };

      await AuthController.getProfile(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        user: expect.objectContaining({ id: 'user123' }),
      });
    });
  });

  describe('getMe', () => {
    // B-H2: /me is the SPA bootstrap endpoint; it must supply the CSRF token so
    // a reloaded cross-origin tab (which lost its in-memory token) can send the
    // X-CSRF-Token header on the next state-changing request.
    it('should mint and return a CSRF token when none is present on the request', async () => {
      const mockUser = { id: 'user123', adSoyad: 'John Doe', rol: 'student' };
      (User.findOne as any).mockResolvedValue(mockUser);
      mockRequest.user = { userId: 'user123', role: 'student' };
      mockRequest.cookies = {};

      await AuthController.getMe(mockRequest as Request, mockResponse as Response, mockNext);

      // A fresh csrfToken cookie is set...
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'csrfToken',
        expect.any(String),
        expect.objectContaining({ httpOnly: false }),
      );
      // ...and the same value is echoed in the body for the SPA to store.
      const body = (mockResponse.json as any).mock.calls[0][0];
      const cookieValue = (mockResponse.cookie as any).mock.calls.find(
        (c: unknown[]) => c[0] === 'csrfToken',
      )[1];
      expect(body.csrfToken).toBe(cookieValue);
      expect(body).toMatchObject({ id: 'user123' });
    });

    it('should reuse the existing csrfToken cookie without churning it', async () => {
      const mockUser = { id: 'user123', adSoyad: 'John Doe', rol: 'student' };
      (User.findOne as any).mockResolvedValue(mockUser);
      mockRequest.user = { userId: 'user123', role: 'student' };
      mockRequest.cookies = { csrfToken: 'existing-token-value' };

      await AuthController.getMe(mockRequest as Request, mockResponse as Response, mockNext);

      // The existing token is returned as-is; no new csrfToken cookie is issued.
      const body = (mockResponse.json as any).mock.calls[0][0];
      expect(body.csrfToken).toBe('existing-token-value');
      const issuedCsrfCookie = (mockResponse.cookie as any).mock.calls.some(
        (c: unknown[]) => c[0] === 'csrfToken',
      );
      expect(issuedCsrfCookie).toBe(false);
    });
  });
});
