import { User } from '../../../models/User';
import { AppError } from '../../../utils/AppError';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateTokenPair } from '../../../utils/jwt';
import crypto from 'crypto';
import { sendVerificationEmail, sendTwoFactorEmail } from '../../../mailService';
import { config } from '../../../config/environment';
import { logSecurityEvent, SecurityEvent } from '../../../utils/securityLogger';
import { SecurityAlertService } from '../../../services/SecurityAlertService';
import { trackFailedLogin, resetFailedLogin } from '../../../middleware/captcha';
import { decrypt } from '../../../utils/encryption';
import { RefreshToken } from '../../../models/RefreshToken';
const uuidv4 = () => crypto.randomUUID();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * bcrypt cost factor. Production uses 13 (roughly 2x the CPU cost of 12).
 * Tests/dev use 10 so that test suites don't spend seconds per hash.
 * See B-H3 in CODE_REVIEW_REPORT.md.
 */
const BCRYPT_COST =
  process.env.NODE_ENV === 'production' ? 13 : process.env.NODE_ENV === 'test' ? 4 : 10;

/**
 * B-M3 / B-M8: pre-compute a real bcrypt hash at module load so the
 * "user not found" branch exercises the same bcrypt.compare code path as a
 * legitimate check. The previous "$2a$12$placeholder..." string was not a
 * valid bcrypt hash and bcrypt.compare short-circuited instantly, leaking
 * user-existence via timing. Using a real hash at the same cost factor closes
 * the side channel.
 */
const DUMMY_BCRYPT_HASH = bcrypt.hashSync(
  'this-is-not-a-real-password-it-is-only-used-for-timing-safety',
  BCRYPT_COST,
);

/**
 * Authentication Service
 * Business logic for authentication operations
 */
export class AuthService {
  /**
   * Authenticate user with ID and password
   */
  static async authenticateUser(
    id: string,
    password: string,
    trustedDeviceToken?: string,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<{
    user: any;
    tokens?: any;
    requires2FA?: boolean;
    twoFactorSessionToken?: string;
    twoFactorExpiresAt?: number;
  }> {
    // Find user by ID
    const user = await User.findOne({ id, isActive: true });
    if (!user) {
      // Timing-safe: compare against a REAL bcrypt hash pre-computed at module
      // load. The previous placeholder string was not a valid bcrypt hash, so
      // bcrypt.compare short-circuited immediately and leaked user-existence.
      await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
      throw AppError.unauthorized('Geçersiz kullanıcı adı veya şifre');
    }

    // #8: Check account lockout
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMs = user.lockUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      logSecurityEvent({
        event: SecurityEvent.ACCOUNT_LOCKED,
        userId: user.id,
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      });
      throw AppError.unauthorized(
        `Hesap geçici olarak kilitlendi. ${remainingMin} dakika sonra tekrar deneyin.`,
      );
    }

    // Check password: prefer bcrypt hashed `sifre` if present, fall back to TCKN
    let authenticated = false;

    if (user.sifre) {
      try {
        authenticated = await bcrypt.compare(password, user.sifre);
      } catch (e) {
        authenticated = false;
      }
    }

    // #9: Fallback to TCKN — decrypt and compare, migrate to bcrypt on success
    if (!authenticated && user.tckn) {
      const decryptedTckn = decrypt(user.tckn);
      if (String(decryptedTckn).trim() === String(password).trim()) {
        authenticated = true;
        // Migrate plaintext TCKN to bcrypt hash if user has no custom password
        if (!user.sifre) {
          user.sifre = await bcrypt.hash(password, BCRYPT_COST);
          logSecurityEvent({ event: SecurityEvent.TCKN_MIGRATED, userId: user.id, ip: meta?.ip });
        }
      }
    }

    if (!authenticated) {
      // #8: Increment failed attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
        logSecurityEvent({
          event: SecurityEvent.ACCOUNT_LOCKED,
          userId: user.id,
          ip: meta?.ip,
          userAgent: meta?.userAgent,
          details: { attempts: user.failedLoginAttempts },
        });
      }
      await user.save();
      logSecurityEvent({
        event: SecurityEvent.LOGIN_FAILED,
        userId: user.id,
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      });

      // Track for CAPTCHA and security alerts
      if (meta?.ip) {
        trackFailedLogin(meta.ip);
        SecurityAlertService.trackLoginFailure(id, meta.ip).catch(() => {});
      }

      throw AppError.unauthorized('Geçersiz kullanıcı adı veya şifre');
    }

    // Reset CAPTCHA tracking on successful login
    if (meta?.ip) {
      resetFailedLogin(meta.ip);
    }

