import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { connectDB, closeDB } from '../../db';
import { User, Announcement, Homework } from '../../models';

vi.mock('../../middleware/security', () => ({
  preventSQLInjection: (req: any, res: any, next: any) => next(),
  preventXSS: (req: any, res: any, next: any) => next(),
  sanitizeInput: (req: any, res: any, next: any) => next(),
  csrfProtection: (req: any, res: any, next: any) => next()
}));

vi.mock('express-rate-limit', () => {
  const mock = vi.fn(() => (req: any, res: any, next: any) => next());
  return {
    default: mock,
    rateLimit: mock
  };
});

vi.mock('../../utils/jwt', async () => {
  const actual = await vi.importActual('../../utils/jwt');
  return {
    ...actual as any,
    authenticateJWT: vi.fn((req: any, res: any, next: any) => {
      req.user = { userId: 'loadtest', role: 'student', adSoyad: 'Load Test User' };
      next();
    }),
    authorizeRoles: vi.fn(() => (req: any, res: any, next: any) => next())
  };
});

// Test database setup
beforeAll(async () => {
  await connectDB();
  try {
    await User.deleteMany({});
    await Announcement.deleteMany({});
    await Homework.deleteMany({});
  } catch (e) {
    // Ignore cleanup error
  }
}, 30000);

afterAll(async () => {
  await closeDB();
}, 30000);

describe('Load Tests', () => {
  describe('User API Load Tests', () => {
    it('should handle concurrent user creation', async () => {
      const startTime = Date.now();
      const userPromises = Array.from({ length: 50 }, (_, i) => {
        return request(app)
          .post('/api/user')
          .send({
            id: `loadtest${i}`,
            adSoyad: `Load Test User ${i}`,
            email: `loadtest${i}@example.com`,
            rol: 'student',
            sifre: 'password123'
          });
      });

      const results = await Promise.all(userPromises);
      const duration = Date.now() - startTime;

      results.forEach(result => {
        expect(result.status).toBe(201);
      });
      expect(duration).toBeLessThan(15000);
    });
  });

  describe('Announcements API Load Tests', () => {
    it('should handle concurrent announcement creation', async () => {
      const announcementPromises = Array.from({ length: 20 }, (_, i) => {
        return request(app)
          .post('/api/announcements')
          .send({
            title: `Load Test Announcement ${i}`,
            content: `This is load test announcement ${i}`,
            priority: 'normal',
            targetRoles: ['student']
          });
      });

      const results = await Promise.all(announcementPromises);
      results.forEach(result => {
        expect(result.status).toBe(201);
      });
    });
  });

  describe('Homework API Load Tests', () => {
    it('should handle concurrent homework creation', async () => {
      const homeworkPromises = Array.from({ length: 20 }, (_, i) => {
        return request(app)
          .post('/api/homeworks')
          .send({
            title: `Load Test Homework ${i}`,
            description: `This is load test homework ${i}`,
            subject: 'Matematik',
            classLevel: '10',
            classSection: 'A',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          });
      });

      const results = await Promise.all(homeworkPromises);
      results.forEach(result => {
        expect(result.status).toBe(201);
      });
    });
  });
});