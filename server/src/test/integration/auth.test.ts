import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { connectDB, closeDB } from '../../db';
import { User } from '../../models';
import bcrypt from 'bcryptjs';

// Test database setup
beforeEach(async () => {
  await connectDB();
  // Clear test data
  await User.deleteMany({});
});

afterEach(async () => {
  await closeDB();
});

describe('Authentication Integration Tests', () => {
  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      // Create a test user with hashed password
      const hashedPassword = await bcrypt.hash('password123', 10);
      const userData = {
        id: 'login123',
        adSoyad: 'Login User',
        email: 'login@example.com',
        rol: 'student',
        sifre: hashedPassword
      };

      await User.create(userData);

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
      expect(response.body.user.adSoyad).toBe(userData.adSoyad);
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

    it('should reject empty credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject malformed request body', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        id: 'register123',
        adSoyad: 'Register User',
        email: 'register@example.com',
        rol: 'student',
        sifre: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('id', userData.id);
      expect(response.body).toHaveProperty('adSoyad', userData.adSoyad);
      expect(response.body).toHaveProperty('email', userData.email);
      expect(response.body).toHaveProperty('rol', userData.rol);
      expect(response.body).not.toHaveProperty('sifre'); // Password should not be returned
    });

    it('should prevent duplicate user registration', async () => {
      const userData = {
        id: 'duplicate123',
        adSoyad: 'First User',
        email: 'first@example.com',
        rol: 'student',
        sifre: 'password123'
      };

      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try to register duplicate
      const duplicateData = {
        id: 'duplicate123',
        adSoyad: 'Second User',
        email: 'second@example.com',
        rol: 'teacher',
        sifre: 'password456'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('duplicate');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        adSoyad: 'Invalid User'
        // Missing required fields: id, email, rol, sifre
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      // Create a test user
      const hashedPassword = await bcrypt.hash('password123', 10);
      const userData = {
        id: 'refresh123',
        adSoyad: 'Refresh User',
        email: 'refresh@example.com',
        rol: 'student',
        sifre: hashedPassword
      };

      const user = await User.create(userData);

      // Login to get tokens
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          id: 'refresh123',
          sifre: 'password123'
        })
        .expect(200);

      const { token, refreshToken } = loginResponse.body;

      // Refresh token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${token}`)
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('token');
      expect(refreshResponse.body).toHaveProperty('refreshToken');
      expect(refreshResponse.body.token).not.toBe(token); // Should be different
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      // Create and login user
      const hashedPassword = await bcrypt.hash('password123', 10);
      const userData = {
        id: 'logout123',
        adSoyad: 'Logout User',
        email: 'logout@example.com',
        rol: 'student',
        sifre: hashedPassword
      };

      await User.create(userData);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          id: 'logout123',
          sifre: 'password123'
        })
        .expect(200);

      const { token } = loginResponse.body;

      // Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(logoutResponse.body).toHaveProperty('message');
      expect(logoutResponse.body.message).toBe('Başarıyla çıkış yapıldı');
    });

    it('should reject logout without valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user info', async () => {
      // Create and login user
      const hashedPassword = await bcrypt.hash('password123', 10);
      const userData = {
        id: 'me123',
        adSoyad: 'Me User',
        email: 'me@example.com',
        rol: 'student',
        sifre: hashedPassword
      };

      await User.create(userData);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          id: 'me123',
          sifre: 'password123'
        })
        .expect(200);

      const { token } = loginResponse.body;

      // Get current user info
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(meResponse.body).toHaveProperty('id', userData.id);
      expect(meResponse.body).toHaveProperty('adSoyad', userData.adSoyad);
      expect(meResponse.body).toHaveProperty('email', userData.email);
      expect(meResponse.body).toHaveProperty('rol', userData.rol);
      expect(meResponse.body).not.toHaveProperty('sifre');
    });

    it('should reject request without valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should initiate password reset for existing user', async () => {
      // Create test user
      const userData = {
        id: 'forgot123',
        adSoyad: 'Forgot User',
        email: 'forgot@example.com',
        rol: 'student',
        sifre: await bcrypt.hash('password123', 10)
      };

      await User.create(userData);

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'forgot@example.com' })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('şifre sıfırlama');
    });

    it('should handle non-existent email gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      // Should not reveal whether email exists or not
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      // Create test user with reset token
      const resetToken = 'valid-reset-token-123';
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
      
      const userData = {
        id: 'reset123',
        adSoyad: 'Reset User',
        email: 'reset@example.com',
        rol: 'student',
        sifre: await bcrypt.hash('oldpassword', 10),
        resetToken,
        resetTokenExpiry
      };

      await User.create(userData);

      const resetData = {
        token: resetToken,
        newPassword: 'newpassword123'
      };

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(resetData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('şifre başarıyla');

      // Verify password was changed
      const updatedUser = await User.findOne({ id: 'reset123' });
      const isNewPasswordValid = await bcrypt.compare('newpassword123', updatedUser!.sifre!);
      expect(isNewPasswordValid).toBe(true);
    });

    it('should reject expired reset token', async () => {
      // Create test user with expired reset token
      const resetToken = 'expired-reset-token-123';
      const resetTokenExpiry = new Date(Date.now() - 3600000); // 1 hour ago
      
      const userData = {
        id: 'expired123',
        adSoyad: 'Expired User',
        email: 'expired@example.com',
        rol: 'student',
        sifre: await bcrypt.hash('oldpassword', 10),
        resetToken,
        resetTokenExpiry
      };

      await User.create(userData);

      const resetData = {
        token: resetToken,
        newPassword: 'newpassword123'
      };

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(resetData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('geçersiz');
    });
  });
});
