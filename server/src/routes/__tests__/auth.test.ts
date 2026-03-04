import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import bcrypt from 'bcryptjs'
import { User } from '../../models/User'
import authRoutes from '../auth'

vi.mock('../../models/User')
vi.mock('bcryptjs')
vi.mock('../../utils/jwt', async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    generateAccessToken: vi.fn(() => 'access-token'),
    generateRefreshToken: vi.fn(() => 'refresh-token'),
    verifyRefreshToken: vi.fn(() => ({ userId: 'testuser', tokenVersion: 1 }))
  }
})
vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(() => ({ userId: 'testuser' })),
    sign: vi.fn(() => 'token')
  },
  verify: vi.fn(() => ({ userId: 'testuser' })),
  sign: vi.fn(() => 'token')
}))
vi.mock('../../mailService', () => ({
  sendMail: vi.fn().mockResolvedValue(true)
}))

const app = express()
app.use(express.json())
app.use('/auth', authRoutes)

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const mockUser = {
        id: 'testuser',
        email: 'test@example.com',
        sifre: 'hashed-password',
        rol: 'user',
        tokenVersion: 0,
        save: vi.fn().mockResolvedValue(true),
        toObject: () => ({
          id: 'testuser',
          email: 'test@example.com',
          rol: 'user'
        })
      }

      vi.mocked(User.findOne).mockResolvedValue(mockUser as any)
      vi.mocked(bcrypt.compare).mockResolvedValue(true as any)

      const response = await request(app)
        .post('/auth/login')
        .send({
          id: 'testuser',
          sifre: 'password123'
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('accessToken')
      expect(response.body).toHaveProperty('refreshToken')
      expect(response.body).toHaveProperty('expiresIn')
      expect(response.body.user.id).toBe('testuser')
    })

    it('should return 401 for invalid credentials', async () => {
      vi.mocked(User.findOne).mockResolvedValue(null)

      const response = await request(app)
        .post('/auth/login')
        .send({
          id: 'invaliduser',
          sifre: 'wrongpassword'
        })

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Geçersiz kullanıcı adı veya şifre')
    })

    it('should return 401 for wrong password', async () => {
      const mockUser = {
        id: 'testuser',
        sifre: 'hashed-password'
      }

      vi.mocked(User.findOne).mockResolvedValue(mockUser as any)
      vi.mocked(bcrypt.compare).mockResolvedValue(false as any)

      const response = await request(app)
        .post('/auth/login')
        .send({
          id: 'testuser',
          sifre: 'wrongpassword'
        })

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Geçersiz kullanıcı adı veya şifre')
    })
  })

  describe('POST /auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const mockUser = {
        id: '123',
        tokenVersion: 1
      }

      vi.mocked(User.findOne).mockResolvedValue(mockUser as any)

      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: 'valid-refresh-token'
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('accessToken')
      expect(response.body).toHaveProperty('refreshToken')
      expect(response.body).toHaveProperty('expiresIn')
    })

    it('should return 401 for invalid refresh token', async () => {
      vi.mocked(User.findById).mockResolvedValue(null)

      const { verifyRefreshToken } = await import('../../utils/jwt');
      vi.mocked(verifyRefreshToken).mockReturnValueOnce(null);

      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token'
        })

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Invalid refresh token')
    })
  })

  describe('POST /auth/logout', () => {
    it('should logout user and increment token version', async () => {
      const mockUser = {
        id: '123',
        tokenVersion: 1,
        save: vi.fn().mockResolvedValue(true)
      }

      vi.mocked(User.findOne).mockResolvedValue(mockUser as any)

      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('Başarıyla çıkış yapıldı')
      expect(mockUser.tokenVersion).toBe(2)
      expect(mockUser.save).toHaveBeenCalled()
    })
  })

  describe('GET /auth/me', () => {
    it('should return current user from session', async () => {
      const mockUser = {
        id: 'testuser',
        email: 'test@example.com',
        rol: 'user',
        toObject: () => ({
          id: 'testuser',
          email: 'test@example.com',
          rol: 'user'
        })
      }

      vi.mocked(User.findOne).mockResolvedValue(mockUser as any)

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.id).toBe('testuser')
    })

    it('should return current user from JWT', async () => {
      const mockUser = {
        id: 'testuser',
        email: 'test@example.com',
        rol: 'user',
        save: vi.fn().mockResolvedValue(true),
        toObject: () => ({
          id: 'testuser',
          email: 'test@example.com',
          rol: 'user'
        })
      }

      vi.mocked(User.findOne).mockResolvedValue(mockUser as any)

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.id).toBe('testuser')
    })

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/auth/me')

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Unauthorized')
    })
  })

})