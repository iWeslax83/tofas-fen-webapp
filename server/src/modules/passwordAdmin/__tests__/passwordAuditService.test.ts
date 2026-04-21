import { describe, it, expect, beforeEach } from 'vitest';
import { PasswordAuditLog } from '../../../models';
import { recordPasswordEvent, queryAuditLog } from '../passwordAuditService';

beforeEach(async () => {
  await PasswordAuditLog.deleteMany({});
});

describe('recordPasswordEvent', () => {
  it('persists a record with snapshots', async () => {
    await recordPasswordEvent({
      user: { id: 'u1', adSoyad: 'Öğrenci Bir', rol: 'student' },
      admin: { id: 'a1', adSoyad: 'Admin Bir' },
      action: 'admin_reset',
      reason: 'forgot',
    });
    const all = await PasswordAuditLog.find({}).lean();
    expect(all).toHaveLength(1);
    expect(all[0].userSnapshot.adSoyad).toBe('Öğrenci Bir');
    expect(all[0].action).toBe('admin_reset');
  });

  it('rejects a password value passed in any field (guard)', async () => {
    const input: any = {
      user: { id: 'u1', adSoyad: 'x', rol: 'student' },
      admin: { id: 'a1', adSoyad: 'y' },
      action: 'admin_reset',
      reason: 'forgot',
      password: 'LEAKED',
      reasonNote: 'contains password=SECRET leak',
    };
    await expect(recordPasswordEvent(input)).rejects.toThrow(/password/i);
  });
});

describe('queryAuditLog', () => {
  it('filters by userId and paginates', async () => {
    for (let i = 0; i < 5; i++) {
      await recordPasswordEvent({
        user: { id: 'u1', adSoyad: 'x', rol: 'student' },
        admin: { id: 'a1', adSoyad: 'y' },
        action: 'admin_reset',
        reason: 'forgot',
      });
    }
    for (let i = 0; i < 3; i++) {
      await recordPasswordEvent({
        user: { id: 'u2', adSoyad: 'x', rol: 'student' },
        admin: { id: 'a1', adSoyad: 'y' },
        action: 'admin_reset',
        reason: 'security',
      });
    }
    const page = await queryAuditLog({ userId: 'u1', page: 1, limit: 3 });
    expect(page.total).toBe(5);
    expect(page.items).toHaveLength(3);
  });
});
