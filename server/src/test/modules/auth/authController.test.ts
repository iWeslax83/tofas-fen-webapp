import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { AuthController } from '../../modules/auth/controllers/authController';
import { User } from '../../models/User';
import { AppError } from '../../utils/AppError';
import bcrypt from 'bcryptjs';

// Mock dependencies
vi.mock('../../models/User');
vi.mock('bcryptjs');
vi.mock('../../utils/jwt');

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
      status: vi.fn().mockReturnThis()
    };
    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const mockUser = {
        id: 'user123',
        adSoyad: 'John Doe',
        rol: 'student',
        email: 'john@example.com',
        sifre: 'hashedPassword',
        isActive: true,
        lastLogin: null,
        loginCount: 0,
        save: vi.fn()
      };

      (User.findOne as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);

      mockRequest.body = { id: 'user123', sifre: 'password123' };

      await AuthController.login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(User.findOne).toHaveBeenCalledWith({ id: 'user123', isActive: true });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Giriş başarılı',
          user: expect.objectContaining({
            id: 'user123',
            adSoyad: 'John Doe',
            rol: 'student'
          })
        })
      );
    });

    it('should throw validation error for missing credentials', async () => {
      mockRequest.body = { id: 'user123' }; // Missing password

      await AuthController.login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect((mockNext as any).mock.calls[0][0].statusCode).toBe(400);
    });

    it('should throw unauthorized error for invalid credentials', async () => {
      (User.findOne as any).mockResolvedValue(null);
      mockRequest.body = { id: 'user123', sifre: 'password123' };

      await AuthController.login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect((mockNext as any).mock.calls[0][0].statusCode).toBe(401);
    });

    it('should throw unauthorized error for wrong password', async () => {
      const mockUser = {
        id: 'user123',
        sifre: 'hashedPassword',
        isActive: true
      };

      (User.findOne as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);
      mockRequest.body = { id: 'user123', sifre: 'wrongpassword' };

      await AuthController.login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect((mockNext as any).mock.calls[0][0].statusCode).toBe(401);
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      mockRequest.body = { accessToken: 'token123', refreshToken: 'refresh123' };

      await AuthController.logout(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Çıkış başarılı'
      });
    });
  });

  describe('getProfile', () => {
    it('should get user profile successfully', async () => {
      const mockUser = {
        id: 'user123',
        adSoyad: 'John Doe',
        rol: 'student',
        email: 'john@example.com',
        isActive: true
      };

      (User.findOne as any).mockResolvedValue(mockUser);
      mockRequest.user = { userId: 'user123' };

      await AuthController.getProfile(mockRequest as Request, mockResponse as Response, mockNext);

      expect(User.findOne).toHaveBeenCalledWith({ id: 'user123', isActive: true });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        user: expect.objectContaining({
          id: 'user123',
          adSoyad: 'John Doe',
          rol: 'student'
        })
      });
    });

    it('should throw unauthorized error when user not found in request', async () => {
      mockRequest.user = undefined;

      await AuthController.getProfile(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect((mockNext as any).mock.calls[0][0].statusCode).toBe(401);
    });

    it('should throw not found error when user not found in database', async () => {
      (User.findOne as any).mockResolvedValue(null);
      mockRequest.user = { userId: 'user123' };

      await AuthController.getProfile(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect((mockNext as any).mock.calls[0][0].statusCode).toBe(404);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockUser = {
        id: 'user123',
        sifre: 'oldHashedPassword',
        tokenVersion: 0,
        isActive: true,
        save: vi.fn()
      };

      (User.findOne as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      (bcrypt.hash as any).mockResolvedValue('newHashedPassword');

      mockRequest.user = { userId: 'user123' };
      mockRequest.body = {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123'
      };

      await AuthController.changePassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(bcrypt.compare).toHaveBeenCalledWith('oldPassword', 'oldHashedPassword');
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 12);
      expect(mockUser.tokenVersion).toBe(1);
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Şifre başarıyla değiştirildi'
      });
    });

    it('should throw validation error for missing passwords', async () => {
      mockRequest.user = { userId: 'user123' };
      mockRequest.body = { currentPassword: 'oldPassword' }; // Missing new password

      await AuthController.changePassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect((mockNext as any).mock.calls[0][0].statusCode).toBe(400);
    });

    it('should throw validation error for short password', async () => {
      mockRequest.user = { userId: 'user123' };
      mockRequest.body = {
        currentPassword: 'oldPassword',
        newPassword: '123' // Too short
      };

      await AuthController.changePassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect((mockNext as any).mock.calls[0][0].statusCode).toBe(400);
    });

    it('should throw unauthorized error for wrong current password', async () => {
      const mockUser = {
        id: 'user123',
        sifre: 'oldHashedPassword',
        isActive: true
      };

      (User.findOne as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);

      mockRequest.user = { userId: 'user123' };
      mockRequest.body = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword123'
      };

      await AuthController.changePassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect((mockNext as any).mock.calls[0][0].statusCode).toBe(401);
    });
  });

  describe('requestPasswordReset', () => {
    it('should request password reset for existing user', async () => {
      const mockUser = {
        id: 'user123',
        email: 'john@example.com',
        isActive: true,
        save: vi.fn()
      };

      (User.findOne as any).mockResolvedValue(mockUser);
      mockRequest.body = { email: 'john@example.com' };

      await AuthController.requestPasswordReset(mockRequest as Request, mockResponse as Response, mockNext);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'john@example.com', isActive: true });
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Şifre sıfırlama bağlantısı email adresinize gönderildi',
        resetToken: expect.any(String)
      });
    });

    it('should return success even for non-existing user', async () => {
      (User.findOne as any).mockResolvedValue(null);
      mockRequest.body = { email: 'nonexistent@example.com' };

      await AuthController.requestPasswordReset(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Eğer email adresiniz sistemde kayıtlıysa, şifre sıfırlama bağlantısı gönderilecektir'
      });
    });

    it('should throw validation error for missing email', async () => {
      mockRequest.body = {};

      await AuthController.requestPasswordReset(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect((mockNext as any).mock.calls[0][0].statusCode).toBe(400);
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const mockUser = {
        id: 'user123',
        resetToken: 'validToken',
        resetTokenExpiry: new Date(Date.now() + 3600000), // 1 hour from now
        isActive: true,
        save: vi.fn()
      };

      (User.findOne as any).mockResolvedValue(mockUser);
      (bcrypt.hash as any).mockResolvedValue('newHashedPassword');

      mockRequest.body = {
        token: 'validToken',
        newPassword: 'newPassword123'
      };

      await AuthController.resetPassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 12);
      expect(mockUser.tokenVersion).toBe(1);
      expect(mockUser.resetToken).toBeUndefined();
      expect(mockUser.resetTokenExpiry).toBeUndefined();
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Şifre başarıyla sıfırlandı'
      });
    });

    it('should throw validation error for missing token or password', async () => {
      mockRequest.body = { token: 'validToken' }; // Missing password

      await AuthController.resetPassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect((mockNext as any).mock.calls[0][0].statusCode).toBe(400);
    });

    it('should throw validation error for short password', async () => {
      mockRequest.body = {
        token: 'validToken',
        newPassword: '123' // Too short
      };

      await AuthController.resetPassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect((mockNext as any).mock.calls[0][0].statusCode).toBe(400);
    });

    it('should throw unauthorized error for invalid token', async () => {
      (User.findOne as any).mockResolvedValue(null);
      mockRequest.body = {
        token: 'invalidToken',
        newPassword: 'newPassword123'
      };

      await AuthController.resetPassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect((mockNext as any).mock.calls[0][0].statusCode).toBe(401);
    });
  });
});
