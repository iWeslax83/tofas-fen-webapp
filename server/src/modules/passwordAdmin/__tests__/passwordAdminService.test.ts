import { describe, it, expect, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { join } from 'path';
import { User, PasswordAuditLog, PasswordImportBatch } from '../../../models';
import {
  resetUserPassword,
  generateUserPassword,
  bulkImportClassList,
  activateImportBatch,
  regenerateImportBatchPasswords,
  cancelImportBatch,
  listPendingBatches,
} from '../passwordAdminService';

const fixture = () => readFileSync(join(__dirname, '../../../test/fixtures/class-list-sample.xls'));

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
    const after = await User.findOne({ id: 'u1' }).select('+sifre');
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

describe('bulkImportClassList', () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await PasswordAuditLog.deleteMany({});
    await PasswordImportBatch.deleteMany({});
  });

  it('creates inactive users with hashed passwords and returns credentials rows', async () => {
    const admin = await makeAdmin();
    const { batchId, credentialsRows } = await bulkImportClassList({
      fileBuffer: fixture(),
      admin: { id: admin.id, adSoyad: admin.adSoyad },
    });
    expect(credentialsRows).toHaveLength(444);
    const users = await User.find({ importBatchId: batchId });
    expect(users).toHaveLength(444);
    expect(users.every((u) => u.isActive === false)).toBe(true);
    // N-H4: sifre is select:false — opt-in to verify hashed passwords were stored.
    const usersWithSifre = await User.find({ importBatchId: batchId }).select('+sifre');
    expect(usersWithSifre.every((u) => typeof u.sifre === 'string' && u.sifre.length > 20)).toBe(
      true,
    );
    const batch = await PasswordImportBatch.findOne({ batchId });
    expect(batch!.status).toBe('pending');
    expect(batch!.totalCount).toBe(444);
    const logs = await PasswordAuditLog.find({ batchId });
    expect(logs).toHaveLength(444);
  });

  it('skips users whose IDs already exist', async () => {
    const admin = await makeAdmin();
    await makeUser('202');
    const { credentialsRows, skipped } = await bulkImportClassList({
      fileBuffer: fixture(),
      admin: { id: admin.id, adSoyad: admin.adSoyad },
    });
    expect(skipped).toContain('202');
    expect(credentialsRows.find((r) => r.id === '202')).toBeUndefined();
    expect(credentialsRows).toHaveLength(443);
  });
});

describe('activateImportBatch', () => {
  it('activates all users in the batch', async () => {
    const admin = await makeAdmin();
    const { batchId } = await bulkImportClassList({
      fileBuffer: fixture(),
      admin: { id: admin.id, adSoyad: admin.adSoyad },
    });
    await activateImportBatch({ batchId, admin: { id: admin.id, adSoyad: admin.adSoyad } });
    const users = await User.find({ importBatchId: batchId });
    expect(users.every((u) => u.isActive)).toBe(true);
    const batch = await PasswordImportBatch.findOne({ batchId });
    expect(batch!.status).toBe('activated');
  });
});

describe('regenerateImportBatchPasswords', () => {
  it('replaces all passwords in a pending batch', async () => {
    const admin = await makeAdmin();
    const { batchId, credentialsRows: first } = await bulkImportClassList({
      fileBuffer: fixture(),
      admin: { id: admin.id, adSoyad: admin.adSoyad },
    });
    const { credentialsRows: second } = await regenerateImportBatchPasswords({
      batchId,
      admin: { id: admin.id, adSoyad: admin.adSoyad },
    });
    expect(second).toHaveLength(first.length);
    const matches = second.filter((s) =>
      first.some((f) => f.id === s.id && f.password === s.password),
    );
    expect(matches).toHaveLength(0);
  });
});

describe('cancelImportBatch', () => {
  it('removes all users and marks batch cancelled', async () => {
    const admin = await makeAdmin();
    const { batchId } = await bulkImportClassList({
      fileBuffer: fixture(),
      admin: { id: admin.id, adSoyad: admin.adSoyad },
    });
    await cancelImportBatch({ batchId, admin: { id: admin.id, adSoyad: admin.adSoyad } });
    const remaining = await User.countDocuments({ importBatchId: batchId });
    expect(remaining).toBe(0);
    const batch = await PasswordImportBatch.findOne({ batchId });
    expect(batch!.status).toBe('cancelled');
  });
});

describe('listPendingBatches', () => {
  it('returns only pending batches sorted newest-first', async () => {
    const admin = await makeAdmin();
    const { batchId: a } = await bulkImportClassList({
      fileBuffer: fixture(),
      admin: { id: admin.id, adSoyad: admin.adSoyad },
    });
    await activateImportBatch({ batchId: a, admin: { id: admin.id, adSoyad: admin.adSoyad } });
    await User.deleteMany({});
    const { batchId: b } = await bulkImportClassList({
      fileBuffer: fixture(),
      admin: { id: admin.id, adSoyad: admin.adSoyad },
    });
    const pending = await listPendingBatches();
    expect(pending.map((p) => p.batchId)).toEqual([b]);
  });
});
