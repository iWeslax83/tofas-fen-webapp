import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TokenManager,
  InputSanitizer,
  PasswordPolicy,
  XSSProtection,
  CSRFProtection,
  RateLimiter,
} from '../security';

describe('TokenManager (httpOnly cookie mode)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('setTokens should be a no-op (tokens are in httpOnly cookies)', () => {
    TokenManager.setTokens('access', 'refresh', 3600);

    // httpOnly cookie modunda localStorage'a yazılmamalı
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it('getAccessToken should return null (tokens are in httpOnly cookies)', () => {
    const result = TokenManager.getAccessToken();

    expect(result).toBeNull();
  });

  it('isTokenExpired should return false (server handles expiration)', () => {
    const result = TokenManager.isTokenExpired();

    expect(result).toBe(false);
  });

  it('clearTokens should remove legacy localStorage entries', () => {
    TokenManager.clearTokens();

    expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('refresh_token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('token_expiry');
    expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken');
    expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken');
  });
});

describe('InputSanitizer', () => {
  it('should sanitize string input', () => {
    const input = '<script>alert("xss")</script>Hello World';
    const result = InputSanitizer.sanitizeString(input);

    expect(result).toBe('Hello World');
  });

  it('should sanitize object', () => {
    const input = {
      name: '<script>alert("xss")</script>John',
      email: 'john@example.com',
      message: '<img src="x" onerror="alert(1)">Hello',
    };

    const result = InputSanitizer.sanitizeObject(input);

    expect(result.name).toBe('John');
    expect(result.email).toBe('john@example.com');
    expect(result.message).toBe('Hello');
  });

  it('should handle null and undefined', () => {
    expect(InputSanitizer.sanitizeString(null as any)).toBe('');
    expect(InputSanitizer.sanitizeString(undefined as any)).toBe('');
  });
});

describe('PasswordPolicy', () => {
  it('should validate strong password', () => {
    const password = 'StrongPass123!';
    const result = PasswordPolicy.validate(password);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject weak password', () => {
    const password = 'weak';
    const result = PasswordPolicy.validate(password);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should check password strength', () => {
    const weakPassword = 'weak';
    const mediumPassword = 'MediumPass123';
    const strongPassword = 'StrongPass123!';

    expect(PasswordPolicy.getStrength(weakPassword)).toBe('weak');
    expect(PasswordPolicy.getStrength(mediumPassword)).toBe('medium');
    expect(PasswordPolicy.getStrength(strongPassword)).toBe('strong');
  });
});

describe('XSSProtection', () => {
  it('should escape HTML', () => {
    const input = '<script>alert("xss")</script>';
    const result = XSSProtection.escapeHtml(input);

    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
    expect(result).not.toContain('<script>');
  });

  it('should sanitize HTML', () => {
    const input = '<p>Hello <script>alert("xss")</script> World</p>';
    const result = XSSProtection.sanitizeHtml(input);

    expect(result).toBe('<p>Hello  World</p>');
  });
});

describe('CSRFProtection', () => {
  // CSRFProtection now reads from `document.cookie` (server issues
  // the token via Set-Cookie). The previous sessionStorage-based API
  // was removed when the server became the source of truth, so these
  // tests stub document.cookie via Object.defineProperty.
  let cookieJar = '';

  beforeEach(() => {
    cookieJar = '';
    vi.clearAllMocks();
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => cookieJar,
      set: (v: string) => {
        const [pair] = v.split(';');
        const [name] = pair.split('=');
        // Replace any existing entry for this cookie name.
        const others = cookieJar
          .split(';')
          .map((c) => c.trim())
          .filter((c) => c && !c.startsWith(`${name}=`));
        cookieJar = [...others, pair].filter(Boolean).join('; ');
      },
    });
  });

  it('returns null when no csrfToken cookie is set', () => {
    expect(CSRFProtection.getToken()).toBeNull();
  });

  it('reads the csrfToken cookie set by the server', () => {
    document.cookie = 'csrfToken=test-csrf-token';

    expect(CSRFProtection.getToken()).toBe('test-csrf-token');
  });

  it('validates a token that matches the cookie', () => {
    document.cookie = 'csrfToken=test-csrf-token';

    expect(CSRFProtection.validateToken('test-csrf-token')).toBe(true);
  });

  it('rejects a token that does not match the cookie', () => {
    document.cookie = 'csrfToken=real-token';

    expect(CSRFProtection.validateToken('forged-token')).toBe(false);
  });

  it('rejects when no cookie is set at all', () => {
    expect(CSRFProtection.validateToken('anything')).toBe(false);
  });
});

describe('RateLimiter', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    RateLimiter.clearAll();
    vi.clearAllMocks();
  });

  it('should allow request within limit', () => {
    const key = 'test-key';
    const limit = 5;
    const windowMs = 60000;

    for (let i = 0; i < 3; i++) {
      const result = RateLimiter.checkLimit(key, limit, windowMs);
      expect(result.allowed).toBe(true);
    }
  });

  it('should block request over limit', () => {
    const key = 'test-key';
    const limit = 2;
    const windowMs = 60000;

    // First two requests should be allowed
    expect(RateLimiter.checkLimit(key, limit, windowMs).allowed).toBe(true);
    expect(RateLimiter.checkLimit(key, limit, windowMs).allowed).toBe(true);

    // Third request should be blocked
    const result = RateLimiter.checkLimit(key, limit, windowMs);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});
