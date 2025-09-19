import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, validationResult } from 'express-validator';
import DOMPurify from 'isomorphic-dompurify';

// Enhanced security middleware for comprehensive protection

/**
 * Advanced Rate Limiting Configuration
 * Different limits for different endpoints based on sensitivity
 */
export const createRateLimiters = () => {
  // General API rate limiting
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(15 * 60), // seconds
        limit: 100,
        windowMs: 15 * 60 * 1000
      });
    }
  });

  // Stricter limits for authentication endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Authentication rate limit exceeded',
        message: 'Too many authentication attempts, please try again later.',
        retryAfter: Math.ceil(15 * 60),
        limit: 5,
        windowMs: 15 * 60 * 1000
      });
    }
  });

  // File upload rate limiting
  const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 uploads per hour
    message: {
      error: 'Too many file uploads, please try again later.',
      retryAfter: '1 hour'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Upload rate limit exceeded',
        message: 'Too many file uploads, please try again later.',
        retryAfter: Math.ceil(60 * 60),
        limit: 10,
        windowMs: 60 * 60 * 1000
      });
    }
  });

  // Admin endpoint rate limiting
  const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per windowMs
    message: {
      error: 'Too many admin requests, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Admin rate limit exceeded',
        message: 'Too many admin requests, please try again later.',
        retryAfter: Math.ceil(15 * 60),
        limit: 50,
        windowMs: 15 * 60 * 1000
      });
    }
  });

  return {
    general: generalLimiter,
    auth: authLimiter,
    upload: uploadLimiter,
    admin: adminLimiter
  };
};

/**
 * Enhanced Helmet Configuration
 * Comprehensive security headers
 */
export const enhancedHelmet = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      workerSrc: ["'self'", "blob:"],
      manifestSrc: ["'self'"],
      mediaSrc: ["'self'", "https:"],
      prefetchSrc: ["'self'"],
      requireTrustedTypesFor: ["'script'"]
    },
    reportOnly: false
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true
});

/**
 * Input Sanitization Middleware
 * Prevents XSS and injection attacks
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sanitize body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    console.error('Input sanitization error:', error);
    res.status(400).json({
      error: 'Invalid input detected',
      message: 'Input contains potentially dangerous content'
    });
  }
};

/**
 * Recursively sanitize objects and arrays
 */
const sanitizeObject = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  if (typeof obj === 'string') {
    return DOMPurify.sanitize(obj, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  }

  return obj;
};

/**
 * SQL Injection Prevention Middleware
 * Checks for common SQL injection patterns
 */
export const preventSQLInjection = (req: Request, res: Response, next: NextFunction) => {
  const sqlPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|vbscript|onload|onerror|onclick)\b)/i,
    /(['"]\s*(union|select|insert|update|delete|drop|create|alter|exec|execute)\s*)/i,
    /(\b(and|or)\s+\d+\s*=\s*\d+)/i,
    /(\b(and|or)\s+['"]\s*=\s*['"])/i,
    /(;\s*(union|select|insert|update|delete|drop|create|alter|exec|execute))/i,
    /(--\s*$)/,
    /(\/\*.*\*\/)/,
    /(\bxp_cmdshell\b)/i,
    /(\bsp_executesql\b)/i
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return sqlPatterns.some(pattern => pattern.test(value));
    }
    if (Array.isArray(value)) {
      return value.some(checkValue);
    }
    if (value !== null && typeof value === 'object') {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  if (checkValue(req.body) || checkValue(req.query) || checkValue(req.params)) {
    return res.status(400).json({
      error: 'Potential security threat detected',
      message: 'Input contains potentially dangerous patterns'
    });
  }

  next();
};

/**
 * XSS Prevention Middleware
 * Checks for common XSS patterns
 */
export const preventXSS = (req: Request, res: Response, next: NextFunction) => {
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /onmouseover\s*=/gi,
    /onfocus\s*=/gi,
    /onblur\s*=/gi,
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi,
    /<form[^>]*>/gi,
    /<input[^>]*>/gi,
    /<textarea[^>]*>/gi,
    /<select[^>]*>/gi,
    /<button[^>]*>/gi,
    /<link[^>]*>/gi,
    /<meta[^>]*>/gi,
    /<style[^>]*>/gi
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return xssPatterns.some(pattern => pattern.test(value));
    }
    if (Array.isArray(value)) {
      return value.some(checkValue);
    }
    if (value !== null && typeof value === 'object') {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  if (checkValue(req.body) || checkValue(req.query) || checkValue(req.params)) {
    return res.status(400).json({
      error: 'Potential XSS attack detected',
      message: 'Input contains potentially dangerous HTML/JavaScript'
    });
  }

  next();
};

/**
 * Enhanced Validation Middleware
 * Comprehensive input validation with security checks
 */
export const enhancedValidation = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Log validation errors for security monitoring
    console.warn('Validation failed:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      errors: errors.array()
    });

    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
      message: 'Please check your input and try again'
    });
  }

  next();
};

