import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { join } from 'path';
import { User, PasswordAuditLog, PasswordImportBatch } from '../../../models';
import { app } from '../../../index';
import { generateAccessToken } from '../../../utils/jwt';

let adminToken: string;
let nonAdminToken: string;

beforeEach(async () => {
  // setup.ts already cleared all collections; re-seed admin + student here.
  const admin = await User.create({
    id: 'admin1',
    adSoyad: 'Yönetici',
    rol: 'admin',
    isActive: true,
    tokenVersion: 0,
  });
  const student = await User.create({
    id: 's1',
    adSoyad: 'Öğrenci',
    rol: 'student',
    isActive: true,
    tokenVersion: 0,
  });
  adminToken = generateAccessToken({ userId: admin.id, role: admin.rol });
  nonAdminToken = generateAccessToken({ userId: student.id, role: student.rol });
  await PasswordAuditLog.deleteMany({});
  await PasswordImportBatch.deleteMany({});
});

describe('POST /api/admin/passwords/reset/:userId', () => {
  it('rejects non-admin users', async () => {
    const res = await request(app)
      .post('/api/admin/passwords/reset/s1')
      .set('Authorization', `Bearer ${nonAdminToken}`)
      .send({ reason: 'forgot' });
    expect(res.status).toBe(403);
  });

  it('returns a plaintext password once with no-store header', async () => {
    const res = await request(app)
      .post('/api/admin/passwords/reset/s1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'forgot' });
    expect(res.status).toBe(200);
    expect(res.body.password).toMatch(/^[A-HJ-NP-Za-km-np-z2-9]{8}$/);
    expect(res.headers['cache-control']).toContain('no-store');
  });

  it('returns 404 for unknown user', async () => {
    const res = await request(app)
      .post('/api/admin/passwords/reset/does-not-exist')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'forgot' });
    expect(res.status).toBe(404);
  });

  it('rejects invalid reason', async () => {
    const res = await request(app)
      .post('/api/admin/passwords/reset/s1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'bogus' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/admin/passwords/bulk-import', () => {
  const fixturePath = join(__dirname, '../../../test/fixtures/class-list-sample.xls');

  it('previews without writing', async () => {
    const res = await request(app)
      .post('/api/admin/passwords/bulk-import?preview=true')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', fixturePath);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(444);
    const count = await User.countDocuments({ rol: 'student' });
    expect(count).toBe(1);
  });

  it('imports 444 users as inactive with credentials file', async () => {
    const res = await request(app)
      .post('/api/admin/passwords/bulk-import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', fixturePath);
    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(444);
    // N-C1: credentials are now served via downloadUrl, not inline base64.
    expect(res.body.credentialsFileBase64).toBeUndefined();
    expect(typeof res.body.downloadUrl).toBe('string');
    expect(res.body.downloadUrl).toMatch(/\/credentials\.xlsx$/);
    expect(typeof res.body.credentialsFilename).toBe('string');
    expect(res.body.batchId).toMatch(/^[0-9a-f-]{36}$/);
    const inactive = await User.countDocuments({
      importBatchId: res.body.batchId,
      isActive: false,
    });
    expect(inactive).toBe(444);
  });

  it('activates the batch and flips users to active', async () => {
    const imp = await request(app)
      .post('/api/admin/passwords/bulk-import')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', fixturePath);
    const res = await request(app)
      .post('/api/admin/passwords/activate-batch')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ batchId: imp.body.batchId });
    expect(res.status).toBe(200);
    const active = await User.countDocuments({ importBatchId: imp.body.batchId, isActive: true });
    expect(active).toBe(444);
  });
});
