import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyAccessToken, 
  verifyRefreshToken,
  generateTokenPair,
  refreshTokens,
  authenticateJWT,
  authorizeRoles
} from '../jwt'
import { Request, Response, NextFunction } from 'express'

// Mock environment variables
process.env.JWT_SECRET = 'test-secret'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'

describe('JWT Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateAccessToken', () => {
    it('should generate access token', () => {
      const payload = { userId: '123', email: 'test@example.com', rol: 'user' }
      const token = generateAccessToken(payload)

      expect(token).toBeDefined()
      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      )
    })
  })

  describe('generateRefreshToken', () => {
    it('should generate refresh token', () => {
      const payload = { userId: '123', tokenVersion: 1 }
      const token = generateRefreshToken(payload)

      expect(token).toBeDefined()
      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      )
    })
  })

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const token = 'valid-token'
      const payload = verifyAccessToken(token)

      expect(payload).toEqual({ userId: 'test-user-id', email: 'test@example.com' })
      expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET)
    })

    it('should return null for invalid token', () => {
      vi.mocked(jwt.verify).mockImplementationOnce(() => {
        throw new Error('Invalid token')
      })

      const token = 'invalid-token'
      const payload = verifyAccessToken(token)

      expect(payload).toBeNull()
    })
  })

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const token = 'valid-refresh-token'
      const payload = verifyRefreshToken(token)

      expect(payload).toEqual({ userId: 'test-user-id', email: 'test@example.com' })
      expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_REFRESH_SECRET)
    })
  })

  describe('generateTokenPair', () => {
    it('should generate access and refresh tokens', () => {
      const userId = '123'
      const rol = 'user'
      const email = 'test@example.com'
      const tokenVersion = 1

      const tokens = generateTokenPair(userId, rol, email, tokenVersion)

      expect(tokens.accessToken).toBeDefined()
      expect(tokens.refreshToken).toBeDefined()
      expect(tokens.expiresIn).toBe(900) // 15 minutes in seconds
    })
  })

  describe('refreshTokens', () => {
    it('should refresh tokens with valid refresh token', () => {
      const refreshToken = 'valid-refresh-token'
      const newTokenVersion = 2

      const tokens = refreshTokens(refreshToken, newTokenVersion)

      expect(tokens.accessToken).toBeDefined()
      expect(tokens.refreshToken).toBeDefined()
      expect(tokens.expiresIn).toBe(900)
    })
  })

  describe('authenticateJWT', () => {
    it('should authenticate valid JWT token', async () => {
      const req = {
        headers: {
          authorization: 'Bearer valid-token'
        }
      } as Request

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response

      const next = vi.fn() as NextFunction

      await authenticateJWT(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.user).toEqual({ userId: 'test-user-id', email: 'test@example.com' })
    })

    it('should return 401 for missing authorization header', async () => {
      const req = {
        headers: {}
      } as Request

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response

      const next = vi.fn() as NextFunction

      await authenticateJWT(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' })
      expect(next).not.toHaveBeenCalled()
    })

    it('should return 401 for invalid token format', async () => {
      const req = {
        headers: {
          authorization: 'InvalidFormat valid-token'
        }
      } as Request

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response

      const next = vi.fn() as NextFunction

      await authenticateJWT(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' })
    })

    it('should return 401 for invalid token', async () => {
      vi.mocked(jwt.verify).mockImplementationOnce(() => {
        throw new Error('Invalid token')
      })

      const req = {
        headers: {
          authorization: 'Bearer invalid-token'
        }
      } as Request

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response

      const next = vi.fn() as NextFunction

      await authenticateJWT(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired access token' })
    })
  })

  describe('authorizeRoles', () => {
    it('should allow access for authorized role', () => {
      const req = {
        user: { rol: 'admin' }
      } as Request

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response

      const next = vi.fn() as NextFunction

      const middleware = authorizeRoles(['admin', 'user'])
      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    it('should deny access for unauthorized role', () => {
      const req = {
        user: { rol: 'guest' }
      } as Request

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as unknown as Response

      const next = vi.fn() as NextFunction

      const middleware = authorizeRoles(['admin', 'user'])
      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' })
      expect(next).not.toHaveBeenCalled()
    })
  })
})