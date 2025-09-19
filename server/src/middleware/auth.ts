import { Request, Response, NextFunction } from 'express';
import { User } from '../models';

// Session types are now defined in src/types/express-session.d.ts

// Authentication middleware - JWT tabanlı kimlik doğrulama
import { authenticateJWT } from '../utils/jwt';

// Eski session-based middleware yerine JWT middleware'i kullan
export const requireAuth = authenticateJWT;

// Role-based authorization middleware
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
    }

    if (!allowedRoles.includes(user.rol)) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
    }

    next();
  };
};

// Club membership middleware
export const requireClubMembership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clubId = req.params.clubId;
    const user = (req as any).user;

    if (!clubId) {
      return res.status(400).json({ error: 'Kulüp ID gerekli' });
    }

    // Club'ı veritabanından al
    const { Club } = await import('../models');
    const club = await Club.findOne({ id: clubId });

    if (!club) {
      return res.status(404).json({ error: 'Kulüp bulunamadı' });
    }

    // Kullanıcının kulüp üyesi olup olmadığını kontrol et
    if (!club.members.includes(user.id)) {
      return res.status(403).json({ error: 'Bu kulübün üyesi değilsiniz' });
    }

    // Club bilgisini request'e ekle
    (req as any).club = club;
    next();
  } catch (error) {
    console.error('Club membership middleware error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

// Club leadership middleware
export const requireClubLeadership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clubId = req.params.clubId;
    const user = (req as any).user;

    if (!clubId) {
      return res.status(400).json({ error: 'Kulüp ID gerekli' });
    }

    // Club'ı veritabanından al
    const { Club } = await import('../models');
    const club = await Club.findOne({ id: clubId });

    if (!club) {
      return res.status(404).json({ error: 'Kulüp bulunamadı' });
    }

    // Kullanıcının kulüp lideri olup olmadığını kontrol et
    const userRole = club.roles[user.id];
    const isLeader = userRole === 'Başkan' || userRole === 'Ana Başkan';

    if (!isLeader) {
      return res.status(403).json({ error: 'Bu işlem için kulüp lideri olmanız gerekiyor' });
    }

    // Club bilgisini request'e ekle
    (req as any).club = club;
    next();
  } catch (error) {
    console.error('Club leadership middleware error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

// Admin middleware
export const requireAdmin = requireRole(['admin']);

// Teacher middleware
export const requireTeacher = requireRole(['teacher', 'admin']);

// Student middleware
export const requireStudent = requireRole(['student']);

// Parent middleware
export const requireParent = requireRole(['parent']);

// Service middleware
export const requireService = requireRole(['hizmetli', 'admin']);

// Optional authentication - kullanıcı giriş yapmışsa bilgilerini ekle
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.session && (req.session as any).userId) {
      const user = await User.findOne({ id: (req.session as any).userId });
      if (user) {
        (req as any).user = user;
      }
    }
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Hata olsa bile devam et
  }
};

// CSRF protection middleware
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // Basit CSRF koruması - production'da daha güçlü bir çözüm kullanın
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE' || req.method === 'PATCH') {
    const origin = req.get('Origin');
    const referer = req.get('Referer');
    
    // Same-origin kontrolü
    if (origin && !origin.includes(process.env.FRONTEND_URL || 'localhost')) {
      res.status(403).json({ error: 'CSRF koruması' });
      return;
    }
  }
  next();
};

// Rate limiting helper
export const createRateLimiter = (windowMs: number, max: number, message: string) => {
  const rateLimit = require('express-rate-limit');
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Session security middleware
export const sessionSecurity = (req: Request, res: Response, next: NextFunction): void => {
  // Session hijacking koruması
  if (req.session && (req.session as any).userId && req.headers['user-agent']) {
    if (!req.session.userAgent) {
      req.session.userAgent = req.headers['user-agent'];
    } else if (req.session.userAgent !== req.headers['user-agent']) {
      // User agent değişmiş, session'ı temizle
      req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
      });
      res.status(401).json({ error: 'Güvenlik ihlali tespit edildi' });
      return;
    }
  }
  next();
};