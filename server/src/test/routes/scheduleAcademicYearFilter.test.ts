import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { Schedule, User } from '../../models';
import { getAcademicYear, getPreviousAcademicYear } from '../../utils/academicYear';
import { generateAccessToken } from '../../utils/jwt';

const CURRENT = getAcademicYear();
const PREVIOUS = getPreviousAcademicYear(CURRENT);

function scheduleFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: `sch_${Math.random().toString(36).slice(2)}`,
    classLevel: '10',
    classSection: 'A',
    semester: '1. Dönem',
    isActive: true,
    createdBy: 'admin_1',
    schedule: [
      {
        day: 'Pazartesi',
        periods: [
          {
            period: 1,
            subject: 'Matematik',
            teacherId: 'teacher_1',
            teacherName: 'Test Öğretmen',
            startTime: '09:00',
            endTime: '09:40',
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('GET /api/schedule — öğretim yılı filtresi', () => {
  let token: string;

  beforeEach(async () => {
    await User.create({
      id: 'admin_1',
      adSoyad: 'Test Admin',
      rol: 'admin',
      isActive: true,
      childId: [],
    });
    token = generateAccessToken({ userId: 'admin_1', role: 'admin' });

    await Schedule.create(scheduleFixture({ id: 'sch_bu_yil', academicYear: CURRENT }));
    await Schedule.create(scheduleFixture({ id: 'sch_gecen_yil', academicYear: PREVIOUS }));
  });

  it('parametresiz istekte sadece içinde bulunulan yılın programı döner', async () => {
    const res = await request(app)
      .get('/api/schedule')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const ids = res.body.schedules.map((s: { id: string }) => s.id);
    expect(ids).toContain('sch_bu_yil');
    expect(ids).not.toContain('sch_gecen_yil');
  });

  it('academicYear parametresiyle arşiv okunabilir', async () => {
    const res = await request(app)
      .get(`/api/schedule?academicYear=${PREVIOUS}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const ids = res.body.schedules.map((s: { id: string }) => s.id);
    expect(ids).toContain('sch_gecen_yil');
    expect(ids).not.toContain('sch_bu_yil');
  });
});
