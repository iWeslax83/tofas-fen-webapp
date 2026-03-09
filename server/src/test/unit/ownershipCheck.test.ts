import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../middleware/parentChildAccess', () => ({
  getParentChildIds: vi.fn().mockResolvedValue([]),
}));

import { requireOwnership, requireResourceOwnership } from '../../middleware/ownershipCheck';
import { getParentChildIds } from '../../middleware/parentChildAccess';
import { Request, Response, NextFunction } from 'express';

function createMockReq(user: any, overrides: Partial<Request> = {}): Partial<Request> {
  return {
    user,
    params: {},
    body: {},
    query: {},
    path: '/api/test',
    method: 'GET',
    ip: '127.0.0.1',
    ...overrides,
  };
}

function createMockRes() {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res;
}

describe('Ownership Check Middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe('requireOwnership', () => {
    it('should return 401 if no user', async () => {
      const middleware = requireOwnership('params.userId');
      const req = createMockReq(undefined);
      const res = createMockRes();

      await middleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow admin users to access any resource', async () => {
      const middleware = requireOwnership('params.userId');
      const req = createMockReq(
        { userId: 'admin1', role: 'admin' },
        { params: { userId: 'other-user' } }
      );
      const res = createMockRes();

      await middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });

    it('should allow teacher users to access any resource', async () => {
      const middleware = requireOwnership('params.userId');
      const req = createMockReq(
        { userId: 'teacher1', role: 'teacher' },
        { params: { userId: 'student1' } }
      );
      const res = createMockRes();

      await middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });

    it('should allow users to access their own resources', async () => {
      const middleware = requireOwnership('params.userId');
      const req = createMockReq(
        { userId: 'user1', role: 'student' },
        { params: { userId: 'user1' } }
      );
      const res = createMockRes();

      await middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });

    it('should block users from accessing others resources', async () => {
      const middleware = requireOwnership('params.userId');
      const req = createMockReq(
        { userId: 'user1', role: 'student' },
        { params: { userId: 'user2' } }
      );
      const res = createMockRes();

      await middleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should read userId from body', async () => {
      const middleware = requireOwnership('body.userId');
      const req = createMockReq(
        { userId: 'user1', role: 'student' },
        { body: { userId: 'user1' } }
      );
      const res = createMockRes();

      await middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });

    it('should read userId from query', async () => {
      const middleware = requireOwnership('query.userId');
      const req = createMockReq(
        { userId: 'user1', role: 'student' },
        { query: { userId: 'user1' } }
      );
      const res = createMockRes();

      await middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 400 if target userId is missing', async () => {
      const middleware = requireOwnership('params.userId');
      const req = createMockReq(
        { userId: 'user1', role: 'student' },
        { params: {} }
      );
      const res = createMockRes();

      await middleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should allow parent access to child resources when enabled', async () => {
      (getParentChildIds as any).mockResolvedValue(['child1', 'child2']);

      const middleware = requireOwnership('params.userId', { allowParentAccess: true });
      const req = createMockReq(
        { userId: 'parent1', role: 'parent' },
        { params: { userId: 'child1' } }
      );
      const res = createMockRes();

      await middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });

    it('should block parent access to non-child resources', async () => {
      (getParentChildIds as any).mockResolvedValue(['child1', 'child2']);

      const middleware = requireOwnership('params.userId', { allowParentAccess: true });
      const req = createMockReq(
        { userId: 'parent1', role: 'parent' },
        { params: { userId: 'someone-else' } }
      );
      const res = createMockRes();

      await middleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should allow additional roles specified in options', async () => {
      const middleware = requireOwnership('params.userId', { allowedRoles: ['moderator'] });
      const req = createMockReq(
        { userId: 'mod1', role: 'moderator' },
        { params: { userId: 'other-user' } }
      );
      const res = createMockRes();

      await middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireResourceOwnership', () => {
    it('should allow when resource owner matches user', async () => {
      const middleware = requireResourceOwnership(() => 'user1');
      const req = createMockReq({ userId: 'user1', role: 'student' });
      const res = createMockRes();

      await middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });

    it('should block when resource owner does not match', async () => {
      const middleware = requireResourceOwnership(() => 'user2');
      const req = createMockReq({ userId: 'user1', role: 'student' });
      const res = createMockRes();

      await middleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 when resource owner is undefined', async () => {
      const middleware = requireResourceOwnership(() => undefined);
      const req = createMockReq({ userId: 'user1', role: 'student' });
      const res = createMockRes();

      await middleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should allow admin access regardless of owner', async () => {
      const middleware = requireResourceOwnership(() => 'other-user');
      const req = createMockReq({ userId: 'admin1', role: 'admin' });
      const res = createMockRes();

      await middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
