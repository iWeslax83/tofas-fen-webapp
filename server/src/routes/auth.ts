// src/routes/auth.ts
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { User } from "../models";
import { sendMail } from "../mailService";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt";

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

    console.log(`[LOGIN] Starting login for user: ${trimmedId}`);
    
    const user = await User.findOne({ id: trimmedId });
    console.log(`[LOGIN] Database query result:`, user ? 'User found' : 'User not found');
    if (!user) {
      console.log(`[LOGIN] User not found in database, sending 401`);
      res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
      return;
    }

    console.log(`[LOGIN] User found, checking password...`);
    console.log(`[LOGIN] Input password: ${trimmedSifre}`);
    console.log(`[LOGIN] Stored password hash: ${user.sifre ? 'EXISTS' : 'MISSING'}`);
    
    try {
      console.log(`[LOGIN] Checking password with bcrypt...`);
      const isValidPassword = await bcrypt.compare(trimmedSifre, user.sifre || '');
      console.log(`[LOGIN] Password comparison result: ${isValidPassword}`);
      
      if (!isValidPassword) {
        console.log(`[LOGIN] Password invalid, sending 401`);
        res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
        return;
      }
    } catch (bcryptError) {
      console.error(`[LOGIN] Bcrypt error:`, bcryptError);
      res.status(500).json({ error: 'Şifre karşılaştırma hatası' });
      return;
    }

    console.log(`[LOGIN] Password valid, generating tokens...`);

    // Generate JWT tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      role: user.rol || '',
      email: user.email
    });
    const refreshToken = generateRefreshToken({ 
      userId: user.id, 
      tokenVersion: user.tokenVersion || 0
    });

    // JWT tabanlı kimlik doğrulama kullanıldığı için session yönetimi kaldırıldı

    // Increment token version to invalidate old tokens
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

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

    const endTime = Date.now();
    console.log(`[LOGIN] Kullanıcı: ${user.id} | Rol: ${user.rol} | Zaman: ${new Date().toISOString()} | Süre: ${endTime - startTime}ms`);
    
    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
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
    console.error('Token refresh error:', error);
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
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'M8taRuNgdgKCpGdJJQQdaW78') as any;
        const userId = decoded.userId;
        
        if (userId) {
          const user = await User.findOne({ id: userId });
          if (user) {
            user.tokenVersion = (user.tokenVersion || 0) + 1;
            await user.save();
          }
        }
      } catch (error) {
        console.error('JWT verify error during logout:', error);
        // Token geçersiz olsa bile işleme devam et
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ME - Only JWT authentication
router.get('/me', async (req, res) => {
  console.log('🔍 /me endpoint called');
  console.log('Headers:', req.headers);
  try {
    let userId = null;
    
    // Check for JWT token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'M8taRuNgdgKCpGdJJQQdaW78') as any;
        userId = decoded.userId;
      } catch (error) {
        console.error('JWT verify error:', error);
        res.status(401).json({ error: 'Invalid token' });
        return;
      }
    }

    if (!userId) {
      console.log('❌ No userId found');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await User.findOne({ id: userId });
    if (!user) {
      console.log('❌ User not found for userId:', userId);
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const response = {
      id: user.id,
      adSoyad: user.adSoyad,
      rol: user.rol,
      sinif: user.sinif,
      sube: user.sube,
      oda: user.oda,
      pansiyon: user.pansiyon,
      email: user.email
    };
    console.log('✅ /me response:', response);
    res.json(response);
  } catch (error) {
    console.error('ME error:', error);
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
      res.status(404).json({ error: 'Bu email adresi ile kayıtlı kullanıcı bulunamadı' });
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
    console.error('Forgot password error:', error);
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
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ success: true, message: 'Şifre başarıyla güncellendi' });
  } catch (error) {
    console.error('Reset password error:', error);
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
    console.error('Register error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

export default router;
