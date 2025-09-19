import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { connectDB, closeDB } from '../../db';
import { Announcement } from '../../models';

// Test database setup
beforeEach(async () => {
  await connectDB();
  // Clear test data
  await Announcement.deleteMany({});
});

afterEach(async () => {
  await closeDB();
});

describe('Announcements API Tests', () => {
  describe('GET /api/announcements', () => {
    it('should get all announcements', async () => {
      // Create test announcements
      const announcements = [
        {
          title: 'Test Announcement 1',
          content: 'Content 1',
          priority: 'normal',
          targetRoles: ['student'],
          targetClasses: ['10'],
        },
        {
          title: 'Test Announcement 2',
          content: 'Content 2',
          priority: 'high',
          targetRoles: ['teacher'],
          targetClasses: ['11'],
        },
      ];

      await Announcement.insertMany(announcements);

      const response = await request(app)
        .get('/api/announcements')
        .expect(200);

      expect(response.body).toHaveProperty('announcements');
      expect(response.body.announcements).toHaveLength(2);
    });

    it('should filter announcements by role', async () => {
      const announcements = [
        {
          title: 'Student Announcement',
          content: 'Content 1',
          priority: 'normal',
          targetRoles: ['student'],
          targetClasses: ['10'],
        },
        {
          title: 'Teacher Announcement',
          content: 'Content 2',
          priority: 'normal',
          targetRoles: ['teacher'],
          targetClasses: ['11'],
        },
      ];

      await Announcement.insertMany(announcements);

      const response = await request(app)
        .get('/api/announcements?role=student')
        .expect(200);

      expect(response.body.announcements).toHaveLength(1);
      expect(response.body.announcements[0].title).toBe('Student Announcement');
    });

    it('should filter announcements by class', async () => {
      const announcements = [
        {
          title: 'Class 10 Announcement',
          content: 'Content 1',
          priority: 'normal',
          targetRoles: ['student'],
          targetClasses: ['10'],
        },
        {
          title: 'Class 11 Announcement',
          content: 'Content 2',
          priority: 'normal',
          targetRoles: ['student'],
          targetClasses: ['11'],
        },
      ];

      await Announcement.insertMany(announcements);

      const response = await request(app)
        .get('/api/announcements?class=10')
        .expect(200);

      expect(response.body.announcements).toHaveLength(1);
      expect(response.body.announcements[0].title).toBe('Class 10 Announcement');
    });

    it('should paginate announcements', async () => {
      const announcements = Array.from({ length: 25 }, (_, i) => ({
        title: `Announcement ${i + 1}`,
        content: `Content ${i + 1}`,
        priority: 'normal',
        targetRoles: ['student'],
        targetClasses: ['10'],
      }));

      await Announcement.insertMany(announcements);

      const response = await request(app)
        .get('/api/announcements?page=1&limit=10')
        .expect(200);

      expect(response.body.announcements).toHaveLength(10);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.total).toBe(25);
    });
  });

  describe('POST /api/announcements', () => {
    it('should create a new announcement', async () => {
      const announcementData = {
        title: 'New Announcement',
        content: 'This is a new announcement',
        priority: 'normal',
        targetRoles: ['student'],
        targetClasses: ['10'],
      };

      const response = await request(app)
        .post('/api/announcements')
        .send(announcementData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.title).toBe(announcementData.title);
      expect(response.body.content).toBe(announcementData.content);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        content: 'Missing title',
      };

      const response = await request(app)
        .post('/api/announcements')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('validation');
    });

    it('should validate priority values', async () => {
      const invalidData = {
        title: 'Test Announcement',
        content: 'Test content',
        priority: 'invalid-priority',
        targetRoles: ['student'],
        targetClasses: ['10'],
      };

      const response = await request(app)
        .post('/api/announcements')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/announcements/:id', () => {
    it('should get announcement by ID', async () => {
      const announcement = new Announcement({
        title: 'Test Announcement',
        content: 'Test content',
        priority: 'normal',
        targetRoles: ['student'],
        targetClasses: ['10'],
      });

      await announcement.save();

      const response = await request(app)
        .get(`/api/announcements/${announcement._id}`)
        .expect(200);

      expect(response.body.title).toBe(announcement.title);
      expect(response.body.content).toBe(announcement.content);
    });

    it('should return 404 for non-existent announcement', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .get(`/api/announcements/${fakeId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Duyuru bulunamadı');
    });
  });

  describe('PUT /api/announcements/:id', () => {
    it('should update announcement', async () => {
      const announcement = new Announcement({
        title: 'Original Title',
        content: 'Original content',
        priority: 'normal',
        targetRoles: ['student'],
        targetClasses: ['10'],
      });

      await announcement.save();

      const updateData = {
        title: 'Updated Title',
        content: 'Updated content',
      };

      const response = await request(app)
        .put(`/api/announcements/${announcement._id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.content).toBe(updateData.content);
    });

    it('should return 404 for non-existent announcement', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .put(`/api/announcements/${fakeId}`)
        .send({ title: 'Updated Title' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/announcements/:id', () => {
    it('should delete announcement', async () => {
      const announcement = new Announcement({
        title: 'To Delete',
        content: 'This will be deleted',
        priority: 'normal',
        targetRoles: ['student'],
        targetClasses: ['10'],
      });

      await announcement.save();

      await request(app)
        .delete(`/api/announcements/${announcement._id}`)
        .expect(200);

      const deletedAnnouncement = await Announcement.findById(announcement._id);
      expect(deletedAnnouncement).toBeNull();
    });

    it('should return 404 for non-existent announcement', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .delete(`/api/announcements/${fakeId}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});
