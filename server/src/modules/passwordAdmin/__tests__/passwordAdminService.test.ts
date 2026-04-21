import { describe, it, expect, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { User, PasswordAuditLog } from '../../../models';
import { resetUserPassword, generateUserPassword } from '../passwordAdminService';

async function makeUser(id: string, extra: Record<string, unknown> = {}) {
  return User.create({
    id,
    adSoyad: `User ${id}`,
    rol: 'student',
    sinif: '9',
    sube: 'A',
    isActive: true,
    ...extra,
  });
}

async function makeAdmin(id = 'admin1') {
  return User.create({ id, adSoyad: 'Admin', rol: 'admin', isActive: true });
}

beforeEach(async () => {
  await User.deleteMany({});
  await PasswordAuditLog.deleteMany({});
});

describe('resetUserPassword', () => {
  it('sets a new hashed password, bumps tokenVersion, and records audit', async () => {
    const admin = await makeAdmin();
    const user = await makeUser('u1', { sifre: await bcrypt.hash('old', 10), tokenVersion: 3 });
    const { password } = await resetUserPassword({
      userId: user.id,
      admin: { id: admin.id, adSoyad: admin.adSoyad },
      reason: 'forgot',
    });
    expect(password).toHaveLength(8);
    const after = await User.findOne({ id: 'u1' });
    expect(after!.tokenVersion).toBe(4);
    expect(await bcrypt.compare(password, after!.sifre!)).toBe(true);
    expect(await bcrypt.compare('old', after!.sifre!)).toBe(false);
    const logs = await PasswordAuditLog.find({});
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('admin_reset');
  });

  it('throws when user does not exist', async () => {
    const admin = await makeAdmin();
    await expect(
      resetUserPassword({
        userId: 'missing',
        admin: { id: admin.id, adSoyad: admin.adSoyad },
        reason: 'forgot',
      }),
    ).rejects.toThrow(/bulunamadı/i);
  });
});

describe('generateUserPassword', () => {
  it('sets a password only when passwordLastSetAt is null', async () => {
    const admin = await makeAdmin();
    await makeUser('u2');
    const { password } = await generateUserPassword({
      userId: 'u2',
      admin: { id: admin.id, adSoyad: admin.adSoyad },
      reason: 'new_user',
    });
    expect(password).toHaveLength(8);
    const after = await User.findOne({ id: 'u2' });
    expect(after!.passwordLastSetAt).toBeInstanceOf(Date);
  });

  it('returns 409-signal (throws with code) when user already has a password', async () => {
    const admin = await makeAdmin();
    await makeUser('u3', { passwordLastSetAt: new Date() });
    await expect(
      generateUserPassword({
        userId: 'u3',
        admin: { id: admin.id, adSoyad: admin.adSoyad },
        reason: 'new_user',
      }),
    ).rejects.toMatchObject({ code: 'ALREADY_HAS_PASSWORD' });
  });
});
