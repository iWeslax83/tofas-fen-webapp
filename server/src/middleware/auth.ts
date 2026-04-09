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
    const user = req.user;

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

// Visitor middleware
export const requireVisitor = requireRole(['ziyaretci']);

// Optional authentication - kullanıcı giriş yapmışsa bilgilerini ekle
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (req.session && req.session.userId) {
      const user = await User.findOne({ id: req.session.userId });
      if (user) {
        req.user = { userId: user.id, role: user.rol, email: user.email };
      }
    }
    next();
  } catch (error) {
    logger.error('Optional auth middleware error', {
      error: error instanceof Error ? error.message : String(error),
    });
    next(); // Hata olsa bile devam et
  }
};

// B-H2 fix: CSRF protection — Origin allowlist + double-submit cookie.
//
// The previous implementation had two bypass paths: if Origin was absent OR
// if the csrfToken cookie/header pair was missing, the check was skipped.
// Together that meant an attacker who suppressed either header sailed past.
//
// New rule (state-changing methods only):
//   1. Skip entirely if the request carries no auth cookie — there's no
//      session to ride, so there's nothing to forge. This keeps bootstrap
//      endpoints (login, register, refresh) and bearer-token API clients
//      unaffected.
//   2. Otherwise require a valid Origin (or Referer fallback) matching the
//      allowlist. Browsers set Origin on cross-origin fetches and scripts
//      cannot override it.
//   3. If a csrfToken cookie is set, the matching X-CSRF-Token header is
//      mandatory (defense in depth against sub-domain takeover).
//
// The per-route allowlist below is also applied so login/register/etc. never
// trigger the check even if they somehow present a stale auth cookie.
const CSRF_EXEMPT_PATHS = new Set<string>([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/refresh-token',
  '/api/auth/logout',
  '/api/auth/verify-2fa',
  '/api/auth/resend-2fa',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/registration', // public registration submission
]);

export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // Safe methods don't mutate state.
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return next();
  }

  // Bootstrap/auth endpoints predate any session.
  const reqPath = req.path || req.originalUrl?.split('?')[0] || '';
  if (CSRF_EXEMPT_PATHS.has(reqPath)) {
    return next();
  }

  // CSRF only matters when the browser attaches ambient credentials. If the
  // caller has no auth cookie, they must be using a bearer token — skip.
  const hasAuthCookie =
    Boolean(req.cookies?.accessToken) ||
    Boolean(req.cookies?.refreshToken) ||
    Boolean(req.cookies?.sessionToken);
  if (!hasAuthCookie) {
    return next();
  }

  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ].filter(Boolean);

  const origin = req.get('Origin');
  const referer = req.get('Referer');

  let sourceOk = false;
  if (origin) {
    sourceOk = allowedOrigins.includes(origin);
  } else if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      sourceOk = allowedOrigins.includes(refererOrigin);
    } catch {
      sourceOk = false;
    }
  }

  if (!sourceOk) {
    res.status(403).json({ error: 'CSRF koruması: Geçersiz origin' });
    return;
  }

  // Double-submit cookie: if a csrfToken cookie is set, the matching header
  // must be present.
  const cookieToken = req.cookies?.csrfToken;
  if (cookieToken) {
    const headerToken = req.get('X-CSRF-Token');
    if (!headerToken || headerToken !== cookieToken) {
      res.status(403).json({ error: 'CSRF koruması: Token uyuşmazlığı' });
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
  if (req.session && req.session.userId && req.headers['user-agent']) {
    if (!req.session.userAgent) {
      req.session.userAgent = req.headers['user-agent'];
    } else if (req.session.userAgent !== req.headers['user-agent']) {
      // User agent değişmiş, session'ı temizle
      req.session.destroy((err) => {
        if (err) {
          logger.error('Session destroy error', {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      });
      res.status(401).json({ error: 'Güvenlik ihlali tespit edildi' });
      return;
    }
  }
  next();
};
