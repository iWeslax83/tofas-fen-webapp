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

    // Check password - only bcrypt hashed passwords allowed
    // TCKN plaintext authentication removed for security
    if (!user.sifre) {
      throw AppError.unauthorized('Kullanıcı şifresi tanımlanmamış');
    }

    // Verify password using bcrypt
    const isValidPassword = await bcrypt.compare(sifre, user.sifre);
    if (!isValidPassword) {
      throw AppError.unauthorized('Geçersiz kullanıcı adı veya şifre');
    }

    // Update last login
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    // Generate tokens
    const tokens = generateTokenPair(user.id, user.rol, user.email, user.tokenVersion);

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
      refreshExpiresIn: tokens.refreshExpiresIn
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

  // Şifre değiştirme fonksiyonu kaldırıldı - artık TCKN kullanılıyor ve değiştirilemez

}
