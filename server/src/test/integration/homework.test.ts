import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../index';

/**
 * Homework API Integration Tests
 *
 * These tests verify the homework route behavior for auth and basic structure.
 * They require a running MongoDB instance (handled by the test setup.ts).
 */
describe('Homework API Integration Tests', () => {
  describe('GET /api/homeworks', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/homeworks').expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 with an invalid JWT token', async () => {
      const response = await request(app)
        .get('/api/homeworks')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/homeworks/:id', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/homeworks/nonexistent-id').expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/homeworks', () => {
    it('should return 401 without authentication', async () => {
      const homeworkData = {
        title: 'Test Homework',
        description: 'Test description',
        subject: 'Matematik',
        classLevel: '10',
        classSection: 'A',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await request(app).post('/api/homeworks').send(homeworkData).expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/homeworks/:id', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .put('/api/homeworks/nonexistent-id')
        .send({ title: 'Updated Title' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/homeworks/:id', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app).delete('/api/homeworks/nonexistent-id').expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PATCH /api/homeworks/:id/status', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .patch('/api/homeworks/nonexistent-id/status')
        .send({ status: 'completed' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});
