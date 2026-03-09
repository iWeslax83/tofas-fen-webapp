import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies that need MongoDB
vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../models/User', () => ({
  User: {
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

vi.mock('../../services/NotificationService', () => ({
  NotificationService: {
    createNotification: vi.fn().mockResolvedValue({}),
  },
}));

import { SecurityAlertService } from '../../services/SecurityAlertService';

describe('SecurityAlertService', () => {
  describe('getSecurityStatus', () => {
    it('should return a status object with expected fields', () => {
      const status = SecurityAlertService.getSecurityStatus();
      expect(status).toHaveProperty('recentLoginFailures');
      expect(status).toHaveProperty('uniqueFailedIPs');
      expect(status).toHaveProperty('uniqueFailedUsers');
      expect(status).toHaveProperty('recentRoleChanges');
      expect(status).toHaveProperty('activeDataExportUsers');
      expect(status).toHaveProperty('activeAlertCooldowns');
    });
  });

  describe('trackLoginFailure', () => {
    it('should increment recentLoginFailures count', () => {
      const before = SecurityAlertService.getSecurityStatus().recentLoginFailures;
      SecurityAlertService.trackLoginFailure('user1', '10.0.0.1');
      const after = SecurityAlertService.getSecurityStatus().recentLoginFailures;
      expect(after).toBeGreaterThan(before);
    });

    it('should track unique IPs', () => {
      SecurityAlertService.trackLoginFailure('user1', '10.0.0.2');
      SecurityAlertService.trackLoginFailure('user1', '10.0.0.3');
      const status = SecurityAlertService.getSecurityStatus();
      expect(status.uniqueFailedIPs).toBeGreaterThanOrEqual(2);
    });
  });

  describe('trackDataExport', () => {
    it('should track data export activity', () => {
      SecurityAlertService.trackDataExport('export-user-1');
      const status = SecurityAlertService.getSecurityStatus();
      expect(status.activeDataExportUsers).toBeGreaterThanOrEqual(1);
    });
  });

  describe('trackRoleChange', () => {
    it('should increment role change count', () => {
      const before = SecurityAlertService.getSecurityStatus().recentRoleChanges;
      SecurityAlertService.trackRoleChange('user1', 'admin', 'admin1');
      const after = SecurityAlertService.getSecurityStatus().recentRoleChanges;
      expect(after).toBeGreaterThan(before);
    });
  });

  describe('trackAdminAction', () => {
    it('should not throw for off-hours or on-hours actions', () => {
      expect(() => {
        SecurityAlertService.trackAdminAction('admin1', 'delete_user', '10.0.0.1');
      }).not.toThrow();
    });
  });

  describe('trackSuspiciousTokenUsage', () => {
    it('should not throw', () => {
      expect(() => {
        SecurityAlertService.trackSuspiciousTokenUsage('user1', 'token reuse detected', '10.0.0.1');
      }).not.toThrow();
    });
  });
});
