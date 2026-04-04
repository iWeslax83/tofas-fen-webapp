/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../models', () => ({
  Notification: {
    findById: vi.fn(),
    find: vi.fn(),
  },
  User: {},
}));

vi.mock('../../services/NotificationService', () => ({
  NotificationService: {
    markAsRead: vi.fn().mockResolvedValue({ _id: 'notif1', userId: 'user1', read: true }),
    markMultipleAsRead: vi.fn().mockResolvedValue(undefined),
    archiveNotification: vi
      .fn()
      .mockResolvedValue({ _id: 'notif1', userId: 'user1', archived: true }),
  },
}));

vi.mock('../../middleware/auth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    const testUser = req.headers['x-test-user'];
    if (testUser) {
      req.user = JSON.parse(testUser as string);
    }
    next();
  },
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../middleware/ownershipCheck', () => ({
  requireOwnership: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../mailService', () => ({
  sendMail: vi.fn(),
}));

import { Notification } from '../../models';
import { NotificationService } from '../../services/NotificationService';
import express from 'express';
import router from '../../routes/Notification';
import request from 'supertest';

const app = express();
app.use(express.json());
app.use('/notifications', router);

describe('Notification Ownership Checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PATCH /:id/read', () => {
    it('should reject if notification belongs to another user (403)', async () => {
      vi.mocked(Notification.findById).mockResolvedValue({
        _id: 'notif1',
        userId: 'other-user',
      } as any);

      const res = await request(app)
        .patch('/notifications/notif1/read')
        .set('x-test-user', JSON.stringify({ userId: 'user1', role: 'student' }));

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow if notification belongs to requesting user (200)', async () => {
      vi.mocked(Notification.findById).mockResolvedValue({
        _id: 'notif1',
        userId: 'user1',
      } as any);

      const res = await request(app)
        .patch('/notifications/notif1/read')
        .set('x-test-user', JSON.stringify({ userId: 'user1', role: 'student' }));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should allow admin to mark any notification as read (200)', async () => {
      vi.mocked(Notification.findById).mockResolvedValue({
        _id: 'notif1',
        userId: 'other-user',
      } as any);

      const res = await request(app)
        .patch('/notifications/notif1/read')
        .set('x-test-user', JSON.stringify({ userId: 'admin1', role: 'admin' }));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 if notification does not exist', async () => {
      vi.mocked(Notification.findById).mockResolvedValue(null as any);

      const res = await request(app)
        .patch('/notifications/notif1/read')
        .set('x-test-user', JSON.stringify({ userId: 'user1', role: 'student' }));

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /bulk-read', () => {
    it('should only mark notifications owned by requesting user', async () => {
      vi.mocked(Notification.find).mockResolvedValue([
        { _id: { toString: () => 'notif1' }, userId: 'user1' },
        { _id: { toString: () => 'notif2' }, userId: 'other-user' },
        { _id: { toString: () => 'notif3' }, userId: 'user1' },
      ] as any);

      const res = await request(app)
        .patch('/notifications/bulk-read')
        .set('x-test-user', JSON.stringify({ userId: 'user1', role: 'student' }))
        .send({ notificationIds: ['notif1', 'notif2', 'notif3'] });

      expect(res.status).toBe(200);
      expect(NotificationService.markMultipleAsRead).toHaveBeenCalledWith(['notif1', 'notif3']);
    });

    it('should allow admin to mark all notifications in bulk', async () => {
      const res = await request(app)
        .patch('/notifications/bulk-read')
        .set('x-test-user', JSON.stringify({ userId: 'admin1', role: 'admin' }))
        .send({ notificationIds: ['notif1', 'notif2', 'notif3'] });

      expect(res.status).toBe(200);
      expect(Notification.find).not.toHaveBeenCalled();
      expect(NotificationService.markMultipleAsRead).toHaveBeenCalledWith([
        'notif1',
        'notif2',
        'notif3',
      ]);
    });

    it('should return success with 0 count when no owned notifications found', async () => {
      vi.mocked(Notification.find).mockResolvedValue([
        { _id: { toString: () => 'notif1' }, userId: 'other-user' },
      ] as any);

      const res = await request(app)
        .patch('/notifications/bulk-read')
        .set('x-test-user', JSON.stringify({ userId: 'user1', role: 'student' }))
        .send({ notificationIds: ['notif1'] });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('0');
      expect(NotificationService.markMultipleAsRead).not.toHaveBeenCalled();
    });

    it('should reject empty notificationIds with 400', async () => {
      const res = await request(app)
        .patch('/notifications/bulk-read')
        .set('x-test-user', JSON.stringify({ userId: 'user1', role: 'student' }))
        .send({ notificationIds: [] });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /:id/archive', () => {
    it('should reject if notification belongs to another user (403)', async () => {
      vi.mocked(Notification.findById).mockResolvedValue({
        _id: 'notif1',
        userId: 'other-user',
      } as any);

      const res = await request(app)
        .patch('/notifications/notif1/archive')
        .set('x-test-user', JSON.stringify({ userId: 'user1', role: 'student' }));

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow if notification belongs to requesting user (200)', async () => {
      vi.mocked(Notification.findById).mockResolvedValue({
        _id: 'notif1',
        userId: 'user1',
      } as any);

      const res = await request(app)
        .patch('/notifications/notif1/archive')
        .set('x-test-user', JSON.stringify({ userId: 'user1', role: 'student' }));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should allow admin to archive any notification (200)', async () => {
      vi.mocked(Notification.findById).mockResolvedValue({
        _id: 'notif1',
        userId: 'other-user',
      } as any);

      const res = await request(app)
        .patch('/notifications/notif1/archive')
        .set('x-test-user', JSON.stringify({ userId: 'admin1', role: 'admin' }));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 if notification does not exist', async () => {
      vi.mocked(Notification.findById).mockResolvedValue(null as any);

      const res = await request(app)
        .patch('/notifications/notif1/archive')
        .set('x-test-user', JSON.stringify({ userId: 'user1', role: 'student' }));

      expect(res.status).toBe(404);
    });
  });
});
