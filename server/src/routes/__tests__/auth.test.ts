import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import bcrypt from 'bcryptjs'
import { User } from '../../db'
import authRoutes from '../auth'

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
        id: '123',
        id_kullanici: 'testuser',
        email: 'test@example.com',
        sifre: 'hashed-password',
        rol: 'user',
        tokenVersion: 0,
        toObject: () => ({
          id: '123',
          id_kullanici: 'testuser',
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
      expect(response.body.id_kullanici).toBe('testuser')
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
      expect(response.body.error).toBe('Geçersiz kullanıcı ID veya şifre')
    })

    it('should return 401 for wrong password', async () => {
      const mockUser = {
        id: '123',
        id_kullanici: 'testuser',
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
      expect(response.body.error).toBe('Geçersiz kullanıcı ID veya şifre')
    })
  })

  describe('POST /auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const mockUser = {
        id: '123',
        tokenVersion: 1
      }

      vi.mocked(User.findById).mockResolvedValue(mockUser as any)

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

      vi.mocked(User.findById).mockResolvedValue(mockUser as any)

      const response = await request(app)
        .post('/auth/logout')
        .set('Cookie', ['connect.sid=test-session'])

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('Başarıyla çıkış yapıldı')
      expect(mockUser.tokenVersion).toBe(2)
      expect(mockUser.save).toHaveBeenCalled()
    })
  })

  describe('GET /auth/me', () => {
    it('should return current user from session', async () => {
      const mockUser = {
        id: '123',
        id_kullanici: 'testuser',
        email: 'test@example.com',
        rol: 'user',
        toObject: () => ({
          id: '123',
          id_kullanici: 'testuser',
          email: 'test@example.com',
          rol: 'user'
        })
      }

      vi.mocked(User.findById).mockResolvedValue(mockUser as any)

      const response = await request(app)
        .get('/auth/me')
        .set('Cookie', ['connect.sid=test-session'])

      expect(response.status).toBe(200)
      expect(response.body.id_kullanici).toBe('testuser')
    })

    it('should return current user from JWT', async () => {
      const mockUser = {
        id: '123',
        id_kullanici: 'testuser',
        email: 'test@example.com',
        rol: 'user',
        toObject: () => ({
          id: '123',
          id_kullanici: 'testuser',
          email: 'test@example.com',
          rol: 'user'
        })
      }

      vi.mocked(User.findById).mockResolvedValue(mockUser as any)

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.id_kullanici).toBe('testuser')
    })

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .get('/auth/me')

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Unauthorized')
    })
  })

  describe('POST /auth/forgot-password', () => {
    it('should send password reset email for existing user', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        save: vi.fn().mockResolvedValue(true)
      }

      vi.mocked(User.findOne).mockResolvedValue(mockUser as any)

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({
          email: 'test@example.com'
        })

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi')
      expect(mockUser.save).toHaveBeenCalled()
    })

    it('should return 404 for non-existent user', async () => {
      vi.mocked(User.findOne).mockResolvedValue(null)

      const response = await request(app)
        .post('/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com'
        })

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı')
    })
  })

  describe('POST /auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      const mockUser = {
        id: '123',
        resetToken: 'valid-token',
        resetTokenExpiry: new Date(Date.now() + 3600000), // 1 hour from now
        tokenVersion: 1,
        save: vi.fn().mockResolvedValue(true)
      }

      vi.mocked(User.findOne).mockResolvedValue(mockUser as any)

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: 'valid-token',
          newPassword: 'newpassword123'
        })

      expect(response.status).toBe(200)
      expect(response.body.message).toBe('Şifreniz başarıyla güncellendi')
      expect(mockUser.tokenVersion).toBe(2)
      expect(mockUser.save).toHaveBeenCalled()
    })

    it('should return 400 for invalid token', async () => {
      vi.mocked(User.findOne).mockResolvedValue(null)

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'newpassword123'
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Geçersiz veya süresi dolmuş token')
    })

    it('should return 400 for expired token', async () => {
      const mockUser = {
        resetToken: 'expired-token',
        resetTokenExpiry: new Date(Date.now() - 3600000) // 1 hour ago
      }

      vi.mocked(User.findOne).mockResolvedValue(mockUser as any)

      const response = await request(app)
        .post('/auth/reset-password')
        .send({
          token: 'expired-token',
          newPassword: 'newpassword123'
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Geçersiz veya süresi dolmuş token')
    })
  })
})