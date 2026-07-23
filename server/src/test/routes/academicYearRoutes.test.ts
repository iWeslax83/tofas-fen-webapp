import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { User } from '../../models';
import { proposeRollover } from '../../modules/academicYear/academicYearService';
import { generateAccessToken } from '../../utils/jwt';

async function seedUsers() {
  await User.create({
    id: 'admin_1',
    adSoyad: 'Test Admin',
    rol: 'admin',
    isActive: true,
    childId: [],
  });
  await User.create({
    id: 'ogr_1',
    adSoyad: 'Test Öğrenci',
    rol: 'student',
    sinif: '9',
    sube: 'A',
    isActive: true,
    childId: [],
  });
}

describe('academic-year rotaları', () => {
  let adminToken: string;
  let studentToken: string;

  beforeEach(async () => {
    await seedUsers();
    adminToken = generateAccessToken({ userId: 'admin_1', role: 'admin' });
    studentToken = generateAccessToken({ userId: 'ogr_1', role: 'student' });
  });

  it('öğrenci erişemez', async () => {
    await request(app)
      .get('/api/academic-year/rollover/pending')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403);
  });

  it('kimliksiz istek reddedilir', async () => {
    await request(app).get('/api/academic-year/rollover/pending').expect(401);
  });

  it('bekleyen geçiş yokken null döner', async () => {
    const res = await request(app)
      .get('/api/academic-year/rollover/pending')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.rollover).toBeNull();
  });

  it('bekleyen geçişi sayaçlarıyla döndürür', async () => {
    await proposeRollover();

    const res = await request(app)
      .get('/api/academic-year/rollover/pending')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.rollover.counts).toEqual({ '9->10': 1 });
    expect(res.body.rollover.snapshot).toHaveLength(1);
  });

  it('geçişi uygular', async () => {
    const rollover = await proposeRollover();

    const res = await request(app)
      .post(`/api/academic-year/rollover/${rollover!.rolloverId}/apply`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.promoted).toBe(1);
    expect((await User.findOne({ id: 'ogr_1' }))?.sinif).toBe('10');
  });

  it('ikinci uygulama 409 döner', async () => {
    const rollover = await proposeRollover();
    const url = `/api/academic-year/rollover/${rollover!.rolloverId}/apply`;

    await request(app).post(url).set('Authorization', `Bearer ${adminToken}`).expect(200);
    await request(app).post(url).set('Authorization', `Bearer ${adminToken}`).expect(409);
  });

  it('geçersiz rolloverId 400 döner', async () => {
    await request(app)
      .post('/api/academic-year/rollover/uuid-degil/apply')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });
});
