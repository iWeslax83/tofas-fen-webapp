import { User } from '../../../models/User';
import { AppError } from '../../../utils/AppError';
import bcrypt from 'bcryptjs';
import { generateTokenPair } from '../../../utils/jwt';

/**
 * Authentication Service
 * Business logic for authentication operations
 */
export class AuthService {
  /**
   * Authenticate user with ID and password
   */
  static async authenticateUser(id: string, password: string): Promise<{
    user: any;
    tokens: any;
  }> {
    // Find user by ID
    const user = await User.findOne({ id, isActive: true });
    if (!user) {
      throw AppError.unauthorized('Geçersiz kullanıcı adı veya şifre');
    }

    // Check password - artık TCKN kullanılıyor
    // Önce TCKN kontrolü yap, yoksa eski şifre sistemine geri dön (geriye dönük uyumluluk)
    if (user.tckn) {
      // TCKN ile giriş
      if (user.tckn !== password) {
        throw AppError.unauthorized('Geçersiz kullanıcı adı veya şifre');
      }
    } else if (user.sifre) {
      // Eski sistem: bcrypt ile şifre kontrolü (geriye dönük uyumluluk)
      if (!(await bcrypt.compare(password, user.sifre))) {
        throw AppError.unauthorized('Geçersiz kullanıcı adı veya şifre');
      }
    } else {
      throw AppError.unauthorized('Kullanıcı şifresi tanımlanmamış');
    }

    // Update last login
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    // Generate tokens
    const tokens = generateTokenPair(user.id, user.rol, user.email, user.tokenVersion);

    return {
      user: {
        id: user.id,
        adSoyad: user.adSoyad,
        rol: user.rol,
        email: user.email,
        sinif: user.sinif,
        sube: user.sube,
        oda: user.oda,
        pansiyon: user.pansiyon,
        lastLogin: user.lastLogin
      },
      tokens
    };
  }

  /**
   * Get user profile by ID
   */
  static async getUserProfile(userId: string): Promise<any> {
    const user = await User.findOne({ id: userId, isActive: true });
    if (!user) {
      throw AppError.notFound('Kullanıcı bulunamadı');
    }

    return {
      id: user.id,
      adSoyad: user.adSoyad,
      rol: user.rol,
      email: user.email,
      sinif: user.sinif,
      sube: user.sube,
      oda: user.oda,
      pansiyon: user.pansiyon,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt
    };
  }

  // Şifre değiştirme fonksiyonu kaldırıldı - artık TCKN kullanılıyor ve değiştirilemez

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string): Promise<{
    success: boolean;
    resetToken?: string;
  }> {
    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      // Don't reveal if user exists or not
      return { success: true };
    }

    // Generate reset token
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    // TODO: Send email with reset link
    // For now, return the token in development
    return {
      success: true,
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    };
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
      isActive: true
    });

    if (!user) {
      throw AppError.unauthorized('Geçersiz veya süresi dolmuş token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password and clear reset token
    user.sifre = hashedPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.resetToken = undefined as any;
    user.resetTokenExpiry = undefined as any;
    await user.save();
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 6) {
      errors.push('Şifre en az 6 karakter olmalıdır');
    }

    if (password.length > 100) {
      errors.push('Şifre 100 karakterden kısa olmalıdır');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Şifre en az bir küçük harf içermelidir');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Şifre en az bir büyük harf içermelidir');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Şifre en az bir rakam içermelidir');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if user exists by ID
   */
  static async userExists(id: string): Promise<boolean> {
    const user = await User.findOne({ id, isActive: true });
    return !!user;
  }

  /**
   * Check if user exists by email
   */
  static async userExistsByEmail(email: string): Promise<boolean> {
    const user = await User.findOne({ email, isActive: true });
    return !!user;
  }

  /**
   * Get user statistics
   */
  static async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    usersByRole: Record<string, number>;
    recentLogins: number;
  }> {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    
    const usersByRole = await User.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$rol', count: { $sum: 1 } } }
    ]);

    const roleStats: Record<string, number> = {};
    usersByRole.forEach(stat => {
      roleStats[stat._id] = stat.count;
    });

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogins = await User.countDocuments({
      lastLogin: { $gte: oneDayAgo },
      isActive: true
    });

    return {
      totalUsers,
      activeUsers,
      usersByRole: roleStats,
      recentLogins
    };
  }
}
