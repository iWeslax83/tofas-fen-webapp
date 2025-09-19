import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { connectDB, closeDB } from '../../db';
import { User, Announcement, Homework } from '../../models';

// Test database setup
beforeAll(async () => {
  await connectDB();
  // Clear test data
  await User.deleteMany({});
  await Announcement.deleteMany({});
  await Homework.deleteMany({});
}, 30000);

afterAll(async () => {
  await closeDB();
}, 30000);

describe('Load Tests', () => {
  describe('User API Load Tests', () => {
    it('should handle concurrent user creation', async () => {
      const startTime = Date.now();
      
      // Create 100 users concurrently
      const userPromises = Array.from({ length: 100 }, (_, i) => {
        return request(app)
          .post('/api/user')
          .send({
            id: `loadtest${i}`,
            adSoyad: `Load Test User ${i}`,
            email: `loadtest${i}@example.com`,
            rol: 'student',
            sinif: '10',
            sube: 'A'
          });
      });

      const results = await Promise.all(userPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Check all requests succeeded
      results.forEach(result => {
        expect(result.status).toBe(201);
      });

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(10000); // 10 seconds
      
      console.log(`Created 100 users in ${duration}ms`);
    });

    it('should handle concurrent user retrieval', async () => {
      const startTime = Date.now();
      
      // Make 50 concurrent GET requests
      const getPromises = Array.from({ length: 50 }, () => {
        return request(app)
          .get('/api/user');
      });

      const results = await Promise.all(getPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Check all requests succeeded
      results.forEach(result => {
        expect(result.status).toBe(200);
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds
      
      console.log(`Retrieved users 50 times in ${duration}ms`);
    });
  });

  describe('Announcements API Load Tests', () => {
    it('should handle concurrent announcement creation', async () => {
      const startTime = Date.now();
      
      // Create 50 announcements concurrently
      const announcementPromises = Array.from({ length: 50 }, (_, i) => {
        return request(app)
          .post('/api/announcements')
          .send({
            title: `Load Test Announcement ${i}`,
            content: `This is load test announcement ${i}`,
            priority: 'normal',
            targetRoles: ['student'],
            targetClasses: ['10']
          });
      });

      const results = await Promise.all(announcementPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Check all requests succeeded
      results.forEach(result => {
        expect(result.status).toBe(201);
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(8000); // 8 seconds
      
      console.log(`Created 50 announcements in ${duration}ms`);
    });

    it('should handle concurrent announcement retrieval', async () => {
      const startTime = Date.now();
      
      // Make 30 concurrent GET requests
      const getPromises = Array.from({ length: 30 }, () => {
        return request(app)
          .get('/api/announcements');
      });

      const results = await Promise.all(getPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Check all requests succeeded
      results.forEach(result => {
        expect(result.status).toBe(200);
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(3000); // 3 seconds
      
      console.log(`Retrieved announcements 30 times in ${duration}ms`);
    });
  });

  describe('Homework API Load Tests', () => {
    it('should handle concurrent homework creation', async () => {
      const startTime = Date.now();
      
      // Create 30 homework items concurrently
      const homeworkPromises = Array.from({ length: 30 }, (_, i) => {
        return request(app)
          .post('/api/homework')
          .send({
            title: `Load Test Homework ${i}`,
            description: `This is load test homework ${i}`,
            subject: 'Matematik',
            classLevel: '10',
            classSection: 'A',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            teacherId: 'teacher1'
          });
      });

      const results = await Promise.all(homeworkPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Check all requests succeeded
      results.forEach(result => {
        expect(result.status).toBe(201);
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(6000); // 6 seconds
      
      console.log(`Created 30 homework items in ${duration}ms`);
    });

    it('should handle concurrent homework retrieval', async () => {
      const startTime = Date.now();
      
      // Make 20 concurrent GET requests
      const getPromises = Array.from({ length: 20 }, () => {
        return request(app)
          .get('/api/homework');
      });

      const results = await Promise.all(getPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Check all requests succeeded
      results.forEach(result => {
        expect(result.status).toBe(200);
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(2000); // 2 seconds
      
      console.log(`Retrieved homework 20 times in ${duration}ms`);
    });
  });

  describe('Mixed Load Tests', () => {
    it('should handle mixed concurrent operations', async () => {
      const startTime = Date.now();
      
      // Mix of different operations
      const operations = [
        // User operations
        ...Array.from({ length: 10 }, (_, i) => 
          request(app).post('/api/user').send({
            id: `mixed${i}`,
            adSoyad: `Mixed Test User ${i}`,
            email: `mixed${i}@example.com`,
            rol: 'student'
          })
        ),
        // Announcement operations
        ...Array.from({ length: 10 }, (_, i) => 
          request(app).post('/api/announcements').send({
            title: `Mixed Announcement ${i}`,
            content: `Mixed content ${i}`,
            priority: 'normal',
            targetRoles: ['student']
          })
        ),
        // Homework operations
        ...Array.from({ length: 10 }, (_, i) => 
          request(app).post('/api/homework').send({
            title: `Mixed Homework ${i}`,
            description: `Mixed description ${i}`,
            subject: 'Matematik',
            classLevel: '10',
            classSection: 'A',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            teacherId: 'teacher1'
          })
        ),
        // GET operations
        ...Array.from({ length: 10 }, () => request(app).get('/api/user')),
        ...Array.from({ length: 10 }, () => request(app).get('/api/announcements')),
        ...Array.from({ length: 10 }, () => request(app).get('/api/homework'))
      ];

      const results = await Promise.all(operations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Check most requests succeeded (allow some failures in load test)
      const successCount = results.filter(result => result.status < 400).length;
      const successRate = successCount / results.length;
      
      expect(successRate).toBeGreaterThan(0.9); // 90% success rate
      expect(duration).toBeLessThan(15000); // 15 seconds
      
      console.log(`Mixed operations: ${successCount}/${results.length} succeeded in ${duration}ms`);
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not exceed memory limits during bulk operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Create many records
      const userPromises = Array.from({ length: 200 }, (_, i) => {
        return request(app)
          .post('/api/user')
          .send({
            id: `memory${i}`,
            adSoyad: `Memory Test User ${i}`,
            email: `memory${i}@example.com`,
            rol: 'student'
          });
      });

      await Promise.all(userPromises);
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      
      console.log(`Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    });
  });

  describe('Response Time Tests', () => {
    it('should maintain acceptable response times under load', async () => {
      const responseTimes: number[] = [];
      
      // Make 20 requests and measure response times
      for (let i = 0; i < 20; i++) {
        const startTime = Date.now();
        
        await request(app)
          .get('/api/user')
          .expect(200);
        
        const endTime = Date.now();
        responseTimes.push(endTime - startTime);
      }
      
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      
      // Average response time should be less than 500ms
      expect(avgResponseTime).toBeLessThan(500);
      
      // Max response time should be less than 2000ms
      expect(maxResponseTime).toBeLessThan(2000);
      
      console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`Max response time: ${maxResponseTime}ms`);
    });
  });
});