import { describe, it, expect } from 'vitest';
import { API_ENDPOINTS } from '../../utils/apiEndpoints';

describe('API Endpoints', () => {
  describe('AUTH endpoints', () => {
    it('should have correct auth endpoints', () => {
      expect(API_ENDPOINTS.AUTH.LOGIN).toBe('/api/auth/login');
      expect(API_ENDPOINTS.AUTH.LOGOUT).toBe('/api/auth/logout');
      expect(API_ENDPOINTS.AUTH.REFRESH).toBe('/api/auth/refresh');
      expect(API_ENDPOINTS.AUTH.ME).toBe('/api/auth/me');
    });
  });

  describe('USER endpoints', () => {
    it('should have correct user endpoints', () => {
      expect(API_ENDPOINTS.USER.BASE).toBe('/api/user');
      expect(API_ENDPOINTS.USER.CREATE).toBe('/api/user/create');
      expect(API_ENDPOINTS.USER.GET_BY_ID('123')).toBe('/api/user/123');
      expect(API_ENDPOINTS.USER.UPDATE('123')).toBe('/api/user/123/update');
      expect(API_ENDPOINTS.USER.DELETE('123')).toBe('/api/user/123/delete');
    });

    it('should generate role-based endpoints correctly', () => {
      expect(API_ENDPOINTS.USER.GET_BY_ROLE('student')).toBe('/api/user?role=student');
      expect(API_ENDPOINTS.USER.GET_BY_ROLE('teacher')).toBe('/api/user?role=teacher');
    });

    it('should generate parent-child endpoints correctly', () => {
      expect(API_ENDPOINTS.USER.GET_CHILDREN('parent123')).toBe('/api/user/parent123/children');
      expect(API_ENDPOINTS.USER.PARENT_CHILD.LINK).toBe('/api/user/parent-child-link');
      expect(API_ENDPOINTS.USER.PARENT_CHILD.UNLINK).toBe('/api/user/parent-child-link');
    });
  });

  describe('NOTES endpoints', () => {
    it('should have correct notes endpoints', () => {
      expect(API_ENDPOINTS.NOTES.BASE).toBe('/api/notes');
      expect(API_ENDPOINTS.NOTES.CREATE).toBe('/api/notes/create');
      expect(API_ENDPOINTS.NOTES.UPDATE('123')).toBe('/api/notes/123');
      expect(API_ENDPOINTS.NOTES.DELETE('123')).toBe('/api/notes/123');
      expect(API_ENDPOINTS.NOTES.STATS).toBe('/api/notes/stats');
    });

    it('should have import/export endpoints', () => {
      expect(API_ENDPOINTS.NOTES.IMPORT.FORMATS).toBe('/api/notes/import/formats');
      expect(API_ENDPOINTS.NOTES.IMPORT.FILE).toBe('/api/notes/import/file');
      expect(API_ENDPOINTS.NOTES.TEMPLATE.DOWNLOAD).toBe('/api/notes/template/download');
    });
  });

  describe('HOMEWORKS endpoints', () => {
    it('should have correct homework endpoints', () => {
      expect(API_ENDPOINTS.HOMEWORKS.BASE).toBe('/api/homeworks');
      expect(API_ENDPOINTS.HOMEWORKS.CREATE).toBe('/api/homeworks/create');
      expect(API_ENDPOINTS.HOMEWORKS.UPDATE('123')).toBe('/api/homeworks/123');
      expect(API_ENDPOINTS.HOMEWORKS.DELETE('123')).toBe('/api/homeworks/123');
    });

    it('should have student/teacher specific endpoints', () => {
      expect(API_ENDPOINTS.HOMEWORKS.GET_BY_STUDENT('student123')).toBe('/api/homeworks/student/student123');
      expect(API_ENDPOINTS.HOMEWORKS.GET_BY_TEACHER('teacher123')).toBe('/api/homeworks/teacher/teacher123');
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
