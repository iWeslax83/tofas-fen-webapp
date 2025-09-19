import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { connectDB, closeDB } from '../db';
import { User } from '../models';

// Test database setup
beforeEach(async () => {
  await connectDB();
  // Clear test data
  await User.deleteMany({});
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
        sube: 'A'
      };

      const response = await request(app)
        .post('/api/user')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.adSoyad).toBe(userData.adSoyad);
      expect(response.body.email).toBe(userData.email);
    });

    it('should validate required fields', async () => {
      const invalidUserData = {
        adSoyad: 'Test User'
        // Missing required fields: id, email, rol
      };

      const response = await request(app)
        .post('/api/user')
        .send(invalidUserData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Validation failed');
    });

    it('should prevent duplicate user IDs', async () => {
      // Create first user
      const userData = {
        id: 'duplicate123',
        adSoyad: 'First User',
        email: 'first@example.com',
        rol: 'student'
      };

      await request(app)
        .post('/api/user')
        .send(userData)
        .expect(201);

      // Try to create second user with same ID
      const duplicateUserData = {
        id: 'duplicate123',
        adSoyad: 'Second User',
        email: 'second@example.com',
        rol: 'teacher'
      };

      const response = await request(app)
        .post('/api/user')
        .send(duplicateUserData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('duplicate');
    });
  });

  describe('GET /api/user/:userId', () => {
    it('should retrieve user by ID', async () => {
      // Create a test user first
      const userData = {
        id: 'retrieve123',
        adSoyad: 'Retrieve User',
        email: 'retrieve@example.com',
        rol: 'parent'
      };

      const createResponse = await request(app)
        .post('/api/user')
        .send(userData)
        .expect(201);

      const userId = createResponse.body._id;

      // Retrieve the user
      const response = await request(app)
        .get(`/api/user/${userId}`)
        .expect(200);

      expect(response.body).toHaveProperty('_id', userId);
      expect(response.body.adSoyad).toBe(userData.adSoyad);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011'; // Valid MongoDB ObjectId format

      const response = await request(app)
        .get(`/api/user/${fakeId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Kullanıcı bulunamadı');
    });
  });

  describe('PUT /api/user/:userId', () => {
    it('should update user successfully', async () => {
      // Create a test user first
      const userData = {
        id: 'update123',
        adSoyad: 'Update User',
        email: 'update@example.com',
        rol: 'student'
      };

      const createResponse = await request(app)
        .post('/api/user')
        .send(userData)
        .expect(201);

      const userId = createResponse.body._id;

      // Update the user
      const updateData = {
        adSoyad: 'Updated User Name',
        sinif: '11'
      };

      const response = await request(app)
        .put(`/api/user/${userId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.adSoyad).toBe(updateData.adSoyad);
      expect(response.body.sinif).toBe(updateData.sinif);
      expect(response.body.email).toBe(userData.email); // Unchanged field
    });
  });

  describe('DELETE /api/user/:userId', () => {
    it('should delete user successfully', async () => {
      // Create a test user first
      const userData = {
        id: 'delete123',
        adSoyad: 'Delete User',
        email: 'delete@example.com',
        rol: 'teacher'
      };

      const createResponse = await request(app)
        .post('/api/user')
        .send(userData)
        .expect(201);

      const userId = createResponse.body._id;

      // Delete the user
      await request(app)
        .delete(`/api/user/${userId}`)
        .expect(200);

      // Verify user is deleted
      const getResponse = await request(app)
        .get(`/api/user/${userId}`)
        .expect(404);

      expect(getResponse.body.error).toBe('Kullanıcı bulunamadı');
    });
  });
});

describe('Authentication Tests', () => {
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      // Create a test user with password
      const userData = {
        id: 'login123',
        adSoyad: 'Login User',
        email: 'login@example.com',
        rol: 'student',
        sifre: 'password123'
      };

      await request(app)
        .post('/api/user')
        .send(userData)
        .expect(201);

      // Attempt login
      const loginData = {
        id: 'login123',
        sifre: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.id).toBe(loginData.id);
    });

    it('should reject invalid credentials', async () => {
      const loginData = {
        id: 'nonexistent',
        sifre: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Geçersiz kullanıcı adı veya şifre');
    });
  });
});

describe('Security Tests', () => {
  describe('Input Validation', () => {
    it('should prevent SQL injection attempts', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --"
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .post('/api/user')
          .send({
            id: payload,
            adSoyad: 'SQL Injection Test',
            email: 'test@example.com',
            rol: 'student'
          });

        // Should not crash and should return proper error response
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should prevent XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("xss")'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/user')
          .send({
            id: 'xss123',
            adSoyad: payload,
            email: 'xss@example.com',
            rol: 'student'
          });

        // Should sanitize input and not crash
        expect(response.status).toBe(201);
        // The payload should be sanitized
        expect(response.body.adSoyad).not.toContain('<script>');
        expect(response.body.adSoyad).not.toContain('javascript:');
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should limit repeated login attempts', async () => {
      const loginData = {
        id: 'ratelimit123',
        sifre: 'wrongpassword'
      };

      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(401);
      }

      // The next attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(429); // Too Many Requests
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('rate limit');
    });
  });
});

describe('Performance Tests', () => {
  describe('Database Query Performance', () => {
    it('should handle bulk user creation efficiently', async () => {
      const startTime = Date.now();
      
      // Create 100 users
      const userPromises = Array.from({ length: 100 }, (_, i) => {
        return request(app)
          .post('/api/user')
          .send({
            id: `bulk${i}`,
            adSoyad: `Bulk User ${i}`,
            email: `bulk${i}@example.com`,
            rol: 'student'
          });
      });

      await Promise.all(userPromises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
    });

    it('should retrieve users with pagination efficiently', async () => {
      // Create test users first
      const userPromises = Array.from({ length: 50 }, (_, i) => {
        return request(app)
          .post('/api/user')
          .send({
            id: `page${i}`,
            adSoyad: `Page User ${i}`,
            email: `page${i}@example.com`,
            rol: 'student'
          });
      });

      await Promise.all(userPromises);

      const startTime = Date.now();
      
      // Test pagination
      const response = await request(app)
        .get('/api/user?page=1&limit=20')
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(response.body).toHaveProperty('users');
      expect(response.body.users).toHaveLength(20);
      expect(duration).toBeLessThan(1000); // 1 second
    });
  });
});
