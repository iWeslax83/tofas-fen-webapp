import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import { app } from '../index'
import { connectDB, closeDB } from '../db'

vi.mock('express-rate-limit', () => ({
  default: vi.fn(() => (req: any, res: any, next: any) => next())
}));

describe('Performance Tests', () => {
  const totalStartTime = Date.now()

  beforeAll(async () => {
    await connectDB();
  })

  afterAll(async () => {
    await closeDB();
    const totalEndTime = Date.now()
    console.log(`Performance tests completed in ${totalEndTime - totalStartTime}ms`)
  })

  describe('Login Endpoint Performance', () => {
    it('should handle 50 concurrent login requests', async () => {
      const concurrentRequests = 50
      const requests: Promise<request.Response>[] = []

      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({
              id: `user${i}`,
              sifre: 'password123'
            })
            .timeout(10000)
        )
      }

      const startTime = Date.now()
      const responses = await Promise.allSettled(requests)
      const endTime = Date.now()

      const successfulRequests = responses.filter(
        response => response.status === 'fulfilled'
      ).length

      const averageResponseTime = (endTime - startTime) / concurrentRequests

      console.log(`Concurrent requests: ${concurrentRequests}`)
      console.log(`Successful requests: ${successfulRequests}`)
      console.log(`Average response time: ${averageResponseTime.toFixed(2)}ms`)

      expect(successfulRequests).toBeGreaterThan(0)
      expect(averageResponseTime).toBeLessThan(2000) // 2s limit for heavy parallel load
    }, 45000)
  })

  describe('Memory Usage', () => {
    it('should not have memory leaks after multiple requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed

      // Make multiple requests
      for (let i = 0; i < 50; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            id: `memuser${i}`,
            sifre: 'password123'
          })
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)

      // Memory increase should be reasonable (less than 100MB for 50 logins + GC jitter)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024)
    }, 30000)
  })

  describe('Response Time Benchmarks', () => {
    it('should respond to login requests within acceptable time', async () => {
      const responseTimes = []

      for (let i = 0; i < 5; i++) {
        const startTime = Date.now()

        await request(app)
          .post('/api/auth/login')
          .send({
            id: `bench${i}`,
            sifre: 'password123'
          })

        const endTime = Date.now()
        responseTimes.push(endTime - startTime)
      }

      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      const maxResponseTime = Math.max(...responseTimes)

      console.log(`Average response time: ${averageResponseTime.toFixed(2)}ms`)
      console.log(`Max response time: ${maxResponseTime}ms`)

      expect(averageResponseTime).toBeLessThan(1000)
    })
  })
})