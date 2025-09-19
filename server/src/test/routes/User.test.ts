import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { app } from '../../app';
import { User } from '../../models';

describe('User Routes', () => {
  beforeEach(async () => {
    // Clear database before each test
    await User.deleteMany({});
  });

  afterEach(async () => {
    // Clean up after each test
    await User.deleteMany({});
  });

  describe('GET /api/users/role/:role', () => {
    it('should get users by role with pagination', async () => {
      // Create test users
      const testUsers = [
        {
          id: 'user1',
          adSoyad: 'Ahmet Yılmaz',
          email: 'ahmet@test.com',
          rol: 'student',
          sinif: '10',
          sube: 'A'
        },
        {
          id: 'user2',
          adSoyad: 'Ayşe Demir',
          email: 'ayse@test.com',
          rol: 'student',
          sinif: '10',
          sube: 'B'
        },
        {
          id: 'user3',
          adSoyad: 'Mehmet Kaya',
          email: 'mehmet@test.com',
          rol: 'teacher',
          sinif: '10',
          sube: 'A'
        }
      ];

      await User.insertMany(testUsers);

      const response = await request(app)
        .get('/api/users/role/student')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1
      });
      expect(response.body.data[0].adSoyad).toBe('Ahmet Yılmaz');
      expect(response.body.data[1].adSoyad).toBe('Ayşe Demir');
    });

    it('should filter users by search term', async () => {
      const testUsers = [
        {
          id: 'user1',
          adSoyad: 'Ahmet Yılmaz',
          email: 'ahmet@test.com',
          rol: 'student'
        },
        {
          id: 'user2',
          adSoyad: 'Ayşe Demir',
          email: 'ayse@test.com',
          rol: 'student'
        }
      ];

      await User.insertMany(testUsers);

      const response = await request(app)
        .get('/api/users/role/student')
        .query({ search: 'Ahmet' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].adSoyad).toBe('Ahmet Yılmaz');
    });

    it('should return empty array for non-existent role', async () => {
      const response = await request(app)
        .get('/api/users/role/nonexistent');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
      expect(response.body.pagination.total).toBe(0);
    });
  });

  describe('GET /api/users/:userId', () => {
    it('should get user by ID', async () => {
      const testUser = {
        id: 'test-user',
        adSoyad: 'Test User',
        email: 'test@test.com',
        rol: 'student'
      };

      await User.create(testUser);

      const response = await request(app)
        .get('/api/users/test-user');

      expect(response.status).toBe(200);
      expect(response.body.adSoyad).toBe('Test User');
      expect(response.body.email).toBe('test@test.com');
      expect(response.body.sifre).toBeUndefined(); // Password should be excluded
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('PUT /api/users/:userId', () => {
    it('should update user successfully', async () => {
      const testUser = {
        id: 'test-user',
        adSoyad: 'Test User',
        email: 'test@test.com',
        rol: 'student'
      };

      await User.create(testUser);

      const updateData = {
        adSoyad: 'Updated User',
        sinif: '11'
      };

      const response = await request(app)
        .put('/api/users/test-user')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify the update
      const updatedUser = await User.findOne({ id: 'test-user' });
      expect(updatedUser?.adSoyad).toBe('Updated User');
      expect(updatedUser?.sinif).toBe('11');
    });

    it('should hash password when updating', async () => {
      const testUser = {
        id: 'test-user',
        adSoyad: 'Test User',
        email: 'test@test.com',
        sifre: 'oldpassword',
        rol: 'student'
      };

      await User.create(testUser);

      const updateData = {
        sifre: 'newpassword'
      };

      const response = await request(app)
        .put('/api/users/test-user')
        .send(updateData);

      expect(response.status).toBe(200);

      // Verify password was hashed
      const updatedUser = await User.findOne({ id: 'test-user' });
      expect(updatedUser?.sifre).not.toBe('newpassword');
      expect(updatedUser?.sifre).toMatch(/^\$2[aby]\$\d{1,2}\$[./A-Za-z0-9]{53}$/); // bcrypt hash pattern
    });
  });

  describe('DELETE /api/users/:userId', () => {
    it('should delete user successfully', async () => {
      const testUser = {
        id: 'test-user',
        adSoyad: 'Test User',
        email: 'test@test.com',
        rol: 'student'
      };

      await User.create(testUser);

      const response = await request(app)
        .delete('/api/users/test-user');

      expect(response.status).toBe(204);

      // Verify user was deleted
      const deletedUser = await User.findOne({ id: 'test-user' });
      expect(deletedUser).toBeNull();
    });
  });
});
