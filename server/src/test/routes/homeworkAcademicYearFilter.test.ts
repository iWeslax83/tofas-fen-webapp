import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { Homework, User } from '../../models';
import { getAcademicYear, getPreviousAcademicYear } from '../../utils/academicYear';
import { generateAccessToken } from '../../utils/jwt';

const CURRENT = getAcademicYear();
const PREVIOUS = getPreviousAcademicYear(CURRENT);

function homeworkFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: `hw_${Math.random().toString(36).slice(2)}`,
    title: 'Ödev',
    description: 'Açıklama',
    subject: 'Matematik',
    teacherId: 'teacher_1',
    teacherName: 'Test Öğretmen',
    classLevel: '10',
    classSection: 'A',
    dueDate: new Date('2026-09-15'),
    ...overrides,
  };
}

describe('GET /api/homeworks — öğretim yılı filtresi', () => {
  let token: string;

  beforeEach(async () => {
    await Homework.deleteMany({});
    await User.deleteMany({ id: 'admin_1' });

    await User.create({
      id: 'admin_1',
      adSoyad: 'Test Admin',
      rol: 'admin',
      isActive: true,
      childId: [],
    });
    token = generateAccessToken({ userId: 'admin_1', role: 'admin' });

    await Homework.create(homeworkFixture({ id: 'hw_bu_yil', academicYear: CURRENT }));
    await Homework.create(homeworkFixture({ id: 'hw_gecen_yil', academicYear: PREVIOUS }));
  });

  it('parametresiz istekte sadece içinde bulunulan yılın ödevleri döner', async () => {
    const res = await request(app)
      .get('/api/homeworks')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const ids = res.body.homeworks.map((h: { id: string }) => h.id);
    expect(ids).toContain('hw_bu_yil');
    expect(ids).not.toContain('hw_gecen_yil');
  });

  it('academicYear parametresiyle arşiv okunabilir', async () => {
    const res = await request(app)
      .get(`/api/homeworks?academicYear=${PREVIOUS}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const ids = res.body.homeworks.map((h: { id: string }) => h.id);
    expect(ids).toContain('hw_gecen_yil');
    expect(ids).not.toContain('hw_bu_yil');
  });
});
