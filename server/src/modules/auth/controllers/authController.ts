import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../utils/AppError';
import { User } from '../../../models/User';
import { AuthService } from '../services/authService';
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

    if (typeof id !== 'string' || typeof sifre !== 'string') {
      throw AppError.validation('ID ve şifre string olmalıdır');
    }

    // Authenticate user
    const { user, tokens } = await AuthService.authenticateUser(id, sifre);

    // Set httpOnly cookies for secure token storage
    // ⚠️ GÜVENLİK: localStorage yerine httpOnly cookies kullanılıyor (XSS koruması)
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true, // JavaScript'ten erişilemez (XSS koruması)
      secure: isProduction, // HTTPS'te çalışır
      sameSite: 'strict', // CSRF koruması
      maxAge: tokens.expiresIn * 1000, // 15 minutes in milliseconds
      path: '/',
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: tokens.refreshExpiresIn * 1000, // 7 days in milliseconds
      path: '/',
    });

    // Return user data (tokens are in httpOnly cookies, not in response body)
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
      // Token expiry info for frontend (actual tokens in httpOnly cookies)
      expiresIn: tokens.expiresIn,
      refreshExpiresIn: tokens.refreshExpiresIn,
      // Backward compatibility for frontend migration
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  });

  /**
   * User registration
   */
  static register = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { id, adSoyad, rol, sifre, email } = req.body;

    if (!id || !adSoyad || !rol || !sifre) {
      throw AppError.validation('Tüm alanlar (ID, Ad Soyad, Rol, Şifre) gereklidir');
    }

    const user = await AuthService.registerUser({ id, adSoyad, rol, sifre, email });

    res.status(201).json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu',
      user
    });
  });

  /**
   * User logout
   */
  static logout = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    // Get tokens from cookies (httpOnly cookies)
    const accessToken = req.cookies?.accessToken;
    const refreshToken = req.cookies?.refreshToken;

    // Also check body for backward compatibility during migration
    const bodyAccessToken = req.body?.accessToken;
    const bodyRefreshToken = req.body?.refreshToken;

    const finalAccessToken = accessToken || bodyAccessToken;
    const finalRefreshToken = refreshToken || bodyRefreshToken;

    if (finalAccessToken && finalRefreshToken) {
      await logoutUser(finalAccessToken, finalRefreshToken);
    }

    // Clear httpOnly cookies
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    res.json({
      success: true,
      message: 'Çıkış başarılı'
    });
  });

  /**
   * Refresh access token
   */
  static refreshToken = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    // Get refresh token from cookie (preferred) or body (backward compatibility)
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

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

    // Set new httpOnly cookies
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: tokens.expiresIn * 1000,
      path: '/',
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: tokens.refreshExpiresIn * 1000,
      path: '/',
    });

    res.json({
      success: true,
      message: 'Token yenilendi',
      expiresIn: tokens.expiresIn,
      refreshExpiresIn: tokens.refreshExpiresIn
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

  /**
   * Request password reset
   */
  static forgotPassword = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { email } = req.body;
    if (!email) {
      throw AppError.validation('Email adresi gereklidir');
    }

    const result = await AuthService.requestPasswordReset(email);

    res.json({
      success: true,
      message: 'Şifre sıfırlama linki e-posta adresinize gönderildi',
      // Token included in development/test for automated testing
      resetToken: result.resetToken
    });
  });

  /**
   * Reset password with token
   */
  static resetPassword = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      throw AppError.validation('Token ve yeni şifre gereklidir');
    }

    await AuthService.resetPassword(token, newPassword);

    res.json({
      success: true,
      message: 'Şifre başarıyla güncellendi'
    });
  });

  // Şifre değiştirme fonksiyonu kaldırıldı - artık TCKN kullanılıyor ve değiştirilemez

}
