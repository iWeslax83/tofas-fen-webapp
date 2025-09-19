import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { connectDB, closeDB } from '../../db';
import { Homework } from '../../models';

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
  describe('GET /api/homework', () => {
    it('should get all homework', async () => {
      // Create test homework
      const homework = [
        {
          title: 'Math Homework 1',
          description: 'Solve equations',
          subject: 'Matematik',
          classLevel: '10',
          classSection: 'A',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          teacherId: 'teacher1',
        },
        {
          title: 'Science Homework 1',
          description: 'Lab report',
          subject: 'Fizik',
          classLevel: '10',
          classSection: 'B',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          teacherId: 'teacher2',
        },
      ];

      await Homework.insertMany(homework);

      const response = await request(app)
        .get('/api/homework')
        .expect(200);

      expect(response.body).toHaveProperty('homework');
      expect(response.body.homework).toHaveLength(2);
    });

    it('should filter homework by class', async () => {
      const homework = [
        {
          title: 'Class 10 Homework',
          description: 'For class 10',
          subject: 'Matematik',
          classLevel: '10',
          classSection: 'A',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          teacherId: 'teacher1',
        },
        {
          title: 'Class 11 Homework',
          description: 'For class 11',
          subject: 'Matematik',
          classLevel: '11',
          classSection: 'A',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          teacherId: 'teacher1',
        },
      ];

      await Homework.insertMany(homework);

      const response = await request(app)
        .get('/api/homework?class=10')
        .expect(200);

      expect(response.body.homework).toHaveLength(1);
      expect(response.body.homework[0].title).toBe('Class 10 Homework');
    });

    it('should filter homework by subject', async () => {
      const homework = [
        {
          title: 'Math Homework',
          description: 'Math problems',
          subject: 'Matematik',
          classLevel: '10',
          classSection: 'A',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          teacherId: 'teacher1',
        },
        {
          title: 'Science Homework',
          description: 'Science problems',
          subject: 'Fizik',
          classLevel: '10',
          classSection: 'A',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          teacherId: 'teacher2',
        },
      ];

      await Homework.insertMany(homework);

      const response = await request(app)
        .get('/api/homework?subject=Matematik')
        .expect(200);

      expect(response.body.homework).toHaveLength(1);
      expect(response.body.homework[0].title).toBe('Math Homework');
    });

    it('should filter homework by teacher', async () => {
      const homework = [
        {
          title: 'Teacher 1 Homework',
          description: 'From teacher 1',
          subject: 'Matematik',
          classLevel: '10',
          classSection: 'A',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          teacherId: 'teacher1',
        },
        {
          title: 'Teacher 2 Homework',
          description: 'From teacher 2',
          subject: 'Fizik',
          classLevel: '10',
          classSection: 'A',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          teacherId: 'teacher2',
        },
      ];

      await Homework.insertMany(homework);

      const response = await request(app)
        .get('/api/homework?teacherId=teacher1')
        .expect(200);

      expect(response.body.homework).toHaveLength(1);
      expect(response.body.homework[0].title).toBe('Teacher 1 Homework');
    });
  });

  describe('POST /api/homework', () => {
    it('should create a new homework', async () => {
      const homeworkData = {
        title: 'New Homework',
        description: 'This is a new homework',
        subject: 'Matematik',
        classLevel: '10',
        classSection: 'A',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        teacherId: 'teacher1',
      };

      const response = await request(app)
        .post('/api/homework')
        .send(homeworkData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.title).toBe(homeworkData.title);
      expect(response.body.description).toBe(homeworkData.description);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        description: 'Missing title',
      };

      const response = await request(app)
        .post('/api/homework')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('validation');
    });

    it('should validate due date is in the future', async () => {
      const invalidData = {
        title: 'Test Homework',
        description: 'Test description',
        subject: 'Matematik',
        classLevel: '10',
        classSection: 'A',
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        teacherId: 'teacher1',
      };

      const response = await request(app)
        .post('/api/homework')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('due date');
    });
  });

  describe('GET /api/homework/:id', () => {
    it('should get homework by ID', async () => {
      const homework = new Homework({
        title: 'Test Homework',
        description: 'Test description',
        subject: 'Matematik',
        classLevel: '10',
        classSection: 'A',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        teacherId: 'teacher1',
      });

      await homework.save();

      const response = await request(app)
        .get(`/api/homework/${homework._id}`)
        .expect(200);

      expect(response.body.title).toBe(homework.title);
      expect(response.body.description).toBe(homework.description);
    });

    it('should return 404 for non-existent homework', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .get(`/api/homework/${fakeId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Ödev bulunamadı');
    });
  });

  describe('PUT /api/homework/:id', () => {
    it('should update homework', async () => {
      const homework = new Homework({
        title: 'Original Title',
        description: 'Original description',
        subject: 'Matematik',
        classLevel: '10',
        classSection: 'A',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        teacherId: 'teacher1',
      });

      await homework.save();

      const updateData = {
        title: 'Updated Title',
        description: 'Updated description',
      };

      const response = await request(app)
        .put(`/api/homework/${homework._id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.description).toBe(updateData.description);
    });

    it('should return 404 for non-existent homework', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .put(`/api/homework/${fakeId}`)
        .send({ title: 'Updated Title' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/homework/:id', () => {
    it('should delete homework', async () => {
      const homework = new Homework({
        title: 'To Delete',
        description: 'This will be deleted',
        subject: 'Matematik',
        classLevel: '10',
        classSection: 'A',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        teacherId: 'teacher1',
      });

      await homework.save();

      await request(app)
        .delete(`/api/homework/${homework._id}`)
        .expect(200);

      const deletedHomework = await Homework.findById(homework._id);
      expect(deletedHomework).toBeNull();
    });

    it('should return 404 for non-existent homework', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .delete(`/api/homework/${fakeId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/homework/student/:studentId', () => {
    it('should get homework for specific student', async () => {
      const homework = [
        {
          title: 'Student 1 Homework',
          description: 'For student 1',
          subject: 'Matematik',
          classLevel: '10',
          classSection: 'A',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          teacherId: 'teacher1',
          assignedStudents: ['student1'],
        },
        {
          title: 'Student 2 Homework',
          description: 'For student 2',
          subject: 'Fizik',
          classLevel: '10',
          classSection: 'A',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          teacherId: 'teacher2',
          assignedStudents: ['student2'],
        },
      ];

      await Homework.insertMany(homework);

      const response = await request(app)
        .get('/api/homework/student/student1')
        .expect(200);

      expect(response.body.homework).toHaveLength(1);
      expect(response.body.homework[0].title).toBe('Student 1 Homework');
    });
  });
});
