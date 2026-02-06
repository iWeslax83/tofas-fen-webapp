import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { connectDB, closeDB } from '../db';
import { User } from '../models';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../middleware/security', () => ({
  preventSQLInjection: (req: Request, res: Response, next: NextFunction) => {
    // Basic pattern check for SQLi in mock
    const bodyStr = JSON.stringify((req as Request & { body?: unknown }).body);
    if (bodyStr && (bodyStr.includes("'") || bodyStr.includes("--"))) {
      return res.status(400).json({ error: 'Validation failed' });
    }
    next();
  },
  preventXSS: (req: Request, res: Response, next: NextFunction) => next(),
  sanitizeInput: (req: Request, res: Response, next: NextFunction) => next(),
  csrfProtection: (req: Request, res: Response, next: NextFunction) => next()
}));

vi.mock('express-rate-limit', () => {
  const mock = vi.fn(() => (req: Request, res: Response, next: NextFunction) => next());
  return {
    default: mock,
    rateLimit: mock
  };
});

vi.mock('../utils/jwt', async () => {
  const actual = await vi.importActual('../utils/jwt');
  return {
    ...(actual as Record<string, unknown>),
    authenticateJWT: vi.fn((req: Request & { user?: unknown }, res: Response, next: NextFunction) => {
      (req as Request & { user?: { userId: string; role: string } }).user = { userId: 'testadmin', role: 'admin' };
      next();
    }),
    authorizeRoles: vi.fn(() => (req: Request, res: Response, next: NextFunction) => next())
  };
});

beforeEach(async () => {
  await connectDB();
  try {
    await User.deleteMany({});
  } catch (err) {
    // ignore cleanup errors in tests but log for visibility
    // eslint-disable-next-line no-console
    console.warn('Test DB cleanup error', err);
  }
});

afterEach(async () => {
  await closeDB();
});

describe('User API Tests', () => {
  describe('POST /api/user', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        id: 'test123',
        adSoyad: 'Test User',
        email: 'test@example.com',
        rol: 'student',
        sinif: '10',
        sube: 'A',
        sifre: 'password123'
      };

      const response = await request(app)
        .post('/api/user')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('id', userData.id);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/user')
        .send({ adSoyad: 'Partial' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should prevent duplicate user IDs', async () => {
      const userData = {
        id: 'dup123',
        adSoyad: 'First',
        rol: 'student',
        sifre: '123'
      };

      await request(app).post('/api/user').send(userData).expect(201);

      const response = await request(app)
        .post('/api/user')
        .send(userData)
        .expect(400);

      expect(response.body.error.toLowerCase()).toContain('exist');
    });
  });

  describe('GET /api/user/:userId', () => {
    it('should retrieve user by ID', async () => {
      await request(app)
        .post('/api/user')
        .send({ id: 'get123', adSoyad: 'Get', rol: 'student', sifre: '123' })
        .expect(201);

      const response = await request(app)
        .get('/api/user/get123')
        .expect(200);

      expect(response.body.id).toBe('get123');
    });
  });

  describe('DELETE /api/user/:userId', () => {
    it('should delete user successfully', async () => {
      await request(app)
        .post('/api/user')
        .send({ id: 'del123', adSoyad: 'Del', rol: 'student', sifre: '123' })
        .expect(201);

      await request(app)
        .delete('/api/user/del123')
        .expect(204);
    });
  });
});

