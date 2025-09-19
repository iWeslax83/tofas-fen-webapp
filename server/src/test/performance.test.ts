import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import authRoutes from '../routes/auth'

const app = express()
app.use(express.json())
app.use('/auth', authRoutes)

describe('Performance Tests', () => {
  const startTime = Date.now()

  beforeAll(() => {
    console.log('Performance tests starting...')
  })

  afterAll(() => {
    const endTime = Date.now()
    console.log(`Performance tests completed in ${endTime - startTime}ms`)
  })

  describe('Login Endpoint Performance', () => {
    it('should handle 100 concurrent login requests', async () => {
      const concurrentRequests = 100
      const requests: Promise<request.Response>[] = []

      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          request(app)
            .post('/auth/login')
            .send({
              id: `user${i}`,
              sifre: 'password123'
            })
            .timeout(5000)
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
      expect(averageResponseTime).toBeLessThan(1000) // Should be under 1 second
    }, 30000)

    it('should handle rate limiting under load', async () => {
      const rapidRequests = 50;
      const requests: Promise<request.Response>[] = [];

      // Send requests rapidly
      for (let i = 0; i < rapidRequests; i++) {
        requests.push(
          request(app)
            .post('/auth/login')
            .send({
              id: 'testuser',
              sifre: 'password123'
            })
        );
      }

      const responses = await Promise.allSettled(requests);
      const rateLimitedResponses = responses.filter(
        (response): response is PromiseFulfilledResult<request.Response> =>
          response.status === 'fulfilled' && response.value.status === 429
      ).length;

      console.log(`Rate limited responses: ${rateLimitedResponses}`);

      // Should have some rate limited responses
      expect(rateLimitedResponses).toBeGreaterThan(0);
    }, 15000);
  })

  describe('Memory Usage', () => {
    it('should not have memory leaks after multiple requests', async () => {
      const initialMemory = process.memoryUsage()
      
      // Make multiple requests
      for (let i = 0; i < 100; i++) {
        await request(app)
          .post('/auth/login')
          .send({
            id: `user${i}`,
            sifre: 'password123'
          })
      }

      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    }, 20000)
  })

  describe('Response Time Benchmarks', () => {
    it('should respond to login requests within acceptable time', async () => {
      const responseTimes = []

      for (let i = 0; i < 10; i++) {
        const startTime = Date.now()
        
        await request(app)
          .post('/auth/login')
          .send({
            id: `user${i}`,
            sifre: 'password123'
          })

        const endTime = Date.now()
        responseTimes.push()
      }

      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      const maxResponseTime = Math.max(...responseTimes)

      console.log(`Average response time: ${averageResponseTime.toFixed(2)}ms`)
      console.log(`Max response time: ${maxResponseTime}ms`)

      expect(averageResponseTime).toBeLessThan(500) // Should be under 500ms
      expect(maxResponseTime).toBeLessThan(1000) // Max should be under 1 second
    })

    it('should handle large payloads efficiently', async () => {
      const largePayload = {
        id: 'testuser',
        sifre: 'password123',
        extraData: 'x'.repeat(10000) // 10KB of extra data
      }

      const startTime = Date.now()
      
      await request(app)
        .post('/auth/login')
        .send(largePayload)

      const endTime = Date.now()
      const responseTime = endTime - startTime

      console.log(`Large payload response time: ${responseTime}ms`)

      expect(responseTime).toBeLessThan(1000) // Should handle large payloads efficiently
    })
  })

  describe('Database Connection Performance', () => {
    it('should maintain stable database connections under load', async () => {
      const connectionPromises: Promise<request.Response>[] = [];

      // Simulate multiple concurrent database operations
      for (let i = 0; i < 20; i++) {
        connectionPromises.push(
          request(app)
            .get('/auth/me')
            .set('Authorization', 'Bearer test-token')
            .timeout(5000)
        );
      }

      const startTime = Date.now();
      const responses = await Promise.allSettled(connectionPromises);
      const endTime = Date.now();

      const successfulConnections = responses.filter(
        (response): response is PromiseFulfilledResult<request.Response> => response.status === 'fulfilled'
      ).length;

      const averageConnectionTime = (endTime - startTime) / connectionPromises.length;

      console.log(`Successful connections: ${successfulConnections}`);
      console.log(`Average connection time: ${averageConnectionTime.toFixed(2)}ms`);

      expect(successfulConnections).toBeGreaterThan(0);
      expect(averageConnectionTime).toBeLessThan(500);
    });
  })
})