import DOMPurify from 'dompurify';

// JWT Token Management
export class TokenManager {
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private static readonly TOKEN_EXPIRY_KEY = 'token_expiry';

  static setTokens(accessToken: string, refreshToken: string, expiresIn: number) {
    const expiryTime = Date.now() + (expiresIn * 1000); // Convert seconds to milliseconds

    if (import.meta.env.DEV) {
      console.log('[TokenManager] Setting tokens - expiresIn:', expiresIn, 'expiryTime:', new Date(expiryTime).toISOString());
    }

    localStorage.setItem(this.TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());

    if (import.meta.env.DEV) {
      console.log('[TokenManager] Tokens stored - accessToken exists:', !!localStorage.getItem(this.TOKEN_KEY));
      console.log('[TokenManager] Token expiry stored:', localStorage.getItem(this.TOKEN_EXPIRY_KEY));
    }
  }

  static getAccessToken(): string | null {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (import.meta.env.DEV) {
      console.log('[TokenManager] Getting access token - exists:', !!token);
    }
    return token;
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static isTokenExpired(): boolean {
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (!expiry) {
      if (import.meta.env.DEV) {
        console.log('[TokenManager] No expiry found - token expired');
      }
      return true;
    }
    const isExpired = Date.now() >= parseInt(expiry);
    if (import.meta.env.DEV) {
      console.log('[TokenManager] Token expiry check - current:', new Date().toISOString(), 'expiry:', new Date(parseInt(expiry)).toISOString(), 'expired:', isExpired);
    }
    return isExpired;
  }

  static clearTokens() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
    // Also clear alternative keys for compatibility
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  static shouldRefreshToken(): boolean {
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (!expiry) return false;
    // Refresh token 5 minutes before expiry
    return Date.now() > (parseInt(expiry) - 5 * 60 * 1000);
  }
}

// Input Sanitization
export class InputSanitizer {
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';
    return DOMPurify.sanitize(input.trim());
  }

  static sanitizeEmail(email: string): string {
    const sanitized = this.sanitizeString(email);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(sanitized) ? sanitized.toLowerCase() : '';
  }

  static sanitizePassword(password: string): string {
    if (typeof password !== 'string') return '';
    // Passwords shouldn't be sanitized for HTML tags as they can contain valid special characters
    return password;
  }

  static sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = ['sifre', 'password', 'passwordConfirm', 'newPassword', 'currentPassword', 'oldPassword'];

    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveKeys.includes(key)) {
        // Passwords should NOT be sanitized (HTML tags are valid chars in passwords)
        sanitized[key] = value;
      } else if (typeof value === 'string') {
        // Remove HTML tags completely and trim whitespace
        sanitized[key] = DOMPurify.sanitize(value, { ALLOWED_TAGS: [] }).trim();
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = this.sanitizeObject(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item =>
          typeof item === 'string'
            ? DOMPurify.sanitize(item, { ALLOWED_TAGS: [] }).trim()
            : typeof item === 'object' && item !== null
              ? this.sanitizeObject(item)
              : item
        );
      } else {
        sanitized[key] = value as unknown;
      }
    }
    return sanitized as T;
  }
}

// Password Policy Validation
export class PasswordPolicy {
  static validate(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Şifre en az 8 karakter olmalıdır');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Şifre en az bir büyük harf içermelidir');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Şifre en az bir küçük harf içermelidir');
    }

    if (!/\d/.test(password)) {
      errors.push('Şifre en az bir rakam içermelidir');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Şifre en az bir özel karakter içermelidir');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static getStrength(password: string): 'weak' | 'medium' | 'strong' {
    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    if (score <= 3) return 'weak';
    if (score <= 5) return 'medium';
    return 'strong';
  }
}

// XSS Protection
export class XSSProtection {
  static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  static sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
      ALLOWED_ATTR: ['href', 'target']
    });
  }

  static validateUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }
}

// CSRF Protection
export class CSRFProtection {
  private static readonly CSRF_TOKEN_KEY = 'csrf_token';

  static setToken(token: string) {
    sessionStorage.setItem(this.CSRF_TOKEN_KEY, token);
  }

  static getToken(): string | null {
    return sessionStorage.getItem(this.CSRF_TOKEN_KEY);
  }

  static clearToken() {
    sessionStorage.removeItem(this.CSRF_TOKEN_KEY);
  }

  static generateToken(): string {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    this.setToken(token);
    return token;
  }

  static validateToken(token: string): boolean {
    const storedToken = this.getToken();
    return !!storedToken && storedToken === token;
  }
}

// Rate Limiting (Client-side)
export class RateLimiter {
  private static attempts: Map<string, { count: number; resetTime: number }> = new Map();

  static checkLimit(key: string, maxAttempts: number, windowMs: number): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const attempt = this.attempts.get(key);

    if (!attempt || now > attempt.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: maxAttempts - 1 };
    }

    if (attempt.count >= maxAttempts) {
      return { allowed: false, remaining: 0 };
    }

    attempt.count++;
    return { allowed: true, remaining: maxAttempts - attempt.count };
  }

  static clearAttempts(key: string) {
    this.attempts.delete(key);
  }

  static clearAll() {
    this.attempts.clear();
  }
}