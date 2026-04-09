import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock logger before importing WAF
vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  wafMiddleware,
  blockIP,
  unblockIP,
  getWafStatus,
  initWafRedis,
} from '../../middleware/waf';
import { Request, Response } from 'express';

function createMockReq(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    ip: '10.0.0.1',
    path: '/api/test',
    originalUrl: '/api/test',
    method: 'GET',
    query: {},
    body: {},
    get: vi.fn().mockReturnValue('Mozilla/5.0'),
    socket: { remoteAddress: '10.0.0.1' } as any,
    headers: {},
    ...overrides,
  };
}

function createMockRes(): { res: Partial<Response>; statusCode: number; body: any } {
  const state = { statusCode: 200, body: null as any };
  const res: Partial<Response> = {
    status: vi.fn().mockImplementation((code: number) => {
      state.statusCode = code;
      return res;
    }),
    json: vi.fn().mockImplementation((data: any) => {
      state.body = data;
      return res;
    }),
  };
  return { res, ...state };
}

describe('WAF Middleware', () => {
  beforeEach(() => {
    // Unblock all IPs
    const status = getWafStatus();
    status.blockedIPs.forEach((ip) => unblockIP(ip));
  });

  describe('wafMiddleware', () => {
    it('should allow normal requests', async () => {
      const req = createMockReq();
      const { res } = createMockRes();
      const next = vi.fn();

      await wafMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });

    it('should block directory traversal in path', async () => {
      const req = createMockReq({ originalUrl: '/api/../../etc/passwd' });
      const { res } = createMockRes();
      const next = vi.fn();

      await wafMiddleware(req as Request, res as Response, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should block XSS attempts in path', async () => {
      const req = createMockReq({ originalUrl: '/api/test?q=<script>alert(1)</script>' });
      const { res } = createMockRes();
      const next = vi.fn();

      await wafMiddleware(req as Request, res as Response, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('should block SQL injection in query params', async () => {
      const req = createMockReq({ query: { search: 'UNION SELECT * FROM users' } });
      const { res } = createMockRes();
      const next = vi.fn();

      await wafMiddleware(req as Request, res as Response, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('should block command injection in body', async () => {
      const req = createMockReq({
        method: 'POST',
        body: { name: 'test; exec("rm -rf /")' },
      });
      const { res } = createMockRes();
      const next = vi.fn();

      await wafMiddleware(req as Request, res as Response, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('should block .env file probing', async () => {
      const req = createMockReq({ originalUrl: '/.env' });
      const { res } = createMockRes();
      const next = vi.fn();

      await wafMiddleware(req as Request, res as Response, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('should block WordPress probing', async () => {
      const req = createMockReq({ originalUrl: '/wp-admin/login.php' });
      const { res } = createMockRes();
      const next = vi.fn();

      await wafMiddleware(req as Request, res as Response, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('should block .git directory access', async () => {
      const req = createMockReq({ originalUrl: '/.git/config' });
      const { res } = createMockRes();
      const next = vi.fn();

      await wafMiddleware(req as Request, res as Response, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('should block oversized requests', async () => {
      const req = createMockReq({
        get: vi.fn().mockImplementation((header: string) => {
          if (header === 'content-length') return String(100 * 1024 * 1024);
          if (header === 'User-Agent') return 'Mozilla/5.0';
          return undefined;
        }),
      });
      const { res } = createMockRes();
      const next = vi.fn();

      await wafMiddleware(req as Request, res as Response, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(413);
    });

    it('should block already-blocked IPs', async () => {
      blockIP('10.0.0.99');
      const req = createMockReq({ ip: '10.0.0.99' });
      const { res } = createMockRes();
      const next = vi.fn();

      await wafMiddleware(req as Request, res as Response, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);

      unblockIP('10.0.0.99');
    });
  });

  describe('wafMiddleware with Redis', () => {
    afterEach(() => {
      // Reset Redis client between tests so state doesn't leak.
      initWafRedis(null);
    });

    it('should reject the FIRST request from a distributed-blocked IP', async () => {
      // Minimal Redis client mock — only the methods WAF calls.
      const mockRedis = {
        get: vi.fn().mockResolvedValue('1'), // IP is blocked distributed-wide
        setex: vi.fn().mockResolvedValue('OK'),
        multi: vi.fn().mockReturnValue({
          incr: vi.fn().mockReturnThis(),
          expire: vi.fn().mockReturnThis(),
          exec: vi.fn().mockResolvedValue([]),
        }),
        del: vi.fn().mockResolvedValue(1),
      };
      initWafRedis(mockRedis);

      const req = createMockReq({ ip: '10.0.0.200' });
      const { res } = createMockRes();
      const next = vi.fn();

      await wafMiddleware(req as Request, res as Response, next);

      // B-C4 regression guard: the first request must be rejected, not the
      // second. Previously the Redis check was fire-and-forget so the first
      // hit slipped through.
      expect(mockRedis.get).toHaveBeenCalledWith('waf:blocked:10.0.0.200');
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should fall back to memory when Redis throws', async () => {
      const mockRedis = {
        get: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')),
        setex: vi.fn(),
        multi: vi.fn().mockReturnValue({
          incr: vi.fn().mockReturnThis(),
          expire: vi.fn().mockReturnThis(),
          exec: vi.fn().mockResolvedValue([]),
        }),
        del: vi.fn(),
      };
      initWafRedis(mockRedis);

      const req = createMockReq({ ip: '10.0.0.201' });
      const { res } = createMockRes();
      const next = vi.fn();

      // Not in in-memory block list -> should proceed with a warn log.
      await wafMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('blockIP / unblockIP', () => {
    it('should manually block and unblock an IP', () => {
      blockIP('192.168.1.50');
      let status = getWafStatus();
      expect(status.blockedIPs).toContain('192.168.1.50');

      unblockIP('192.168.1.50');
      status = getWafStatus();
      expect(status.blockedIPs).not.toContain('192.168.1.50');
    });
  });

  describe('getWafStatus', () => {
    it('should return status with blockedIPs and suspiciousIPs arrays', () => {
      const status = getWafStatus();
      expect(status).toHaveProperty('blockedIPs');
      expect(status).toHaveProperty('suspiciousIPs');
      expect(Array.isArray(status.blockedIPs)).toBe(true);
      expect(Array.isArray(status.suspiciousIPs)).toBe(true);
    });
  });
});
