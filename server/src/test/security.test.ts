import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'mocked-message-id' }),
    }),
  },
}));
import request from 'supertest'
import express from 'express'
import authRoutes from '../routes/auth'

const app = express()
app.use(express.json())
app.use('/auth', authRoutes)

describe('Security Tests', () => {
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
          .post('/auth/login')
          .send({
            id: payload,
            sifre: 'password123'
          })

        // Should not crash and should return proper error response
        expect(response.status).toBe(401)
        expect(response.body).toHaveProperty('error')
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
          .post('/auth/login')
          .send({
            id: payload,
            sifre: payload
          })

        // Should handle XSS payloads safely
        expect(response.status).toBe(401)
        expect(response.body).toHaveProperty('error')
      }
    })

    it('should prevent NoSQL injection', async () => {
      const nosqlPayloads = [
        { $ne: null },
        { $gt: '' },
        { $where: '1==1' },
        { $regex: '.*' }
      ]

      for (const payload of nosqlPayloads) {
        const response = await request(app)
          .post('/auth/login')
          .send({
            id: payload,
            sifre: 'password123'
          })

        // Should handle NoSQL injection safely
        expect(response.status).toBe(400) // Should be bad request
      }
    })

    it('should validate email format', async () => {
      const invalidEmails = [
        'invalid-email',
        'test@',
        '@example.com',
        'test..test@example.com',
        'test@example..com',
        'test@example.com.',
        'test@.example.com'
      ]

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/auth/forgot-password')
          .send({ email })

        // Should reject invalid email formats
        expect(response.status).toBe(400)
      }
    })

    it('should enforce password strength requirements', async () => {
      const weakPasswords = [
        '123',
        'password',
        'abc123',
        'qwerty',
        '123456789'
      ]

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/auth/reset-password')
          .send({
            token: 'valid-token',
            newPassword: password
          })

        // Should reject weak passwords
        expect(response.status).toBe(400)
      }
    })
  })

  describe('Authentication Security', () => {
    it('should not reveal user existence in login', async () => {
      const existingUser = 'existinguser'
      const nonExistingUser = 'nonexistinguser'

      const existingResponse = await request(app)
        .post('/auth/login')
        .send({
          id: existingUser,
          sifre: 'wrongpassword'
        })

      const nonExistingResponse = await request(app)
        .post('/auth/login')
        .send({
          id: nonExistingUser,
          sifre: 'wrongpassword'
        })

      // Both should return the same error message to prevent user enumeration
      expect(existingResponse.body.error).toBe(nonExistingResponse.body.error)
    })

    it('should not reveal user existence in forgot password', async () => {
      const existingEmail = 'existing@example.com'
      const nonExistingEmail = 'nonexisting@example.com'

      const existingResponse = await request(app)
        .post('/auth/forgot-password')
        .send({ email: existingEmail })

      const nonExistingResponse = await request(app)
        .post('/auth/forgot-password')
        .send({ email: nonExistingEmail })

      // Both should return success to prevent email enumeration
      expect(existingResponse.status).toBe(200)
      expect(nonExistingResponse.status).toBe(200)
    })


    it('should enforce rate limiting on login', async () => {
      const requests: Promise<request.Response>[] = [];

      // Send multiple rapid requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/auth/login')
            .send({
              id: 'testuser',
              sifre: 'password123'
            })
        );
      }

      const responses: request.Response[] = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      // Should have rate limited some requests
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should enforce rate limiting on forgot password', async () => {
      const requests: Promise<request.Response>[] = [];

      // Send multiple rapid requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/auth/forgot-password')
            .send({ email: 'test@example.com' })
        );
      }

      const responses: request.Response[] = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      // Should have rate limited some requests
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  })

  describe('Token Security', () => {
    it('should reject expired tokens', async () => {
      // Mock an expired token
      vi.doMock('jsonwebtoken', () => ({
        verify: vi.fn().mockImplementation(() => {
          throw new Error('TokenExpiredError')
        })
      }))

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer expired-token')

      expect(response.status).toBe(401)
    })

    it('should reject malformed tokens', async () => {
      const malformedTokens = [
        'invalid-token',
        'Bearer',
        'Bearer ',
        'Bearer invalid.token.format',
        'Basic dXNlcjpwYXNz',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'
      ]

      for (const token of malformedTokens) {
        const response = await request(app)
          .get('/auth/me')
          .set('Authorization', token)

        expect(response.status).toBe(401)
      }
    })

    it('should invalidate tokens on logout', async () => {
      // First login to get tokens
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          id: 'testuser',
          sifre: 'password123'
        })

      if (loginResponse.status === 200) {
        const accessToken = loginResponse.body.accessToken

        // Try to use the token before logout
        const beforeLogoutResponse = await request(app)
          .get('/auth/me')
          .set('Authorization', `Bearer ${accessToken}`)

        // Logout
        await request(app)
          .post('/auth/logout')
          .set('Authorization', `Bearer ${accessToken}`)

        // Try to use the token after logout
        const afterLogoutResponse = await request(app)
          .get('/auth/me')
          .set('Authorization', `Bearer ${accessToken}`)

        // Token should be invalid after logout
        expect(afterLogoutResponse.status).toBe(401)
      }
    })
  })

  describe('CSRF Protection', () => {
    it('should require CSRF token for state-changing operations', async () => {
      const stateChangingEndpoints = [
        { method: 'POST', path: '/auth/logout' },
        { method: 'POST', path: '/auth/reset-password' }
      ]

      for (const endpoint of stateChangingEndpoints) {
        const response = await request(app)
          [endpoint.method.toLowerCase()](endpoint.path)
          .send({})

        // Should require CSRF token
        expect(response.status).toBe(403)
      }
    })
  })

  describe('Headers Security', () => {
    it('should set secure headers', async () => {
      const response = await request(app)
        .get('/auth/me')

      // Check for security headers
      expect(response.headers).toHaveProperty('x-content-type-options')
      expect(response.headers['x-content-type-options']).toBe('nosniff')

      expect(response.headers).toHaveProperty('x-frame-options')
      expect(response.headers['x-frame-options']).toBe('DENY')

      expect(response.headers).toHaveProperty('x-xss-protection')
      expect(response.headers['x-xss-protection']).toBe('1; mode=block')
    })
  })

  describe('Content Security', () => {
    it('should prevent content type sniffing', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'text/plain')
        .send('{"id":"test","sifre":"password"}')

      expect(response.status).toBe(400) // Should reject wrong content type
    })

    it('should validate JSON payloads', async () => {
      const invalidPayloads = [
        'invalid json',
        '{invalid:json}',
        '{"id": "test", "sifre":}',
        '{"id": "test", "sifre": "password",}'
      ]

      for (const payload of invalidPayloads) {
        const response = await request(app)
          .post('/auth/login')
          .set('Content-Type', 'application/json')
          .send(payload)

        expect(response.status).toBe(400)
      }
    })
  })
})