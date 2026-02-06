import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService } from '../../../modules/auth/services/authService';
import { User } from '../../../models/User';
import { AppError } from '../../../utils/AppError';
import bcrypt from 'bcryptjs';

// Mock dependencies
vi.mock('../../../models/User');
vi.mock('bcryptjs');

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authenticateUser', () => {
    it('should authenticate user with valid credentials', async () => {
      const mockUser = {
        id: 'user123',
        adSoyad: 'John Doe',
        rol: 'student',
        email: 'john@example.com',
        sifre: 'hashedPassword',
        isActive: true,
        lastLogin: null,
        loginCount: 0,
        tokenVersion: 0,
        save: vi.fn()
      };

      (User.findOne as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);

      const result = await AuthService.authenticateUser('user123', 'password123');

      expect(User.findOne).toHaveBeenCalledWith({ id: 'user123', isActive: true });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(mockUser.save).toHaveBeenCalled();
      expect(result.user).toEqual({
        id: 'user123',
        adSoyad: 'John Doe',
        rol: 'student',
        email: 'john@example.com',
        lastLogin: expect.any(Date)
      });
      expect(result.tokens).toBeDefined();
    });

    it('should throw unauthorized error for non-existent user', async () => {
      (User.findOne as any).mockResolvedValue(null);

      await expect(AuthService.authenticateUser('user123', 'password123'))
        .rejects.toThrow(AppError);
    });

    it('should throw unauthorized error for wrong password', async () => {
      const mockUser = {
        id: 'user123',
        sifre: 'hashedPassword',
        isActive: true
      };

      (User.findOne as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);

      await expect(AuthService.authenticateUser('user123', 'wrongpassword'))
        .rejects.toThrow(AppError);
    });
  });

  describe('getUserProfile', () => {
    it('should get user profile successfully', async () => {
      const mockUser = {
        id: 'user123',
        adSoyad: 'John Doe',
        rol: 'student',
        email: 'john@example.com',
        isActive: true,
        createdAt: new Date()
      };

      (User.findOne as any).mockResolvedValue(mockUser);

      const result = await AuthService.getUserProfile('user123');

      expect(User.findOne).toHaveBeenCalledWith({ id: 'user123', isActive: true });
      expect(result).toEqual({
        id: 'user123',
        adSoyad: 'John Doe',
        rol: 'student',
        email: 'john@example.com',
        createdAt: expect.any(Date)
      });
    });

    it('should throw not found error for non-existent user', async () => {
      (User.findOne as any).mockResolvedValue(null);

      await expect(AuthService.getUserProfile('user123'))
        .rejects.toThrow(AppError);
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

      const result = await AuthService.requestPasswordReset('john@example.com');

      expect(User.findOne).toHaveBeenCalledWith({ email: 'john@example.com', isActive: true });
      expect(mockUser.save).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.resetToken).toBeDefined();
    });

    it('should return success for non-existing user', async () => {
      (User.findOne as any).mockResolvedValue(null);

      const result = await AuthService.requestPasswordReset('nonexistent@example.com');

      expect(result.success).toBe(true);
      expect(result.resetToken).toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const mockUser = {
        id: 'user123',
        resetToken: 'validToken',
        resetTokenExpiry: new Date(Date.now() + 3600000), // 1 hour from now
        isActive: true,
        tokenVersion: 0,
        save: vi.fn()
      };

      (User.findOne as any).mockResolvedValue(mockUser);
      (bcrypt.hash as any).mockResolvedValue('newHashedPassword');

      await AuthService.resetPassword('validToken', 'newPassword123');

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 12);
      expect(mockUser.tokenVersion).toBe(1);
      expect(mockUser.resetToken).toBeUndefined();
      expect(mockUser.resetTokenExpiry).toBeUndefined();
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should throw unauthorized error for invalid token', async () => {
      (User.findOne as any).mockResolvedValue(null);

      await expect(AuthService.resetPassword('invalidToken', 'newPassword123'))
        .rejects.toThrow(AppError);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong password', () => {
      const result = AuthService.validatePasswordStrength('Password123');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short password', () => {
      const result = AuthService.validatePasswordStrength('Pass1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Şifre en az 6 karakter olmalıdır');
    });

    it('should reject password without uppercase', () => {
      const result = AuthService.validatePasswordStrength('password123');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Şifre en az bir büyük harf içermelidir');
    });

    it('should reject password without lowercase', () => {
      const result = AuthService.validatePasswordStrength('PASSWORD123');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Şifre en az bir küçük harf içermelidir');
    });

    it('should reject password without number', () => {
      const result = AuthService.validatePasswordStrength('Password');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Şifre en az bir rakam içermelidir');
    });

    it('should reject too long password', () => {
      const longPassword = 'a'.repeat(101);
      const result = AuthService.validatePasswordStrength(longPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Şifre 100 karakterden kısa olmalıdır');
    });
  });

  describe('userExists', () => {
    it('should return true for existing user', async () => {
      (User.findOne as any).mockResolvedValue({ id: 'user123' });

      const result = await AuthService.userExists('user123');

      expect(result).toBe(true);
      expect(User.findOne).toHaveBeenCalledWith({ id: 'user123', isActive: true });
    });

    it('should return false for non-existing user', async () => {
      (User.findOne as any).mockResolvedValue(null);

      const result = await AuthService.userExists('user123');

      expect(result).toBe(false);
    });
  });

  describe('userExistsByEmail', () => {
    it('should return true for existing email', async () => {
      (User.findOne as any).mockResolvedValue({ email: 'john@example.com' });

      const result = await AuthService.userExistsByEmail('john@example.com');

      expect(result).toBe(true);
      expect(User.findOne).toHaveBeenCalledWith({ email: 'john@example.com', isActive: true });
    });

    it('should return false for non-existing email', async () => {
      (User.findOne as any).mockResolvedValue(null);

      const result = await AuthService.userExistsByEmail('john@example.com');

      expect(result).toBe(false);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const mockStats = {
        totalUsers: 100,
        activeUsers: 95,
        usersByRole: [
          { _id: 'student', count: 80 },
          { _id: 'teacher', count: 15 }
        ],
        recentLogins: 10
      };

      (User.countDocuments as any)
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(95)  // activeUsers
        .mockResolvedValueOnce(10); // recentLogins

      (User.aggregate as any).mockResolvedValue(mockStats.usersByRole);

      const result = await AuthService.getUserStats();

      expect(result).toEqual({
        totalUsers: 100,
        activeUsers: 95,
        usersByRole: {
          student: 80,
          teacher: 15
        },
        recentLogins: 10
      });
    });
  });
});
