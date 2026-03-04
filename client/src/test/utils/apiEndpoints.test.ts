import { describe, it, expect } from 'vitest';
import { API_ENDPOINTS } from '../../utils/apiEndpoints';

describe('API Endpoints', () => {
  describe('AUTH endpoints', () => {
    it('should have correct auth endpoints', () => {
      expect(API_ENDPOINTS.AUTH.LOGIN).toBe('/api/auth/login');
      expect(API_ENDPOINTS.AUTH.LOGOUT).toBe('/api/auth/logout');
      expect(API_ENDPOINTS.AUTH.REFRESH).toBe('/api/auth/refresh-token');
      expect(API_ENDPOINTS.AUTH.ME).toBe('/api/auth/me');
    });
  });

  describe('USER endpoints', () => {
    it('should have correct user endpoints', () => {
      expect(API_ENDPOINTS.USER.BASE).toBe('/api/user');
      expect(API_ENDPOINTS.USER.CREATE).toBe('/api/user/create');
      expect(API_ENDPOINTS.USER.GET_BY_ID('123')).toBe('/api/user/123');
      expect(API_ENDPOINTS.USER.UPDATE('123')).toBe('/api/user/123/update');
      expect(API_ENDPOINTS.USER.DELETE('123')).toBe('/api/user/123');
    });

    it('should generate role-based endpoints correctly', () => {
      expect(API_ENDPOINTS.USER.GET_BY_ROLE('student')).toBe('/api/user?role=student');
      expect(API_ENDPOINTS.USER.GET_BY_ROLE('teacher')).toBe('/api/user?role=teacher');
    });

    it('should generate parent-child endpoints correctly', () => {
      expect(API_ENDPOINTS.USER.GET_CHILDREN('parent123')).toBe('/api/user/parent/parent123/children');
      expect(API_ENDPOINTS.USER.PARENT_CHILD.LINK).toBe('/api/user/parent-child-link');
      expect(API_ENDPOINTS.USER.PARENT_CHILD.UNLINK).toBe('/api/user/parent-child-link');
    });
  });

  describe('NOTES endpoints', () => {
    it('should have correct notes endpoints', () => {
      expect(API_ENDPOINTS.NOTES.BASE).toBe('/api/notes');
      expect(API_ENDPOINTS.NOTES.CREATE).toBe('/api/notes');
      expect(API_ENDPOINTS.NOTES.UPDATE('123')).toBe('/api/notes/123');
      expect(API_ENDPOINTS.NOTES.DELETE('123')).toBe('/api/notes/123');
      expect(API_ENDPOINTS.NOTES.STATS).toBe('/api/notes/stats');
    });

    it('should have import/template endpoints', () => {
      expect(API_ENDPOINTS.NOTES.IMPORT.EXCEL).toBe('/api/notes/import-excel');
      expect(API_ENDPOINTS.NOTES.TEMPLATES).toBe('/api/notes/templates');
    });
  });

  describe('HOMEWORKS endpoints', () => {
    it('should have correct homework endpoints', () => {
      expect(API_ENDPOINTS.HOMEWORKS.BASE).toBe('/api/homeworks');
      expect(API_ENDPOINTS.HOMEWORKS.CREATE).toBe('/api/homeworks/create');
      expect(API_ENDPOINTS.HOMEWORKS.UPDATE('123')).toBe('/api/homeworks/123');
      expect(API_ENDPOINTS.HOMEWORKS.DELETE('123')).toBe('/api/homeworks/123');
    });

    it('should have teacher query-based endpoint', () => {
      expect(API_ENDPOINTS.HOMEWORKS.GET_BY_TEACHER('teacher123')).toBe('/api/homeworks?teacherId=teacher123');
    });
  });

  describe('ANNOUNCEMENTS endpoints', () => {
    it('should have correct announcement endpoints', () => {
      expect(API_ENDPOINTS.ANNOUNCEMENTS.BASE).toBe('/api/announcements');
      expect(API_ENDPOINTS.ANNOUNCEMENTS.CREATE).toBe('/api/announcements/create');
      expect(API_ENDPOINTS.ANNOUNCEMENTS.UPDATE('123')).toBe('/api/announcements/123');
      expect(API_ENDPOINTS.ANNOUNCEMENTS.DELETE('123')).toBe('/api/announcements/123');
    });

    it('should have role-based announcement endpoints', () => {
      expect(API_ENDPOINTS.ANNOUNCEMENTS.GET_BY_ROLE('student')).toBe('/api/announcements/role/student');
      expect(API_ENDPOINTS.ANNOUNCEMENTS.GET_BY_ROLE('teacher')).toBe('/api/announcements/role/teacher');
    });
  });

  describe('EVCI endpoints', () => {
    it('should have correct evci endpoints', () => {
      expect(API_ENDPOINTS.EVCI.BASE).toBe('/api/evci-requests');
      expect(API_ENDPOINTS.EVCI.STATS).toBe('/api/evci-requests/stats');
      expect(API_ENDPOINTS.EVCI.EXPORT).toBe('/api/evci-requests/export');
      expect(API_ENDPOINTS.EVCI.BULK_STATUS).toBe('/api/evci-requests/bulk-status');
      expect(API_ENDPOINTS.EVCI.WINDOW_OVERRIDE).toBe('/api/evci-requests/window-override');
      expect(API_ENDPOINTS.EVCI.SUBMISSION_WINDOW).toBe('/api/evci-requests/submission-window');
      expect(API_ENDPOINTS.EVCI.PARENT_APPROVAL('123')).toBe('/api/evci-requests/123/parent-approval');
      expect(API_ENDPOINTS.EVCI.ADMIN_APPROVAL('123')).toBe('/api/evci-requests/123/admin-approval');
    });
  });

  describe('PUSH endpoints', () => {
    it('should have correct push notification endpoints', () => {
      expect(API_ENDPOINTS.PUSH.VAPID_PUBLIC_KEY).toBe('/api/push/vapid-public-key');
      expect(API_ENDPOINTS.PUSH.SUBSCRIBE).toBe('/api/push/subscribe');
      expect(API_ENDPOINTS.PUSH.UNSUBSCRIBE).toBe('/api/push/unsubscribe');
    });
  });

  describe('CLUBS endpoints', () => {
    it('should have correct club endpoints', () => {
      expect(API_ENDPOINTS.CLUBS.BASE).toBe('/api/clubs');
      expect(API_ENDPOINTS.CLUBS.CREATE).toBe('/api/clubs/create');
      expect(API_ENDPOINTS.CLUBS.GET_BY_ID('123')).toBe('/api/clubs/123');
      expect(API_ENDPOINTS.CLUBS.UPDATE('123')).toBe('/api/clubs/123');
      expect(API_ENDPOINTS.CLUBS.DELETE('123')).toBe('/api/clubs/123');
    });

    it('should have member management endpoints', () => {
      expect(API_ENDPOINTS.CLUBS.JOIN('123')).toBe('/api/clubs/123/join');
      expect(API_ENDPOINTS.CLUBS.LEAVE('123')).toBe('/api/clubs/123/leave');
      expect(API_ENDPOINTS.CLUBS.MEMBERS.BASE('123')).toBe('/api/clubs/123/members');
      expect(API_ENDPOINTS.CLUBS.MEMBERS.ADD('123')).toBe('/api/clubs/123/members/add');
      expect(API_ENDPOINTS.CLUBS.MEMBERS.REMOVE('123', 'member456')).toBe('/api/clubs/123/members/member456');
    });
  });
});