/**
 * Security Headers Middleware
 * Additional security headers beyond Helmet
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()'
  );
  
  // Content security policy report only (for monitoring)
  res.setHeader('Content-Security-Policy-Report-Only', 
    "default-src 'self'; report-uri /api/security/csp-report"
  );

  next();
};

/**
 * Audit Logging Middleware
 * Logs security-relevant events
 */
export const auditLog = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log request details
  const requestLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id || 'anonymous',
    userRole: (req as any).user?.rol || 'anonymous'
  };

  console.log('🔒 Security Audit:', requestLog);

  // Override response.json to log response
  const originalJson = res.json;
  res.json = function(data: any) {
    const responseLog = {
      ...requestLog,
      responseTime: Date.now() - startTime,
      statusCode: res.statusCode,
      responseSize: JSON.stringify(data).length
    };

    // Log security-relevant responses
    if (res.statusCode >= 400) {
      console.warn('⚠️ Security Warning:', responseLog);
    } else {
      console.log('✅ Security Audit:', responseLog);
    }

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Request Size Limiting
 * Prevents large payload attacks
 */
export const requestSizeLimit = (req: Request, res: Response, next: NextFunction) => {
  const contentLength = parseInt(req.get('Content-Length') || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength > maxSize) {
    return res.status(413).json({
      error: 'Request too large',
      message: 'Request body exceeds maximum allowed size of 10MB'
    });
  }

  next();
};

/**
 * IP Whitelist/Blacklist Middleware
 * Restricts access based on IP addresses
 */
export const ipRestriction = (allowedIPs?: string[], blockedIPs?: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip;

    // Check blacklist first
    if (blockedIPs && blockedIPs.includes(clientIP)) {
      console.warn(`🚫 Blocked IP access attempt: ${clientIP}`);
      return res.status(403).json({
        error: 'Access denied',
        message: 'Your IP address is not allowed to access this resource'
      });
    }

    // Check whitelist if specified
    if (allowedIPs && !allowedIPs.includes(clientIP)) {
      console.warn(`🚫 Unauthorized IP access attempt: ${clientIP}`);
      return res.status(403).json({
        error: 'Access denied',
        message: 'Your IP address is not authorized to access this resource'
      });
    }

    next();
  };
};

/**
 * Session Security Middleware
 * Enhanced session protection
 */
export const sessionSecurity = (req: Request, res: Response, next: NextFunction) => {
  // Regenerate session ID on successful authentication
  if ((req as any).user && req.session && req.session.regenerate) {
    req.session.regenerate((err: any) => {
      if (err) {
        console.error('Session regeneration error:', err);
      }
    });
  }

  // Set secure session options
  if (req.session) {
    req.session.cookie.secure = process.env.NODE_ENV === 'production';
    req.session.cookie.httpOnly = true;
    req.session.cookie.sameSite = 'strict';
    req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours
  }

  next();
};

// Export all security middleware
export const securityMiddleware = {
  createRateLimiters,
  enhancedHelmet,
  sanitizeInput,
  preventSQLInjection,
  preventXSS,
  enhancedValidation,
  securityHeaders,
  auditLog,
  requestSizeLimit,
  ipRestriction,
  sessionSecurity
};