    // #8: Reset failed attempts on success
    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined as any;
    }

    // Check if 2FA is required
    const requires2FA =
      (user.rol === 'admin' || user.rol === 'teacher') &&
      user.emailVerified &&
      user.twoFactorEnabled;

    if (requires2FA) {
      // Check trusted device
      if (trustedDeviceToken && user.trustedDevices && user.trustedDevices.length > 0) {
        const hashedToken = crypto.createHash('sha256').update(trustedDeviceToken).digest('hex');
        if (user.trustedDevices.includes(hashedToken)) {
          // Trusted device - skip 2FA, proceed normally
          user.lastLogin = new Date();
          user.loginCount = (user.loginCount || 0) + 1;
          await user.save();
          logSecurityEvent({
            event: SecurityEvent.LOGIN_SUCCESS,
            userId: user.id,
            ip: meta?.ip,
            details: { trustedDevice: true },
          });

          const tokens = generateTokenPair(user.id, user.rol, user.email, user.tokenVersion);
          return {
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
            tokens,
          };
        }
      }

      // #1: Use crypto.randomInt for CSPRNG 2FA code
      const code = crypto.randomInt(100000, 1000000).toString();
      const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // #2: Hash 2FA code before storing in DB
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');
      user.twoFactorCode = codeHash;
      user.twoFactorExpiry = expiry;
      user.twoFactorAttempts = 0;
      await user.save();

      // #11: Handle email sending failure gracefully
      try {
        if (user.email) {
          await sendTwoFactorEmail(user.email, code, user.adSoyad);
          logSecurityEvent({
            event: SecurityEvent.TWO_FACTOR_CODE_SENT,
            userId: user.id,
            ip: meta?.ip,
          });
        }
      } catch (emailErr) {
        // Clear the code since user never received it
        user.twoFactorCode = undefined as any;
        user.twoFactorExpiry = undefined as any;
        await user.save();
        logSecurityEvent({
          event: SecurityEvent.EMAIL_SEND_FAILED,
          userId: user.id,
          ip: meta?.ip,
          details: { type: '2fa', error: (emailErr as Error).message },
        });
        throw AppError.internal('Doğrulama kodu gönderilemedi. Lütfen daha sonra tekrar deneyin.');
      }

      // #10: Generate short-lived 2FA session token (will be set as httpOnly cookie)
      const twoFactorSessionToken = jwt.sign(
        { userId: user.id, purpose: '2fa' },
        config.JWT_SECRET,
        { expiresIn: '5m' },
      );

      return {
        requires2FA: true,
        twoFactorSessionToken,
        twoFactorExpiresAt: expiry.getTime(),
        user: {
          id: user.id,
          adSoyad: user.adSoyad,
        },
      };
    }

    // Update last login
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();
    logSecurityEvent({ event: SecurityEvent.LOGIN_SUCCESS, userId: user.id, ip: meta?.ip });

    // Generate tokens with refresh token rotation
    const tokens = generateTokenPair(user.id, user.rol, user.email, user.tokenVersion);

    // Store refresh token with family ID for rotation detection
    const familyId = uuidv4();
    const tokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    await RefreshToken.create({
      token: tokenHash,
      userId: user.id,
      familyId,
      expiresAt: new Date(Date.now() + tokens.refreshExpiresIn * 1000),
      userAgent: meta?.userAgent,
      ipAddress: meta?.ip,
    });

    return {
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
      tokens,
    };
  }

  /**
   * Verify 2FA code and complete login
   */
  static async verifyTwoFactorCode(
    sessionToken: string,
    code: string,
    requestTrustedDevice: boolean,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<{
    user: any;
    tokens: any;
    trustedDeviceToken?: string;
  }> {
    // Verify 2FA session token
    let payload: any;
    try {
      payload = jwt.verify(sessionToken, config.JWT_SECRET);
    } catch (e) {
      throw AppError.unauthorized('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
    }

    if (payload.purpose !== '2fa') {
      throw AppError.unauthorized('Geçersiz oturum tokeni');
    }

    // #3: Hash the input code for timing-safe comparison
    const inputCodeHash = crypto.createHash('sha256').update(code).digest('hex');

    // #6: Use atomic findOneAndUpdate to prevent race conditions / replay attacks.
    // Only match if twoFactorCode exists, matches, and attempts are under the limit.
    const MAX_2FA_ATTEMPTS = 5;
    const user = await User.findOneAndUpdate(
      {
        id: payload.userId,
        isActive: true,
        twoFactorCode: inputCodeHash,
        twoFactorExpiry: { $gt: new Date() },
        twoFactorAttempts: { $lt: MAX_2FA_ATTEMPTS },
      },
      {
        $unset: { twoFactorCode: 1, twoFactorExpiry: 1 },
        $set: { twoFactorAttempts: 0, lastLogin: new Date() },
        $inc: { loginCount: 1 },
      },
      { new: true },
    );

    if (!user) {
      // B-C3 fix: the previous implementation followed the failing match with a
      // separate non-atomic findOne/save that incremented attempts. Between
      // those two calls, a parallel request could still slip a valid code
      // through because the attempt counter wasn't monotonic under concurrency.
      //
      // Instead, atomically increment attempts in a single operation and act on
      // the post-update state. $inc is document-level atomic in MongoDB, so
      // concurrent failures can never share the same attempt number.
      const updated = await User.findOneAndUpdate(
        { id: payload.userId, isActive: true },
        { $inc: { twoFactorAttempts: 1 } },
        { new: true },
      );

      if (!updated) {
        throw AppError.notFound('Kullanıcı bulunamadı');
      }

      if (updated.twoFactorAttempts >= MAX_2FA_ATTEMPTS) {
        // Atomically clear the code so no further attempts can succeed, even
        // if the caller retries with a fresh session token for the same user.
        await User.updateOne(
          { id: updated.id },
          { $unset: { twoFactorCode: 1, twoFactorExpiry: 1 } },
        );
        logSecurityEvent({
          event: SecurityEvent.TWO_FACTOR_FAILED,
          userId: updated.id,
          ip: meta?.ip,
          details: { reason: 'max_attempts', attempts: updated.twoFactorAttempts },
        });
        throw AppError.unauthorized('Çok fazla başarısız deneme. Lütfen tekrar giriş yapın.');
      }

      if (
        !updated.twoFactorCode ||
        !updated.twoFactorExpiry ||
        updated.twoFactorExpiry < new Date()
      ) {
        logSecurityEvent({
          event: SecurityEvent.TWO_FACTOR_FAILED,
          userId: updated.id,
          ip: meta?.ip,
          details: { reason: 'expired' },
        });
        throw AppError.validation('Doğrulama kodunun süresi dolmuş. Lütfen tekrar giriş yapın.');
      }

      logSecurityEvent({
        event: SecurityEvent.TWO_FACTOR_FAILED,
        userId: updated.id,
        ip: meta?.ip,
        details: { reason: 'wrong_code', attempts: updated.twoFactorAttempts },
      });
      throw AppError.validation('Geçersiz doğrulama kodu');
    }

    logSecurityEvent({ event: SecurityEvent.TWO_FACTOR_SUCCESS, userId: user.id, ip: meta?.ip });

    // Handle trusted device
    let trustedDeviceToken: string | undefined;
    if (requestTrustedDevice) {
      trustedDeviceToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(trustedDeviceToken).digest('hex');
      if (!user.trustedDevices) {
        user.trustedDevices = [];
      }
      // Keep max 5 trusted devices
      if (user.trustedDevices.length >= 5) {
        user.trustedDevices.shift();
      }
      user.trustedDevices.push(hashedToken);
      await user.save();
      logSecurityEvent({
        event: SecurityEvent.TRUSTED_DEVICE_ADDED,
        userId: user.id,
        ip: meta?.ip,
      });
    }

    // Generate tokens
    const tokens = generateTokenPair(user.id, user.rol, user.email, user.tokenVersion);

    return {
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
      tokens,
      trustedDeviceToken,
    };
  }

  /**
   * #13: Resend 2FA code using existing session token
   */
  static async resendTwoFactorCode(
    sessionToken: string,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<{
    twoFactorSessionToken: string;
    twoFactorExpiresAt: number;
  }> {
    let payload: any;
    try {
      payload = jwt.verify(sessionToken, config.JWT_SECRET);
    } catch (e) {
      throw AppError.unauthorized('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
    }

    if (payload.purpose !== '2fa') {
      throw AppError.unauthorized('Geçersiz oturum tokeni');
    }

    const user = await User.findOne({ id: payload.userId, isActive: true });
    if (!user || !user.email) {
      throw AppError.notFound('Kullanıcı bulunamadı');
    }

    // Generate new code
    const code = crypto.randomInt(100000, 1000000).toString();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');

    user.twoFactorCode = codeHash;
    user.twoFactorExpiry = expiry;
    user.twoFactorAttempts = 0;
    await user.save();

    try {
      await sendTwoFactorEmail(user.email, code, user.adSoyad);
      logSecurityEvent({
        event: SecurityEvent.TWO_FACTOR_CODE_RESENT,
        userId: user.id,
        ip: meta?.ip,
      });
    } catch (emailErr) {
      user.twoFactorCode = undefined as any;
      user.twoFactorExpiry = undefined as any;
      await user.save();
      logSecurityEvent({
        event: SecurityEvent.EMAIL_SEND_FAILED,
        userId: user.id,
        ip: meta?.ip,
        details: { type: '2fa_resend' },
      });
      throw AppError.internal('Doğrulama kodu gönderilemedi. Lütfen daha sonra tekrar deneyin.');
    }

    // Issue a fresh 2FA session token
    const newSessionToken = jwt.sign({ userId: user.id, purpose: '2fa' }, config.JWT_SECRET, {
      expiresIn: '5m',
    });

    return {
      twoFactorSessionToken: newSessionToken,
      twoFactorExpiresAt: expiry.getTime(),
    };
  }

  /**
   * Toggle 2FA for admin/teacher users
   */
  static async toggleTwoFactor(
    userId: string,
    enabled: boolean,
    meta?: { ip?: string },
  ): Promise<void> {
    const user = await User.findOne({ id: userId, isActive: true });
    if (!user) {
      throw AppError.notFound('Kullanıcı bulunamadı');
    }

    if (user.rol !== 'admin' && user.rol !== 'teacher') {
      throw AppError.forbidden(
        'İki faktörlü doğrulama sadece yönetici ve öğretmenler için kullanılabilir',
      );
    }

    if (enabled && !user.emailVerified) {
      throw AppError.validation(
        'İki faktörlü doğrulamayı açmak için e-posta adresinizi doğrulamanız gerekiyor',
      );
    }

    user.twoFactorEnabled = enabled;

    // Clear trusted devices when disabling 2FA
    if (!enabled) {
      user.trustedDevices = [];
    }

    await user.save();
    logSecurityEvent({
      event: enabled ? SecurityEvent.TWO_FACTOR_ENABLED : SecurityEvent.TWO_FACTOR_DISABLED,
      userId: user.id,
      ip: meta?.ip,
    });
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
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      sinif: user.sinif,
      sube: user.sube,
      oda: user.oda,
      pansiyon: user.pansiyon,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    };
  }

  /**
   * Send email verification code
   */
  static async sendEmailVerification(userId: string): Promise<void> {
    const user = await User.findOne({ id: userId, isActive: true });
    if (!user) {
      throw AppError.notFound('Kullanıcı bulunamadı');
    }

    if (!user.email) {
      throw AppError.validation('Kullanıcının kayıtlı e-posta adresi yok');
    }

    if (user.emailVerified) {
      throw AppError.validation('E-posta zaten doğrulanmış');
    }

    // Generate 6-digit code
    const code = crypto.randomInt(100000, 1000000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Hash verification code before storing (same pattern as 2FA codes)
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    user.emailVerificationCode = codeHash;
    user.emailVerificationExpiry = expiry;
    await user.save();

    await sendVerificationEmail(user.email, code, user.adSoyad);
  }

  /**
   * Verify email with code
   */
  static async verifyEmailCode(userId: string, code: string): Promise<void> {
    const user = await User.findOne({ id: userId, isActive: true });
    if (!user) {
      throw AppError.notFound('Kullanıcı bulunamadı');
    }

    if (user.emailVerified) {
      throw AppError.validation('E-posta zaten doğrulanmış');
    }

    if (!user.emailVerificationCode || !user.emailVerificationExpiry) {
      throw AppError.validation('Doğrulama kodu bulunamadı. Lütfen yeni kod isteyin.');
    }

    if (user.emailVerificationExpiry < new Date()) {
      user.emailVerificationCode = undefined as any;
      user.emailVerificationExpiry = undefined as any;
      await user.save();
      throw AppError.validation('Doğrulama kodunun süresi dolmuş. Lütfen yeni kod isteyin.');
    }

    // Hash the input code and compare with stored hash
    const inputCodeHash = crypto.createHash('sha256').update(code).digest('hex');
    if (user.emailVerificationCode !== inputCodeHash) {
      throw AppError.validation('Geçersiz doğrulama kodu');
    }

    user.emailVerified = true;
    user.emailVerificationCode = undefined as any;
    user.emailVerificationExpiry = undefined as any;
    await user.save();
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!password || password.length === 0) {
      errors.push('Şifre boş olamaz');
    }

    return {
      isValid: errors.length === 0,
      errors,
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
      { $group: { _id: '$rol', count: { $sum: 1 } } },
    ]);

    const roleStats: Record<string, number> = {};
    usersByRole.forEach((stat) => {
      roleStats[stat._id] = stat.count;
    });

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogins = await User.countDocuments({
      lastLogin: { $gte: oneDayAgo },
      isActive: true,
    });

    return {
      totalUsers,
      activeUsers,
      usersByRole: roleStats,
      recentLogins,
    };
  }

  /**
   * Rotate a refresh token (use once, issue new one in same family).
   * If a used token is presented (replay attack), invalidate the entire family.
   */
  static async rotateRefreshToken(
    oldRefreshToken: string,
    meta?: { ip?: string; userAgent?: string },
  ): Promise<{
    tokens: any;
    user: any;
  }> {
    const tokenHash = crypto.createHash('sha256').update(oldRefreshToken).digest('hex');
    const storedToken = await RefreshToken.findOne({ token: tokenHash });

    if (!storedToken) {
      throw AppError.unauthorized('Geçersiz refresh token');
    }

    // Check if token was already used (replay attack!)
    if (storedToken.isUsed) {
      // SECURITY: Invalidate entire token family
      await RefreshToken.updateMany(
        { familyId: storedToken.familyId },
        { $set: { isRevoked: true } },
      );

      SecurityAlertService.trackSuspiciousTokenUsage(
        storedToken.userId,
        'Refresh token replay attack detected - token family invalidated',
        meta?.ip,
      );

      // Increment user's tokenVersion to invalidate all JWTs
      await User.findOneAndUpdate({ id: storedToken.userId }, { $inc: { tokenVersion: 1 } });

      logSecurityEvent({
        event: SecurityEvent.TOKEN_REUSE_DETECTED || ('TOKEN_REUSE_DETECTED' as any),
        userId: storedToken.userId,
        ip: meta?.ip,
        details: { familyId: storedToken.familyId },
      });

      throw AppError.unauthorized('Güvenlik ihlali tespit edildi. Lütfen tekrar giriş yapın.');
    }

    // Check if token is revoked or expired
    if (storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      throw AppError.unauthorized('Refresh token süresi dolmuş veya iptal edilmiş');
    }

    // Mark old token as used
    storedToken.isUsed = true;
    storedToken.usedAt = new Date();

    const user = await User.findOne({ id: storedToken.userId, isActive: true });
    if (!user) {
      throw AppError.unauthorized('Kullanıcı bulunamadı');
    }

    // Generate new token pair
    const newTokens = generateTokenPair(user.id, user.rol, user.email, user.tokenVersion);

    // Store new refresh token in the same family
    const newTokenHash = crypto.createHash('sha256').update(newTokens.refreshToken).digest('hex');
    storedToken.replacedByToken = newTokenHash;
    await storedToken.save();

    await RefreshToken.create({
      token: newTokenHash,
      userId: user.id,
      familyId: storedToken.familyId,
      expiresAt: new Date(Date.now() + newTokens.refreshExpiresIn * 1000),
      userAgent: meta?.userAgent,
      ipAddress: meta?.ip,
    });

    return {
      tokens: newTokens,
      user: {
        id: user.id,
        adSoyad: user.adSoyad,
        rol: user.rol,
      },
    };
  }

  /**
   * Unlock a locked user account
   */
  static async unlockAccount(userId: string, unlockedBy: string): Promise<void> {
    const user = await User.findOne({ id: userId });
    if (!user) {
      throw new Error('Kullanıcı bulunamadı');
    }

    const isCurrentlyLocked = user.isLocked || (user.lockUntil && user.lockUntil > new Date());
    if (!isCurrentlyLocked && user.failedLoginAttempts === 0) {
      throw new Error('Bu hesap kilitli değil');
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = undefined as any;
    user.isLocked = false;
    user.lockReason = undefined as any;
    await user.save();

    logSecurityEvent({
      event: SecurityEvent.ACCOUNT_UNLOCKED,
      userId,
      details: {
        unlockedBy,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Register a new user
   */
  static async registerUser(userData: {
    id: string;
    adSoyad: string;
    rol: string;
    sifre: string;
    email?: string;
  }): Promise<any> {
    // Check if user already exists
    const existingUser = await User.findOne({ id: userData.id });
    if (existingUser) {
      throw AppError.conflict('Bu kullanıcı adı zaten kullanılıyor');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.sifre, BCRYPT_COST);

    // Create new user
    const newUser = new User({
      ...userData,
      sifre: hashedPassword,
      isActive: true,
      tokenVersion: 0,
    });

    await newUser.save();

    return {
      id: newUser.id,
      adSoyad: newUser.adSoyad,
      rol: newUser.rol,
      email: newUser.email,
    };
  }
}
