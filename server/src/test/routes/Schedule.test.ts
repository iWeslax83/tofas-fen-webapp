import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { connectDB, closeDB } from '../../db';
import { Schedule } from '../../models/Schedule';
import { User } from '../../models';
import type { Request, Response, NextFunction } from 'express';

let mockUser: { userId: string; role: string } = { userId: 'admin1', role: 'admin' };

vi.mock('../../middleware/security', () => ({
  preventSQLInjection: (_req: Request, _res: Response, next: NextFunction) => next(),
  preventXSS: (_req: Request, _res: Response, next: NextFunction) => next(),
  sanitizeInput: (_req: Request, _res: Response, next: NextFunction) => next(),
  csrfProtection: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

vi.mock('express-rate-limit', () => {
  const mock = vi.fn(() => (_req: Request, _res: Response, next: NextFunction) => next());
  return { default: mock, rateLimit: mock };
});

vi.mock('../../utils/jwt', async () => {
  const actual = await vi.importActual('../../utils/jwt');
  return {
    ...(actual as Record<string, unknown>),
    authenticateJWT: vi.fn(
      (
        req: Request & { user?: { userId: string; role: string } },
        _res: Response,
        next: NextFunction,
      ) => {
        req.user = mockUser;
        next();
      },
    ),
    authorizeRoles: vi.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),
  };
});

function asAdmin() {
  mockUser = { userId: 'admin1', role: 'admin' };
}

function asTeacher(id = 'teacher1') {
  mockUser = { userId: id, role: 'teacher' };
}

const basePeriod = {
  period: 1,
  subject: 'Matematik',
  teacherId: 'teacher1',
  teacherName: 'Ayşe Yılmaz',
  startTime: '08:30',
  endTime: '09:20',
};

async function seedSchedule(
  classLevel: string,
  classSection: string,
  teacherId = 'teacher1',
  overrides: Partial<typeof basePeriod> = {},
) {
  return Schedule.create({
    id: `sch_${classLevel}${classSection}_${teacherId}_${Math.random().toString(36).slice(2)}`,
    classLevel,
    classSection,
    academicYear: '2025-2026',
    semester: '1. Dönem',
    isActive: true,
    createdBy: 'admin1',
    schedule: [
      {
        day: 'Pazartesi',
        periods: [{ ...basePeriod, teacherId, ...overrides }],
      },
    ],
  });
}

beforeEach(async () => {
  await connectDB();
  try {
    await Schedule.deleteMany({});
    await User.deleteMany({});
  } catch (err) {
    console.warn('Test DB cleanup error', err);
  }
  asAdmin();
});

afterEach(async () => {
  await closeDB();
});

describe('GET /api/schedule', () => {
  it('admin sees every class schedule', async () => {
    await seedSchedule('9', 'A', 'teacher1');
    await seedSchedule('10', 'B', 'teacher2');

    const res = await request(app).get('/api/schedule').expect(200);

    expect(res.body.schedules.length).toBe(2);
  });

  it('teacher with no class filter sees only classes they teach', async () => {
    await seedSchedule('9', 'A', 'teacher1');
    await seedSchedule('10', 'B', 'teacher2');

    asTeacher('teacher1');
    const res = await request(app).get('/api/schedule').expect(200);

    expect(res.body.schedules.length).toBe(1);
    expect(res.body.schedules[0].classLevel).toBe('9');
    expect(res.body.schedules[0].classSection).toBe('A');
  });

  it('teacher can still explicitly filter by a class they do not teach', async () => {
    await seedSchedule('9', 'A', 'teacher1');
    await seedSchedule('10', 'B', 'teacher2');

    asTeacher('teacher1');
    const res = await request(app).get('/api/schedule?classLevel=10&classSection=B').expect(200);

    expect(res.body.schedules.length).toBe(1);
    expect(res.body.schedules[0].classLevel).toBe('10');
  });
});
