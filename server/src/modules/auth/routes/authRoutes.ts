import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { AuthController } from '../controllers/authController';
import { AuthService, BCRYPT_COST } from '../services/authService';
import { authenticateJWT, authorizeRoles } from '../../../utils/jwt';
import { authLimiter } from '../../../middleware/rateLimiter';
import { captchaMiddleware } from '../../../middleware/captcha';
import { validateUnlockAccount } from '../validators/authValidators';
import { User } from '../../../models/User';
import logger from '../../../utils/logger';
import { logSecurityEvent, SecurityEvent } from '../../../utils/securityLogger';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Kimlik doğrulama işlemleri
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Kullanıcı girişi
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             id: "2024001"
 *             sifre: "password123"
 *     responses:
 *       200:
 *         description: Giriş başarılı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       429:
 *         description: Çok fazla giriş denemesi
 */
router.post('/login', authLimiter, captchaMiddleware, AuthController.login);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Yeni kullanıcı kaydı
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id, adSoyad, rol, sifre]
 *             properties:
 *               id:
 *                 type: string
 *               adSoyad:
 *                 type: string
 *               rol:
 *                 type: string
 *               sifre:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       201:
 *         description: Kullanıcı başarıyla oluşturuldu
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Kullanıcı zaten var
 */
// #21: Register requires admin authentication
router.post('/register', authenticateJWT, authorizeRoles(['admin']), AuthController.register);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Token yenileme
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token
 *     responses:
 *       200:
 *         description: Token başarıyla yenilendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/refresh-token', authLimiter, AuthController.refreshToken);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Kullanıcı çıkışı
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accessToken:
 *                 type: string
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Çıkış başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/logout', authenticateJWT, AuthController.logout);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Kullanıcı profili
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil bilgileri
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/profile', authenticateJWT, AuthController.getProfile);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Kullanıcı bilgileri (legacy endpoint)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kullanıcı bilgileri
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 adSoyad:
 *                   type: string
 *                 rol:
 *                   type: string
 *                 email:
 *                   type: string
 *                 sinif:
 *                   type: string
 *                 sube:
 *                   type: string
 *                 oda:
 *                   type: string
 *                 pansiyon:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/me', authenticateJWT, AuthController.getMe);

