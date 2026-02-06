import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { app } from '../../index';
import { User } from '../../models';
import { connectDB, closeDB } from '../../db';

vi.mock('../../utils/jwt', async () => {
  const actual = await vi.importActual('../../utils/jwt');
  return {
    ...actual as any,
    authenticateJWT: vi.fn((req: any, res: any, next: any) => {
      req.user = { userId: 'admin-user', role: 'admin' };
      next();
    }),
    authorizeRoles: vi.fn(() => (req: any, res: any, next: any) => next())
  };
});

describe('User Routes', () => {
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

  describe('GET /api/users/role/:role', () => {
    it('should get users by role with pagination', async () => {
      const testUsers = [
        { id: 'user1', adSoyad: 'A', email: 'a@t.com', rol: 'student', sifre: '123' },
        { id: 'user2', adSoyad: 'B', email: 'b@t.com', rol: 'student', sifre: '123' }
      ];
      await User.insertMany(testUsers);

      const response = await request(app).get('/api/users/role/student');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /api/users/:userId', () => {
    it('should get user by ID', async () => {
      await User.create({ id: 'test-user', adSoyad: 'Test', email: 't@t.com', rol: 'student', sifre: '123' });
      const response = await request(app).get('/api/users/test-user');
      expect(response.status).toBe(200);
      expect(response.body.id).toBe('test-user');
    });
  });

  describe('PUT /api/users/:userId', () => {
    it('should update user successfully', async () => {
      await User.create({ id: 'test-user', adSoyad: 'Old', email: 't@t.com', rol: 'student', sifre: '123' });
      const response = await request(app).put('/api/users/test-user').send({ adSoyad: 'New' });
      expect(response.status).toBe(200);
      const updated = await User.findOne({ id: 'test-user' });
      expect(updated?.adSoyad).toBe('New');
    });
  });

  describe('DELETE /api/users/:userId', () => {
    it('should delete user successfully', async () => {
      await User.create({ id: 'test-user', adSoyad: 'Test', email: 't@t.com', rol: 'student', sifre: '123' });
      const response = await request(app).delete('/api/users/test-user');
      expect(response.status).toBe(204);
    });
  });
});
