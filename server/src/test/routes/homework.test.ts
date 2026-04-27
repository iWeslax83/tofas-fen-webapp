import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { connectDB, closeDB } from '../../db';
import { Homework } from '../../models';

vi.mock('../../utils/jwt', async () => {
  const actual = await vi.importActual('../../utils/jwt');
  return {
    ...(actual as any),
    authenticateJWT: vi.fn((req: any, res: any, next: any) => {
      req.user = { userId: 'test-user', role: 'teacher' };
      next();
    }),
    authorizeRoles: vi.fn(() => (req: any, res: any, next: any) => next()),
  };
});

// Test database setup
beforeEach(async () => {
  await connectDB();
  // Clear test data
  await Homework.deleteMany({});
});

afterEach(async () => {
  await closeDB();
});

describe('Homework API Tests', () => {
  describe('GET /api/homeworks', () => {
    it('should get all homework', async () => {
      // Create test homework
      const homework = [
        {
          id: 'hw1',
          title: 'Math Homework 1',
          description: 'Solve equations',
          subject: 'Matematik',
          classLevel: '10',
          classSection: 'A',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          teacherId: 'test-user',
          teacherName: 'Teacher One',
        },
        {
          id: 'hw2',
          title: 'Science Homework 1',
          description: 'Lab report',
          subject: 'Fizik',
          classLevel: '10',
          classSection: 'B',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          teacherId: 'test-user',
          teacherName: 'Teacher One',
        },
      ];

      await Homework.insertMany(homework);

      const response = await request(app).get('/api/homeworks').expect(200);

      expect(response.body).toHaveProperty('homeworks');
      expect(response.body.homeworks).toHaveLength(2);
    });

    it('should filter homework by class', async () => {
      const homework = [
        {
          id: 'hw10',
          title: 'Class 10 Homework',
          description: 'For class 10',
          subject: 'Matematik',
          classLevel: '10',
          classSection: 'A',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          teacherId: 'test-user',
          teacherName: 'Teacher One',
        },
        {
          id: 'hw11',
          title: 'Class 11 Homework',
          description: 'For class 11',
          subject: 'Matematik',
          classLevel: '11',
          classSection: 'A',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          teacherId: 'test-user',
          teacherName: 'Teacher One',
        },
      ];

      await Homework.insertMany(homework);

      const response = await request(app).get('/api/homeworks?classLevel=10').expect(200);

      expect(response.body.homeworks).toHaveLength(1);
      expect(response.body.homeworks[0].title).toBe('Class 10 Homework');
    });

    it('should filter homework by subject', async () => {
      const homework = [
        {
          id: 'mhw1',
          title: 'Math Homework',
          description: 'Math problems',
          subject: 'Matematik',
          classLevel: '10',
          classSection: 'A',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          teacherId: 'test-user',
          teacherName: 'Teacher One',
        },
        {
          id: 'shw1',
          title: 'Science Homework',
          description: 'Science problems',
          subject: 'Fizik',
          classLevel: '10',
          classSection: 'A',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          teacherId: 'other-teacher',
          teacherName: 'Teacher Two',
        },
      ];

      await Homework.insertMany(homework);

      const response = await request(app).get('/api/homeworks?subject=Matematik').expect(200);

      expect(response.body.homeworks).toHaveLength(1);
      expect(response.body.homeworks[0].title).toBe('Math Homework');
    });

    it('should filter homework by teacher', async () => {
      const homework = [
        {
          id: 'thw1',
          title: 'Teacher 1 Homework',
          description: 'From teacher 1',
          subject: 'Matematik',
          classLevel: '10',
          classSection: 'A',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          teacherId: 'test-user',
          teacherName: 'Teacher One',
        },
        {
          id: 'thw2',
          title: 'Teacher 2 Homework',
          description: 'From teacher 2',
          subject: 'Fizik',
          classLevel: '10',
          classSection: 'A',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          teacherId: 'other-teacher',
          teacherName: 'Teacher Two',
        },
      ];

      await Homework.insertMany(homework);

      const response = await request(app).get('/api/homeworks?teacherId=test-user').expect(200);

      expect(response.body.homeworks).toHaveLength(1);
      expect(response.body.homeworks[0].title).toBe('Teacher 1 Homework');
    });
  });

  describe('POST /api/homeworks', () => {
    it('should create a new homework', async () => {
      const homeworkData = {
        id: 'newhw',
        title: 'New Homework',
        description: 'This is a new homework',
        subject: 'Matematik',
        classLevel: '10',
        classSection: 'A',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        teacherId: 'test-user',
        teacherName: 'Teacher One',
      };

      const response = await request(app).post('/api/homeworks').send(homeworkData).expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.title).toBe(homeworkData.title);
      expect(response.body.description).toBe(homeworkData.description);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        description: 'Missing title',
      };

      const response = await request(app).post('/api/homeworks').send(invalidData).expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/validation/i);
    });

    it('should validate due date is in the future', async () => {
      const invalidData = {
        id: 'yesterdayhw',
        title: 'Test Homework',
        description: 'Test description',
        subject: 'Matematik',
        classLevel: '10',
        classSection: 'A',
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        teacherId: 'test-user',
        teacherName: 'Teacher One',
      };

      const response = await request(app).post('/api/homeworks').send(invalidData).expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/validation/i);
    });
  });

  describe('GET /api/homeworks/:id', () => {
    it('should get homework by ID', async () => {
      const homework = new Homework({
        id: 'id-test-hw',
        title: 'Test Homework',
        description: 'Test description',
        subject: 'Matematik',
        classLevel: '10',
        classSection: 'A',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        teacherId: 'test-user',
        teacherName: 'Teacher One',
      });

      await homework.save();

      const response = await request(app).get(`/api/homeworks/${homework.id}`).expect(200);

      expect(response.body.title).toBe(homework.title);
      expect(response.body.description).toBe(homework.description);
    });

    it('should return 404 for non-existent homework', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app).get(`/api/homeworks/${fakeId}`).expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Ödev bulunamadı');
    });
  });

  describe('PUT /api/homeworks/:id', () => {
    it('should update homework', async () => {
      const homework = new Homework({
        id: 'orig-id-hw',
        title: 'Original Title',
        description: 'Original description',
        subject: 'Matematik',
        classLevel: '10',
        classSection: 'A',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        teacherId: 'test-user',
        teacherName: 'Teacher One',
      });

      await homework.save();

      const updateData = {
        title: 'Updated Title',
        description: 'Updated description that is long enough',
        subject: 'Matematik',
        classLevel: '10',
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      };

      const response = await request(app)
        .put(`/api/homeworks/${homework.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.description).toBe(updateData.description);
    });

    it('should return 404 for non-existent homework', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .put(`/api/homeworks/${fakeId}`)
        .send({
          title: 'Updated Title',
          description: 'Valid description that is long enough',
          subject: 'Matematik',
          classLevel: '10',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
        })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/homeworks/:id', () => {
    it('should delete homework', async () => {
      const homework = new Homework({
        id: 'delete-me',
        title: 'To Delete',
        description: 'This will be deleted',
        subject: 'Matematik',
        classLevel: '10',
        classSection: 'A',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        teacherId: 'test-user',
        teacherName: 'Teacher One',
      });

      await homework.save();

      await request(app).delete(`/api/homeworks/${homework.id}`).expect(204);

      const deletedHomework = await Homework.findById(homework._id);
      expect(deletedHomework).toBeNull();
    });

    it('should return 404 for non-existent homework', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app).delete(`/api/homeworks/${fakeId}`).expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});
