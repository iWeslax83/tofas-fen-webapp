import { Request, Response, NextFunction } from 'express';
import { User } from '../models';
import logger from '../utils/logger';
import rateLimit from 'express-rate-limit';

// Session types are now defined in src/types/express-session.d.ts

// Authentication middleware - JWT tabanlı kimlik doğrulama
import { authenticateJWT } from '../utils/jwt';

// Eski session-based middleware yerine JWT middleware'i kullan
export const requireAuth = authenticateJWT;

// Role-based authorization middleware
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({ error: 'Oturum açmanız gerekiyor' });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
      return;
    }

    next();
  };
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
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.session && (req.session as any).userId) {
      const user = await User.findOne({ id: (req.session as any).userId });
      if (user) {
        (req as any).user = user;
      }
    }
    next();
  } catch (error) {
    logger.error('Optional auth middleware error', {
      error: error instanceof Error ? error.message : String(error)
    });
    next(); // Hata olsa bile devam et
  }
};

// CSRF protection middleware
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // Basit CSRF koruması - production'da daha güçlü bir çözüm kullanın
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE' || req.method === 'PATCH') {
    const origin = req.get('Origin');
    // const referer = req.get('Referer'); // Unused variable removed

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
        if (err) {
          logger.error('Session destroy error', {
            error: err instanceof Error ? err.message : String(err)
          });
        }
      });
      res.status(401).json({ error: 'Güvenlik ihlali tespit edildi' });
      return;
    }
  }
  next();
};