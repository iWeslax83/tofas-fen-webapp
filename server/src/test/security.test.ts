import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../index'
import { connectDB, closeDB } from '../db'
import { User } from '../models/User'

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'mocked-message-id' }),
    }),
  },
}));

vi.mock('express-rate-limit', () => ({
  default: vi.fn(() => (req: any, res: any, next: any) => next())
}));

describe('Security Tests', () => {
  beforeAll(async () => {
    await connectDB();
    try {
      await User.collection.dropIndexes();
    } catch (e) {
      // Ignore if collection doesn't exist
    }
    await User.ensureIndexes();
  });

  afterAll(async () => {
    await closeDB();
  });

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Input Validation and Sanitization', () => {
    it('should prevent SQL injection attempts', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --",
        "' UNION SELECT * FROM users --"
      ]

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            id: payload,
            sifre: 'password123'
          })

        // Should return 401 for bad credentials or 400 for validation
        expect([400, 401]).toContain(response.status);
      }
    })

    it('should prevent XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("xss")',
        '<svg onload="alert(1)">',
        '"><script>alert("xss")</script>'
      ]

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            id: payload,
            sifre: payload
          })

        expect([400, 401]).toContain(response.status);
      }
    })

    it('should prevent NoSQL injection', async () => {
      const nosqlPayloads = [
        { $ne: null },
        { $gt: '' },
        { $where: '1==1' },
      ]

      for (const payload of nosqlPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            id: payload,
            sifre: 'password123'
          })

        // NoSQL injection payloads should be caught by validation or rejected by MongoDB
        expect([400, 401]).toContain(response.status);
      }
    })
  })

  describe('Authentication Security', () => {
    it('should not reveal user existence in login', async () => {
      const existingUser = 'existinguser'
      const nonExistingUser = 'nonexistinguser'

      const existingResponse = await request(app)
        .post('/api/auth/login')
        .send({
          id: existingUser,
          sifre: 'wrongpassword'
        })

      const nonExistingResponse = await request(app)
        .post('/api/auth/login')
        .send({
          id: nonExistingUser,
          sifre: 'wrongpassword'
        })

      // Compare only the error message, ignoring timestamp or requestId
      const msg1 = existingResponse.body.error?.message || existingResponse.body.error;
      const msg2 = nonExistingResponse.body.error?.message || nonExistingResponse.body.error;

      expect(msg1).toBe(msg2)
    })
  })

  describe('Headers Security', () => {
    it('should set secure headers', async () => {
      const response = await request(app)
        .get('/api/auth/me')

      // Check for security headers set by Helmet
      expect(response.headers).toHaveProperty('x-content-type-options')
      expect(response.headers['x-content-type-options']).toBe('nosniff')

      expect(response.headers).toHaveProperty('x-frame-options')
      expect(['DENY', 'SAMEORIGIN']).toContain(response.headers['x-frame-options'])
    })
  })

  describe('Content Security', () => {
    it('should validate JSON payloads', async () => {
      const invalidPayloads = [
        'invalid json',
        '{invalid:json}',
      ]

      for (const payload of invalidPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .set('Content-Type', 'application/json')
          .send(payload)

        // Invalid JSON should be 400 Bad Request
        expect(response.status).toBe(400)
      }
    })
  })
})