/**
 * @swagger
 * /api/auth/send-verification:
 *   post:
 *     summary: E-posta doğrulama kodu gönder
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Doğrulama kodu gönderildi
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
// #22: Rate limit on send-verification
router.post('/send-verification', authenticateJWT, authLimiter, AuthController.sendVerification);

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: E-posta doğrulama kodunu onayla
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: E-posta doğrulandı
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/verify-email', authenticateJWT, AuthController.verifyEmail);

// 2FA routes
router.post('/verify-2fa', authLimiter, AuthController.verifyTwoFactor);
// #13: Resend 2FA code route
router.post('/resend-2fa', authLimiter, AuthController.resendTwoFactor);
router.post('/toggle-2fa', authenticateJWT, AuthController.toggleTwoFactor);

// Account unlock route (admin or parent of the target user)
router.post(
  '/unlock-account',
  authLimiter,
  authenticateJWT,
  validateUnlockAccount,
  async (req: Request, res: Response) => {
    try {
      const authUser = (req as any).user;
      const { userId } = req.body;

      if (authUser.role !== 'admin') {
        const parentUser = await User.findOne({ id: authUser.userId });
        if (!parentUser || authUser.role !== 'parent' || !parentUser.childId?.includes(userId)) {
          return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
        }
      }

      await AuthService.unlockAccount(userId, authUser.userId);
      res.json({ success: true, message: 'Hesap kilidi açıldı' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Hesap kilidi açılamadı';
      res.status(400).json({ error: message });
    }
  },
);

// ---------------------------------------------------------------------------
// B-H4: password reset via emailed one-time token
// ---------------------------------------------------------------------------
//
// Flow:
//   1. POST /api/auth/forgot-password { id | email }
//      Server generates a token, stores its SHA-256 hash with a 1h expiry,
//      and emails the reset URL. Response is ALWAYS 200 regardless of
//      whether the account exists — this prevents user-enumeration via
//      the error message.
//
//   2. POST /api/auth/reset-password { id, token, newPassword }
//      Server re-hashes the incoming token, looks up the user by
//      (id, passwordResetTokenHash, passwordResetExpiry > now), bcrypt-
//      hashes the new password, clears the reset fields, and bumps
//      tokenVersion so any live sessions elsewhere are invalidated.
//
// Both endpoints are rate-limited via authLimiter and bypass CSRF via the
// allowlist in middleware/auth.ts.

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

router.post('/forgot-password', authLimiter, async (req: Request, res: Response) => {
  try {
    const { id, email } = req.body ?? {};
    if (!id && !email) {
      res.status(400).json({ error: 'id veya email gerekli' });
      return;
    }

    // Lookup by id first, then email. Use .lean() to skip any post hooks.
    const user = id
      ? await User.findOne({ id, isActive: true })
      : await User.findOne({ email, isActive: true });

    // ALWAYS respond with 200 — even if user is missing — so an attacker
    // can't probe for valid IDs/emails. The email only goes out if the
    // user actually exists.
    if (!user || !user.email) {
      res.json({
        success: true,
        message:
          'Eğer bu bilgilere ait bir hesap varsa, şifre sıfırlama bağlantısı e-posta adresine gönderildi.',
      });
      return;
    }

    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    user.passwordResetTokenHash = tokenHash;
    user.passwordResetExpiry = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl =
      `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}` +
      `&id=${encodeURIComponent(user.id)}`;

    // Lazy-import to avoid a circular dep with mailService -> logger.
    const { sendMail } = await import('../../../mailService');
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2>Şifre Sıfırlama</h2>
        <p>Sayın ${user.adSoyad},</p>
        <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın. Bağlantı 1 saat geçerlidir.</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;">Şifremi Sıfırla</a>
        </p>
        <p style="color:#64748b;font-size:13px;">Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz.</p>
      </div>
    `;

    try {
      await sendMail(user.email, 'Şifre Sıfırlama - Tofas Fen Lisesi', html);
    } catch (emailErr) {
      // Don't leak email-send failures to the client — that would still
      // enable enumeration via timing/error differences.
      logger.error('Password reset email send failed', {
        userId: user.id,
        error: emailErr instanceof Error ? emailErr.message : String(emailErr),
      });
    }

    logSecurityEvent({
      event: SecurityEvent.PASSWORD_RESET_REQUESTED,
      userId: user.id,
      ip: req.ip,
      userAgent: req.get('user-agent') || undefined,
    });

    res.json({
      success: true,
      message:
        'Eğer bu bilgilere ait bir hesap varsa, şifre sıfırlama bağlantısı e-posta adresine gönderildi.',
    });
  } catch (error) {
    logger.error('forgot-password failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'İşlem gerçekleştirilemedi' });
  }
});

router.post('/reset-password', authLimiter, async (req: Request, res: Response) => {
  try {
    const { id, token, newPassword } = req.body ?? {};

    if (!id || !token || !newPassword) {
      res.status(400).json({ error: 'id, token ve newPassword gerekli' });
      return;
    }

    // Basic strength check — the full PasswordPolicy validator lives in
    // client/src/utils/security.ts but this is the backend fail-safe.
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      res.status(400).json({ error: 'Şifre en az 8 karakter olmalıdır' });
      return;
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Atomic lookup: id + token hash + unexpired. Any mismatch -> 400.
    const user = await User.findOne({
      id,
      isActive: true,
      passwordResetTokenHash: tokenHash,
      passwordResetExpiry: { $gt: new Date() },
    });

    if (!user) {
      // Intentionally vague — don't tell the caller whether it was the
      // token, the id, or the expiry that failed.
      res.status(400).json({ error: 'Geçersiz veya süresi dolmuş sıfırlama bağlantısı' });
      return;
    }

    user.sifre = await bcrypt.hash(newPassword, BCRYPT_COST);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiry = undefined;
    // Invalidate any existing sessions for this user.
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    // Clear any failed login counters from before the reset.
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.isLocked = false;
    await user.save();

    logSecurityEvent({
      event: SecurityEvent.PASSWORD_RESET_SUCCESS,
      userId: user.id,
      ip: req.ip,
      userAgent: req.get('user-agent') || undefined,
    });

    res.json({ success: true, message: 'Şifreniz güncellendi. Lütfen giriş yapın.' });
  } catch (error) {
    logger.error('reset-password failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'İşlem gerçekleştirilemedi' });
  }
});

export default router;
