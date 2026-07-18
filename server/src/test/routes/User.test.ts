import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { app } from '../../index';
import { User } from '../../models';
import { connectDB, closeDB } from '../../db';

vi.mock('../../utils/jwt', async () => {
  const actual = await vi.importActual('../../utils/jwt');
  return {
    ...(actual as any),
    authenticateJWT: vi.fn((req: any, res: any, next: any) => {
      req.user = { userId: 'admin-user', role: 'admin' };
      next();
    }),
    authorizeRoles: vi.fn(() => (req: any, res: any, next: any) => next()),
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
        { id: 'user2', adSoyad: 'B', email: 'b@t.com', rol: 'student', sifre: '123' },
      ];
      await User.insertMany(testUsers);

      const response = await request(app).get('/api/users/role/student');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /api/users/list', () => {
    it('paginates across every role when no role filter is given', async () => {
      await User.insertMany([
        { id: 'u1', adSoyad: 'Ahmet', rol: 'student', sifre: '123' },
        { id: 'u2', adSoyad: 'Berkay', rol: 'teacher', sifre: '123' },
        { id: 'u3', adSoyad: 'Ceyda', rol: 'parent', sifre: '123' },
      ]);

      const res = await request(app).get('/api/users/list?limit=2&page=1');

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBe(2);
      expect(res.body.pagination).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });

      const res2 = await request(app).get('/api/users/list?limit=2&page=2');
      expect(res2.body.users.length).toBe(1);
    });

    it('filters by role when one is given', async () => {
      await User.insertMany([
        { id: 'u1', adSoyad: 'Ahmet', rol: 'student', sifre: '123' },
        { id: 'u2', adSoyad: 'Berkay', rol: 'teacher', sifre: '123' },
      ]);

      const res = await request(app).get('/api/users/list?role=teacher');

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBe(1);
      expect(res.body.users[0].rol).toBe('teacher');
    });

    it('searches by name across all roles', async () => {
      await User.insertMany([
        { id: 'u1', adSoyad: 'Ahmet Yılmaz', rol: 'student', sifre: '123' },
        { id: 'u2', adSoyad: 'Berkay Kaya', rol: 'teacher', sifre: '123' },
      ]);

      const res = await request(app).get('/api/users/list').query({ search: 'Yılmaz' });

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBe(1);
      expect(res.body.users[0].id).toBe('u1');
    });

    it('never returns the password hash field', async () => {
      await User.create({ id: 'u1', adSoyad: 'Ahmet', rol: 'student', sifre: '123' });

      const res = await request(app).get('/api/users/list');

      expect(res.body.users[0].sifre).toBeUndefined();
    });
  });

  describe('GET /api/users/:userId', () => {
    it('should get user by ID', async () => {
      await User.create({
        id: 'test-user',
        adSoyad: 'Test',
        email: 't@t.com',
        rol: 'student',
        sifre: '123',
      });
      const response = await request(app).get('/api/users/test-user');
      expect(response.status).toBe(200);
      expect(response.body.id).toBe('test-user');
    });
  });

  describe('PUT /api/users/:userId', () => {
    it('should update user successfully', async () => {
      await User.create({
        id: 'test-user',
        adSoyad: 'Old',
        email: 't@t.com',
        rol: 'student',
        sifre: '123',
      });
      const response = await request(app).put('/api/users/test-user').send({ adSoyad: 'New' });
      expect(response.status).toBe(200);
      const updated = await User.findOne({ id: 'test-user' });
      expect(updated?.adSoyad).toBe('New');
    });
  });

  describe('DELETE /api/users/:userId', () => {
    it('should delete user successfully', async () => {
      await User.create({
        id: 'test-user',
        adSoyad: 'Test',
        email: 't@t.com',
        rol: 'student',
        sifre: '123',
      });
      const response = await request(app).delete('/api/users/test-user');
      expect(response.status).toBe(204);
    });
  });
});
