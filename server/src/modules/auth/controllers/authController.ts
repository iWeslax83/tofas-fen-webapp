import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../utils/AppError';
import { User } from '../../../models/User';
import { generateTokenPair, verifyRefreshToken, logoutUser } from '../../../utils/jwt';
import { asyncHandler } from '../../../middleware/errorHandler';
import bcrypt from 'bcryptjs';

/**
 * Authentication Controller
 * Handles all authentication-related operations
 */
export class AuthController {
  /**
   * User login
   */
  static login = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { id, sifre } = req.body;

    // Validate input
    if (!id || !sifre) {
      throw AppError.validation('ID ve şifre gereklidir');
    }

    // Find user by ID
    const user = await User.findOne({ id, isActive: true });
    if (!user) {
      throw AppError.unauthorized('Geçersiz kullanıcı adı veya şifre');
    }

    // Check password - artık TCKN kullanılıyor
    // Önce TCKN kontrolü yap, yoksa eski şifre sistemine geri dön (geriye dönük uyumluluk)
    if (user.tckn) {
      // TCKN ile giriş
      if (user.tckn !== sifre) {
        throw AppError.unauthorized('Geçersiz kullanıcı adı veya şifre');
      }
    } else if (user.sifre) {
      // Eski sistem: bcrypt ile şifre kontrolü (geriye dönük uyumluluk)
      if (!(await bcrypt.compare(sifre, user.sifre))) {
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

    // Return user data and tokens
    res.json({
      success: true,
      message: 'Giriş başarılı',
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
      ...tokens
    });
  });

  /**
   * User logout
   */
  static logout = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { accessToken, refreshToken } = req.body;

    if (accessToken && refreshToken) {
      await logoutUser(accessToken, refreshToken);
    }

    res.json({
      success: true,
      message: 'Çıkış başarılı'
    });
  });

  /**
   * Refresh access token
   */
  static refreshToken = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw AppError.validation('Refresh token gereklidir');
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      throw AppError.unauthorized('Geçersiz refresh token');
    }

    // Find user
    const user = await User.findOne({ id: payload.userId, isActive: true });
    if (!user) {
      throw AppError.unauthorized('Kullanıcı bulunamadı');
    }

    // Check token version
    if (payload.tokenVersion !== user.tokenVersion) {
      throw AppError.unauthorized('Token versiyonu uyumsuz');
    }

    // Generate new tokens
    const tokens = generateTokenPair(user.id, user.rol, user.email, user.tokenVersion);

    res.json({
      success: true,
      message: 'Token yenilendi',
      ...tokens
    });
  });

  /**
   * Get current user profile
   */
  static getProfile = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      throw AppError.unauthorized('Kullanıcı bilgisi bulunamadı');
    }

    const user = await User.findOne({ id: userId, isActive: true });
    if (!user) {
      throw AppError.notFound('Kullanıcı bulunamadı');
    }

    res.json({
      success: true,
      user: {
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
      }
    });
  });

  /**
   * Get current user info (legacy /me endpoint)
   */
  static getMe = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      throw AppError.unauthorized('Kullanıcı bilgisi bulunamadı');
    }

    const user = await User.findOne({ id: userId, isActive: true });
    if (!user) {
      throw AppError.notFound('Kullanıcı bulunamadı');
    }

    // Return user data directly (not wrapped in success object)
    res.json({
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
    });
  });

  // Şifre değiştirme fonksiyonu kaldırıldı - artık TCKN kullanılıyor ve değiştirilemez

}
