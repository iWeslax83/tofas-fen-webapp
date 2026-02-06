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
      user: undefined
    };
    mockResponse = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
      clearCookie: vi.fn().mockReturnThis(),
      cookie: vi.fn().mockReturnThis()
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
        tokens: { accessToken: 'at', refreshToken: 'rt', expiresIn: 900, refreshExpiresIn: 604800 }
      };

      (AuthService.authenticateUser as any).mockResolvedValue(mockResult);

      mockRequest.body = { id: 'user123', sifre: 'password123' };

      await AuthController.login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(AuthService.authenticateUser).toHaveBeenCalledWith('user123', 'password123');
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Giriş başarılı',
          user: expect.objectContaining({ id: 'user123' })
        })
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
        message: 'Çıkış başarılı'
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
        user: expect.objectContaining({ id: 'user123' })
      });
    });
  });

  describe('forgotPassword', () => {
    it('should request password reset successfully', async () => {
      (AuthService.requestPasswordReset as any).mockResolvedValue({ success: true, resetToken: 'token' });
      mockRequest.body = { email: 'john@example.com' };

      await AuthController.forgotPassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(AuthService.requestPasswordReset).toHaveBeenCalledWith('john@example.com');
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      (AuthService.resetPassword as any).mockResolvedValue(undefined);
      mockRequest.body = { token: 'validToken', newPassword: 'newPassword123' };

      await AuthController.resetPassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(AuthService.resetPassword).toHaveBeenCalledWith('validToken', 'newPassword123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Şifre başarıyla güncellendi'
      });
    });
  });
});
