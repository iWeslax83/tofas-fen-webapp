import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../utils/AppError';
import { User } from '../../../models/User';
import { AuthService } from '../services/authService';
import { generateTokenPair, verifyRefreshToken, logoutUser } from '../../../utils/jwt';
import { asyncHandler } from '../../../middleware/errorHandler';
import bcrypt from 'bcryptjs';
import { RefreshToken } from '../../../models/RefreshToken';
import crypto from 'crypto';

/** Extract request metadata for security logging */
function extractMeta(req: Request) {
  return { ip: req.ip, userAgent: req.get('User-Agent') };
}

/**
 * B-H2: Issue a CSRF token cookie alongside any auth-cookie-setting response.
 *
 * The double-submit cookie pattern requires a token that:
 *   1. Is NOT httpOnly (so our JS can read it and echo in X-CSRF-Token).
 *   2. Has SameSite=strict to prevent cross-site attachment.
 *   3. Is unpredictable (crypto.randomBytes).
 *
 * The backend's csrfProtection middleware then requires `X-CSRF-Token` to
 * match `req.cookies.csrfToken` on every state-changing request that carries
 * an auth cookie. Without this issuance step, the double-submit branch never
 * fires and the guard collapses to Origin-allowlist only.
 */
function issueCsrfToken(res: Response, lifetimeMs: number): void {
  const token = crypto.randomBytes(32).toString('hex');
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('csrfToken', token, {
    httpOnly: false, // must be readable by the SPA
    secure: isProduction,
    sameSite: 'strict',
    maxAge: lifetimeMs,
    path: '/',
  });
}

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

    // Read trusted device cookie
    const trustedDeviceToken = req.cookies?.trustedDevice;

    // #19: Pass IP/UA meta to service
    const result = await AuthService.authenticateUser(
      id,
      sifre,
      trustedDeviceToken,
      extractMeta(req),
    );

    // If 2FA is required, return early with 2FA session token in httpOnly cookie
    if (result.requires2FA) {
      const isProduction = process.env.NODE_ENV === 'production';

      // #10: Set 2FA session token as httpOnly cookie (not in response body)
      res.cookie('twoFactorSession', result.twoFactorSessionToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: 5 * 60 * 1000, // 5 minutes
        path: '/',
      });

      res.json({
        success: true,
        requires2FA: true,
        // #14: Return expiry timestamp for frontend countdown
        twoFactorExpiresAt: result.twoFactorExpiresAt,
        user: {
          id: result.user.id,
          adSoyad: result.user.adSoyad,
        },
      });
      return;
    }

    const { user, tokens } = result;

    // Set httpOnly cookies for secure token storage
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

    // Issue CSRF double-submit token (B-H2)
    issueCsrfToken(res, tokens.refreshExpiresIn * 1000);

    res.json({
      success: true,
      message: 'Giriş başarılı',
      user: {
        id: user.id,
        adSoyad: user.adSoyad,
        rol: user.rol,
        email: user.email,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        sinif: user.sinif,
        sube: user.sube,
        oda: user.oda,
        pansiyon: user.pansiyon,
        lastLogin: user.lastLogin,
      },
      expiresIn: tokens.expiresIn,
      refreshExpiresIn: tokens.refreshExpiresIn,
      // Backward compatibility for frontend migration
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
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
      user,
    });
  });

  /**
   * User logout
   */
  static logout = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const accessToken = req.cookies?.accessToken;
    const refreshToken = req.cookies?.refreshToken;

    // Also check body for backward compatibility
    const bodyAccessToken = req.body?.accessToken;
    const bodyRefreshToken = req.body?.refreshToken;

    const finalAccessToken = accessToken || bodyAccessToken;
    const finalRefreshToken = refreshToken || bodyRefreshToken;

    if (finalAccessToken && finalRefreshToken) {
      await logoutUser(finalAccessToken, finalRefreshToken);
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOpts = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict' as const,
      path: '/',
    };

    // Clear all auth cookies
    res.clearCookie('accessToken', cookieOpts);
    res.clearCookie('refreshToken', cookieOpts);
    // #17: Clear trusted device cookie on logout
    res.clearCookie('trustedDevice', cookieOpts);
    // Also clear any lingering 2FA session cookie
    res.clearCookie('twoFactorSession', cookieOpts);
    // B-H2: clear the CSRF double-submit cookie (not httpOnly, so same opts
    // minus httpOnly flag)
    res.clearCookie('csrfToken', {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'strict' as const,
      path: '/',
    });

    res.json({
      success: true,
      message: 'Çıkış başarılı',
    });
  });

  /**
   * Refresh access token with rotation (one-time use refresh tokens)
   */
  static refreshToken = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      throw AppError.validation('Refresh token gereklidir');
    }

    // Verify JWT signature first
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      throw AppError.unauthorized('Geçersiz refresh token');
    }

    const user = await User.findOne({ id: payload.userId, isActive: true });
    if (!user) {
      throw AppError.unauthorized('Kullanıcı bulunamadı');
    }

    if (payload.tokenVersion !== user.tokenVersion) {
      throw AppError.unauthorized('Token versiyonu uyumsuz');
    }

    // Use refresh token rotation with family detection
    const result = await AuthService.rotateRefreshToken(refreshToken, extractMeta(req));
    const tokens = result.tokens;
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

    // Rotate CSRF double-submit token alongside refresh (B-H2)
    issueCsrfToken(res, tokens.refreshExpiresIn * 1000);

    res.json({
      success: true,
      message: 'Token yenilendi',
      expiresIn: tokens.expiresIn,
      refreshExpiresIn: tokens.refreshExpiresIn,
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
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        sinif: user.sinif,
        sube: user.sube,
        oda: user.oda,
        pansiyon: user.pansiyon,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
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

    res.json({
      id: user.id,
      adSoyad: user.adSoyad,
      rol: user.rol,
      email: user.email,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      sinif: user.sinif,
      sube: user.sube,
      oda: user.oda,
      pansiyon: user.pansiyon,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    });
  });

  /**
   * Verify 2FA code
   */
  static verifyTwoFactor = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      // #12: CSRF check — require X-Requested-With header
      if (req.get('X-Requested-With') !== 'XMLHttpRequest') {
        throw AppError.forbidden('Geçersiz istek kaynağı');
      }

      // #10: Read session token from httpOnly cookie (not body)
      const sessionToken = req.cookies?.twoFactorSession;
      const { code, rememberDevice } = req.body;

      if (!sessionToken) {
        throw AppError.unauthorized('2FA oturumu bulunamadı. Lütfen tekrar giriş yapın.');
      }

      if (!code) {
        throw AppError.validation('Doğrulama kodu gereklidir');
      }

      // #19: Pass meta to service
      const result = await AuthService.verifyTwoFactorCode(
        sessionToken,
        code,
        rememberDevice === true,
        extractMeta(req),
      );

      const isProduction = process.env.NODE_ENV === 'production';

      // Set auth cookies
      res.cookie('accessToken', result.tokens.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: result.tokens.expiresIn * 1000,
        path: '/',
      });

      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: result.tokens.refreshExpiresIn * 1000,
        path: '/',
      });

      // Issue CSRF double-submit token after successful 2FA (B-H2)
      issueCsrfToken(res, result.tokens.refreshExpiresIn * 1000);

      // Clear 2FA session cookie after successful verification
      res.clearCookie('twoFactorSession', {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        path: '/',
      });

      // Set trusted device cookie if requested
      if (result.trustedDeviceToken) {
        res.cookie('trustedDevice', result.trustedDeviceToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          path: '/',
        });
      }

      res.json({
        success: true,
        message: 'Giriş başarılı',
        user: result.user,
        expiresIn: result.tokens.expiresIn,
        refreshExpiresIn: result.tokens.refreshExpiresIn,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      });
    },
  );

  /**
   * #13: Resend 2FA code
   */
  static resendTwoFactor = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      // #12: CSRF check
      if (req.get('X-Requested-With') !== 'XMLHttpRequest') {
        throw AppError.forbidden('Geçersiz istek kaynağı');
      }

      // #10: Read session token from httpOnly cookie
      const sessionToken = req.cookies?.twoFactorSession;

      if (!sessionToken) {
        throw AppError.unauthorized('2FA oturumu bulunamadı. Lütfen tekrar giriş yapın.');
      }

      // #19: Pass meta to service
      const result = await AuthService.resendTwoFactorCode(sessionToken, extractMeta(req));

      const isProduction = process.env.NODE_ENV === 'production';

      // Update 2FA session cookie with new token
      res.cookie('twoFactorSession', result.twoFactorSessionToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: 5 * 60 * 1000,
        path: '/',
      });

      res.json({
        success: true,
        message: 'Doğrulama kodu tekrar gönderildi',
        twoFactorExpiresAt: result.twoFactorExpiresAt,
      });
    },
  );

  /**
   * Toggle 2FA setting
   */
  static toggleTwoFactor = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const userId = (req as any).user?.userId;
      const { enabled } = req.body;

      if (!userId) {
        throw AppError.unauthorized('Kullanıcı bilgisi bulunamadı');
      }

      if (typeof enabled !== 'boolean') {
        throw AppError.validation('enabled alanı boolean olmalıdır');
      }

      // #19: Pass meta
      await AuthService.toggleTwoFactor(userId, enabled, extractMeta(req));

      res.json({
        success: true,
        message: enabled
          ? 'İki faktörlü doğrulama aktif edildi'
          : 'İki faktörlü doğrulama deaktif edildi',
      });
    },
  );

  /**
   * Send email verification code
   */
  static sendVerification = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const userId = (req as any).user?.userId;

      if (!userId) {
        throw AppError.unauthorized('Kullanıcı bilgisi bulunamadı');
      }

      await AuthService.sendEmailVerification(userId);

      res.json({
        success: true,
        message: 'Doğrulama kodu e-posta adresinize gönderildi',
      });
    },
  );

  /**
   * Verify email with code
   */
  static verifyEmail = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const userId = (req as any).user?.userId;
    const { code } = req.body;

    if (!userId) {
      throw AppError.unauthorized('Kullanıcı bilgisi bulunamadı');
    }

    if (!code) {
      throw AppError.validation('Doğrulama kodu gereklidir');
    }

    await AuthService.verifyEmailCode(userId, code);

    res.json({
      success: true,
      message: 'E-posta başarıyla doğrulandı',
    });
  });
}
