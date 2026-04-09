import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock logger before importing the middleware
vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { csrfProtection } from '../../middleware/auth';
import type { Request, Response } from 'express';

/**
 * B-H2 regression coverage.
 *
 * The goal of these tests is to pin down the exact semantics of the CSRF
 * middleware so future edits can't silently widen the bypass surface:
 *
 *   1. Safe methods never trigger the check.
 *   2. Exempt bootstrap paths (/api/auth/login etc.) skip the check.
 *   3. Requests with no auth cookie skip the check (bearer-token clients).
 *   4. Requests WITH an auth cookie require a valid Origin / Referer.
 *   5. Double-submit: if a csrfToken cookie is set, the X-CSRF-Token header
 *      must match.
 */

const ALLOWED_ORIGIN = 'http://localhost:5173';

function createReq(overrides: Partial<Request> = {}): Partial<Request> {
  const headers: Record<string, string> = {};
  const req: Partial<Request> = {
    method: 'POST',
    path: '/api/homeworks',
    originalUrl: '/api/homeworks',
    cookies: {},
    get: vi.fn((name: string) => headers[name.toLowerCase()]) as any,
    ...overrides,
  };
  // Allow overrides to inject header values via an 'headers' field
  if ((overrides as any).headers) {
    Object.assign(headers, (overrides as any).headers);
  }
  return req;
}

function createRes() {
  const state = { statusCode: 200, body: null as any };
  const res: Partial<Response> = {
    status: vi.fn().mockImplementation((code: number) => {
      state.statusCode = code;
      return res;
    }) as any,
    json: vi.fn().mockImplementation((data: any) => {
      state.body = data;
      return res;
    }) as any,
  };
  return { res, state };
}

describe('csrfProtection middleware (B-H2)', () => {
  beforeEach(() => {
    process.env.FRONTEND_URL = ALLOWED_ORIGIN;
  });

  describe('safe methods', () => {
    it.each(['GET', 'HEAD', 'OPTIONS'])('should skip check for %s', (method) => {
      const req = createReq({ method });
      const { res } = createRes();
      const next = vi.fn();

      csrfProtection(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('exempt bootstrap paths', () => {
    const exemptPaths = [
      '/api/auth/login',
      '/api/auth/refresh',
      '/api/auth/refresh-token',
      '/api/auth/logout',
      '/api/auth/verify-2fa',
      '/api/auth/resend-2fa',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/api/registration',
    ];

    it.each(exemptPaths)('should skip check for %s even with auth cookie', (path) => {
      const req = createReq({
        path,
        originalUrl: path,
        cookies: { accessToken: 'some-jwt-goes-here' },
      });
      const { res } = createRes();
      const next = vi.fn();

      csrfProtection(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('unauthenticated requests', () => {
    it('should skip check when no auth cookie is present (bearer-token client)', () => {
      const req = createReq({ cookies: {} });
      const { res } = createRes();
      const next = vi.fn();

      csrfProtection(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('authenticated + Origin enforcement', () => {
    it('should reject when Origin is missing and no Referer fallback', () => {
      const req = createReq({ cookies: { accessToken: 'jwt' } });
      const { res, state } = createRes();
      const next = vi.fn();

      csrfProtection(req as Request, res as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(state.statusCode).toBe(403);
    });

    it('should reject when Origin is not in the allowlist', () => {
      const req = createReq({
        cookies: { accessToken: 'jwt' },
        headers: { origin: 'https://evil.example.com' },
      } as any);
      const { res, state } = createRes();
      const next = vi.fn();

      csrfProtection(req as Request, res as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(state.statusCode).toBe(403);
    });

    it('should accept when Origin matches the allowlist', () => {
      const req = createReq({
        cookies: { accessToken: 'jwt' },
        headers: { origin: ALLOWED_ORIGIN },
      } as any);
      const { res } = createRes();
      const next = vi.fn();

      csrfProtection(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('should fall back to Referer when Origin is missing', () => {
      const req = createReq({
        cookies: { accessToken: 'jwt' },
        headers: { referer: `${ALLOWED_ORIGIN}/dashboard` },
      } as any);
      const { res } = createRes();
      const next = vi.fn();

      csrfProtection(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('should reject a malformed Referer', () => {
      const req = createReq({
        cookies: { accessToken: 'jwt' },
        headers: { referer: 'not-a-url' },
      } as any);
      const { res, state } = createRes();
      const next = vi.fn();

      csrfProtection(req as Request, res as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(state.statusCode).toBe(403);
    });
  });

  describe('double-submit cookie', () => {
    it('should accept when csrfToken cookie matches X-CSRF-Token header', () => {
      const req = createReq({
        cookies: { accessToken: 'jwt', csrfToken: 'abc123' },
        headers: { origin: ALLOWED_ORIGIN, 'x-csrf-token': 'abc123' },
      } as any);
      const { res } = createRes();
      const next = vi.fn();

      csrfProtection(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('should reject when csrfToken cookie is set but header is missing', () => {
      const req = createReq({
        cookies: { accessToken: 'jwt', csrfToken: 'abc123' },
        headers: { origin: ALLOWED_ORIGIN },
      } as any);
      const { res, state } = createRes();
      const next = vi.fn();

      csrfProtection(req as Request, res as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(state.statusCode).toBe(403);
    });

    it('should reject when csrfToken cookie and header do not match', () => {
      const req = createReq({
        cookies: { accessToken: 'jwt', csrfToken: 'abc123' },
        headers: { origin: ALLOWED_ORIGIN, 'x-csrf-token': 'wrong-token' },
      } as any);
      const { res, state } = createRes();
      const next = vi.fn();

      csrfProtection(req as Request, res as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(state.statusCode).toBe(403);
    });

    it('should accept when no csrfToken cookie is set (Origin-only mode)', () => {
      const req = createReq({
        cookies: { accessToken: 'jwt' },
        headers: { origin: ALLOWED_ORIGIN },
      } as any);
      const { res } = createRes();
      const next = vi.fn();

      csrfProtection(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });
});
