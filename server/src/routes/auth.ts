/**
 * @deprecated This file is deprecated. Use server/src/modules/auth/routes/authRoutes.ts instead.
 * This file will be removed in a future version.
 * 
 * DEPRECATED: This legacy auth route file is kept for backward compatibility only.
 * All new authentication logic should use the modular auth system in server/src/modules/auth/
 */
// src/routes/auth.ts
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { User } from "../models";
import { sendMail } from "../mailService";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt";
import logger from "../utils/logger";

const router = express.Router();

import { config } from '../config/environment';

// Rate limiting for login attempts (configurable, skip successful logins)
const loginLimiter = rateLimit({
  windowMs: config.AUTH_RATE_LIMIT_WINDOW_MS,
  max: config.AUTH_RATE_LIMIT_MAX,
  skipSuccessfulRequests: true,
  message: { error: 'Çok fazla giriş denemesi. Lütfen biraz sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// LOGIN with JWT
router.post('/login', (process.env.NODE_ENV === 'production' ? loginLimiter : (_req, _res, next) => next()), async (req, res) => {
  const startTime = Date.now();
  try {
    const { id, sifre } = req.body;

    // Input validation - boş, null, undefined kontrolü
    if (!id || !sifre) {
      res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
      return;
    }

    // Input validation - whitespace ve uzunluk kontrolü
    if (typeof id !== 'string' || typeof sifre !== 'string') {
      res.status(400).json({ error: 'Kullanıcı adı ve şifre string olmalı' });
      return;
    }

    // Whitespace kontrolü
    if (id.trim() === '' || sifre.trim() === '') {
      res.status(400).json({ error: 'Kullanıcı adı ve şifre boş olamaz' });
      return;
    }

    // Uzunluk kontrolü
    if (id.length > 100 || sifre.length > 100) {
      res.status(400).json({ error: 'Kullanıcı adı ve şifre çok uzun' });
      return;
    }

    // Trim whitespace
    const trimmedId = id.trim();
    const trimmedSifre = sifre.trim();

    const user = await User.findOne({ id: trimmedId });
    if (!user) {
      res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
      return;
    }

    try {
      const isValidPassword = await bcrypt.compare(trimmedSifre, user.sifre || '');

      if (!isValidPassword) {
        res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
        return;
      }
    } catch (bcryptError) {
      logger.error('Login bcrypt error', { error: bcryptError, userId: trimmedId });
      res.status(500).json({ error: 'Şifre karşılaştırma hatası' });
      return;
    }

    // Increment token version to invalidate old tokens
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // Generate JWT tokens (after incrementing tokenVersion so refresh token matches)
    const accessToken = generateAccessToken({
      userId: user.id,
      role: user.rol || '',
      email: user.email
    });
    const refreshToken = generateRefreshToken({
      userId: user.id,
      tokenVersion: user.tokenVersion
    });

    const response = {
      user: {
        id: user.id,
        adSoyad: user.adSoyad,
        rol: user.rol,
        sinif: user.sinif,
        sube: user.sube,
        oda: user.oda,
        pansiyon: user.pansiyon,
        email: user.email
      },
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes
      refreshExpiresIn: 604800 // 7 days
    };

    // For parents, fetch children's class levels
    if (user.rol === 'parent' && user.childId && user.childId.length > 0) {
      const children = await User.find({ id: { $in: user.childId } }).select('sinif sube adSoyad').lean();
      const childrenSiniflar = children
        .map(child => ({
          sinif: child.sinif,
          sube: child.sube,
          adSoyad: child.adSoyad
        }))
        .filter((child) => child.sinif); // Remove entries without sinif
      (response.user as any).childrenSiniflar = childrenSiniflar;
      (response.user as any).childId = user.childId;
    }

    const endTime = Date.now();
    logger.info('User logged in successfully', {
      userId: user.id,
      role: user.rol,
      duration: endTime - startTime
    });

    res.json(response);
  } catch (error) {
    logger.error('Login error', { error });
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// REFRESH TOKEN
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const user = await User.findOne({ id: decoded.userId });
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Check if token version matches (for logout invalidation)
    if (user.tokenVersion !== decoded.tokenVersion) {
      res.status(401).json({ error: 'Token invalidated' });
      return;
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken({
      userId: user.id,
      role: user.rol || '',
      email: user.email
    });
    const newRefreshToken = generateRefreshToken({
      userId: user.id,
      tokenVersion: user.tokenVersion || 0
    });

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900,
      refreshExpiresIn: 2419200
    });
  } catch (error) {
    logger.error('Token refresh error', { error });
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// LOGOUT
router.post('/logout', async (req, res) => {
  try {
    // JWT tabanlı kimlik doğrulama için token sürümünü artırarak mevcut token'ları geçersiz kıl
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          logger.error('JWT_SECRET environment variable is not set');
          // Still return success for logout - user session should be cleared regardless
          res.json({ success: true, message: 'Başarıyla çıkış yapıldı' });
          return;
        }
        const decoded = jwt.verify(token, jwtSecret) as any;
        const userId = decoded.userId;

        if (userId) {
          const user = await User.findOne({ id: userId });
          if (user) {
            user.tokenVersion = (user.tokenVersion || 0) + 1;
            await user.save();
          }
        }
      } catch (error) {
        logger.warn('JWT verify error during logout', { error });
        // Token geçersiz olsa bile işleme devam et
      }
    }

    res.json({ success: true, message: 'Başarıyla çıkış yapıldı' });
  } catch (error) {
    logger.error('Logout error', { error });
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ME - Only JWT authentication
router.get('/me', async (req, res) => {
  try {
    let userId = null;

    // Check for JWT token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        if (!process.env.JWT_SECRET) {
          throw new Error('JWT_SECRET environment variable is not set');
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
        userId = decoded.userId;
      } catch (error) {
        logger.warn('JWT verify error in /me endpoint', { error });
        res.status(401).json({ error: 'Invalid token' });
        return;
      }
    }

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await User.findOne({ id: userId });
    if (!user) {
      logger.warn('User not found in /me endpoint', { userId });
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const response: any = {
      id: user.id,
      adSoyad: user.adSoyad,
      rol: user.rol,
      sinif: user.sinif,
      sube: user.sube,
      oda: user.oda,
      pansiyon: user.pansiyon,
      email: user.email
    };

    // For parents, fetch children's class levels
    if (user.rol === 'parent' && user.childId && user.childId.length > 0) {
      const children = await User.find({ id: { $in: user.childId } }).select('sinif sube adSoyad').lean();
      const childrenSiniflar = children
        .map(child => ({
          sinif: child.sinif,
          sube: child.sube,
          adSoyad: child.adSoyad
        }))
        .filter((child) => child.sinif); // Remove entries without sinif
      response.childrenSiniflar = childrenSiniflar;
      response.childId = user.childId;
    }

    res.json(response);
  } catch (error) {
    logger.error('ME endpoint error', { error });
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email gerekli' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ error: 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı' });
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 1209600000); // 1 Ay

    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    // Send reset email
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    const html = `
      <h2>Şifre Sıfırlama</h2>
      <p>Şifrenizi sıfırlamak için aşağıdaki linke tıklayın:</p>
      <a href="${resetLink}">Şifremi Sıfırla</a>
      <p>Bu link 1 saat geçerlidir.</p>
    `;

    await sendMail(email, "Şifre Sıfırlama", html, true);
    res.json({ success: true, message: 'Şifre sıfırlama linki gönderildi' });
  } catch (error) {
    logger.error('Forgot password error', { error });
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// RESET PASSWORD
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ error: 'Token ve yeni şifre gerekli' });
      return;
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }
    });

    if (!user) {
      res.status(400).json({ error: 'Geçersiz veya süresi dolmuş token' });
      return;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, process.env.NODE_ENV === 'production' ? 10 : 8);
    user.sifre = hashedPassword;
    user.resetToken = undefined as any;
    user.resetTokenExpiry = undefined as any;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    res.json({ success: true, message: 'Şifre başarıyla güncellendi' });
  } catch (error) {
    logger.error('Reset password error', { error });
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { id, adSoyad, rol, sifre } = req.body;

    if (!id || !adSoyad || !rol || !sifre) {
      res.status(400).json({ error: 'Tüm alanlar gerekli' });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ id });
    if (existingUser) {
      res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(sifre, process.env.NODE_ENV === 'production' ? 10 : 8);

    // Create new user
    const newUser = new User({
      id,
      adSoyad,
      rol,
      sifre: hashedPassword
    });

    await newUser.save();
    res.status(201).json({ success: true, message: 'Kullanıcı başarıyla oluşturuldu' });
  } catch (error) {
    logger.error('Register error', { error });
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

export default router;
