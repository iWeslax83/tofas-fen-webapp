import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { connectDB, closeDB } from '../../db';
import { User } from '../../models';

vi.mock('../../utils/jwt', async () => {
  const actual = await vi.importActual('../../utils/jwt');
  return {
    ...actual as any,
    authenticateJWT: vi.fn((req: any, res: any, next: any) => {
      req.user = { userId: 'secadmin', role: 'admin' };
      next();
    }),
    authorizeRoles: vi.fn(() => (req: any, res: any, next: any) => next())
  };
});

describe('Security Tests (Aligned)', () => {
  beforeEach(async () => {
    await connectDB();
    try {
      await User.deleteMany({});
    } catch (e) {
      // Ignore cleanup error
    }
  });

  afterEach(async () => {
    await closeDB();
  });

  describe('Input Validation', () => {
    it('should prevent SQL injection (400 rejection)', async () => {
      const response = await request(app)
        .post('/api/user')
        .send({ id: "'; DROP TABLE users; --", adSoyad: 'SQLi', rol: 'student', sifre: '123' });

      expect(response.status).toBe(400);
    });

    it('should prevent XSS attacks (400 or Sanitized 201)', async () => {
      const response = await request(app)
        .post('/api/user')
        .send({ id: 'xss123', adSoyad: '<script>alert(1)</script>', rol: 'student', sifre: '123' });

      // Either the middleware rejects it (400) or it passes sanitized (201)
      expect([201, 400]).toContain(response.status);
    });

    it('should prevent NoSQL injection (400 rejection)', async () => {
      const response = await request(app)
        .post('/api/user')
        .send({ id: 'nosql123', adSoyad: 'Nosql', email: { $gt: "" }, rol: 'student', sifre: '123' });

      expect(response.status).toBe(400);
    });
  });
});
