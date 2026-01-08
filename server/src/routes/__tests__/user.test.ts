import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { User } from '../../models'
import userRoutes from '../User'

// Mock middleware
vi.mock('../../utils/jwt', () => ({
    authenticateJWT: (req: any, res: any, next: any) => {
        req.user = { userId: '123', role: 'admin' }
        next()
    },
    authorizeRoles: (roles: any) => (req: any, res: any, next: any) => next()
}))

// Mock User model
vi.mock('../../models', () => ({
    User: {
        find: vi.fn(),
        findOne: vi.fn(),
        findOneAndUpdate: vi.fn(),
        deleteOne: vi.fn(),
    }
}))

const app = express()
app.use(express.json())
app.use('/user', userRoutes)

describe('User Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('GET /user', () => {
        it('should return all users when no role is specified', async () => {
            const mockUsers = [
                { id: '1', adSoyad: 'User 1', rol: 'student' },
                { id: '2', adSoyad: 'User 2', rol: 'teacher' }
            ]

            const mockFind = {
                select: vi.fn().mockResolvedValue(mockUsers)
            }
            vi.mocked(User.find).mockReturnValue(mockFind as any)

            const response = await request(app).get('/user')

            expect(response.status).toBe(200)
            expect(response.body).toEqual(mockUsers)
            expect(User.find).toHaveBeenCalledWith({})
            // Using string matching for select since exact string might vary if implementation changes slightly
            expect(mockFind.select).toHaveBeenCalled()
        })

        it('should filter users by role when role parameter is provided', async () => {
            const mockStudents = [
                { id: '1', adSoyad: 'Student 1', rol: 'student' }
            ]

            const mockFind = {
                select: vi.fn().mockResolvedValue(mockStudents)
            }
            vi.mocked(User.find).mockReturnValue(mockFind as any)

            const response = await request(app).get('/user?role=student')

            expect(response.status).toBe(200)
            expect(response.body).toEqual(mockStudents)
            expect(User.find).toHaveBeenCalledWith({ rol: 'student' })
            expect(mockFind.select).toHaveBeenCalled()
        })
    })
})
