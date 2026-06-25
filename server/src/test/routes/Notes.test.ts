import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { connectDB, closeDB } from '../../db';
import Note from '../../models/Note';
import type { Request, Response, NextFunction } from 'express';

// -----------------------------------------------------------------------
// Mutable auth context — tests set this before each request so they can
// exercise different roles without re-importing the mock.
// -----------------------------------------------------------------------
let mockUser: { userId: string; role: string } = { userId: 'admin1', role: 'admin' };

vi.mock('../../middleware/security', () => ({
  preventSQLInjection: (req: Request, res: Response, next: NextFunction) => {
    const bodyStr = JSON.stringify((req as Request & { body?: unknown }).body);
    if (bodyStr && (bodyStr.includes("'") || bodyStr.includes('--'))) {
      return res.status(400).json({ error: 'Validation failed' });
    }
    next();
  },
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

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------
function asAdmin() {
  mockUser = { userId: 'admin1', role: 'admin' };
}

function asTeacher(id = 'teacher1') {
  mockUser = { userId: id, role: 'teacher' };
}

function asStudent(id = 'student1') {
  mockUser = { userId: id, role: 'student' };
}

function asParent(id = 'parent1') {
  mockUser = { userId: id, role: 'parent' };
}

const baseNote = {
  studentId: 'student1',
  studentName: 'Ali Veli',
  lesson: 'Matematik',
  average: 75,
  semester: '1',
  academicYear: '2025-2026',
  source: 'manual',
};

async function seedNote(overrides: Partial<typeof baseNote> = {}) {
  return Note.create({ ...baseNote, ...overrides });
}

// -----------------------------------------------------------------------
// Lifecycle
// -----------------------------------------------------------------------
beforeEach(async () => {
  await connectDB();
  try {
    await Note.deleteMany({});
  } catch (err) {
    console.warn('Test DB cleanup error', err);
  }
  asAdmin();
});

afterEach(async () => {
  await closeDB();
});

// -----------------------------------------------------------------------
// GET /api/notes
// -----------------------------------------------------------------------
describe('GET /api/notes', () => {
  it('admin sees all active notes with pagination shape', async () => {
    await seedNote({ studentId: 'student1' });
    await seedNote({ studentId: 'student2', studentName: 'Fatma Nur', lesson: 'Fizik' });

    const res = await request(app).get('/api/notes').expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination).toMatchObject({
      page: 1,
      limit: 100,
      total: 2,
      totalPages: 1,
    });
  });

  it('admin can filter by lesson query param', async () => {
    await seedNote({ lesson: 'Matematik' });
    await seedNote({ lesson: 'Fizik' });

    const res = await request(app).get('/api/notes?lesson=Matematik').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].lesson).toBe('Matematik');
  });

  it('admin can filter by semester', async () => {
    await seedNote({ semester: '1' });
    await seedNote({ semester: '2' });

    const res = await request(app).get('/api/notes?semester=2').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].semester).toBe('2');
  });

  it('admin can filter by studentId query param', async () => {
    await seedNote({ studentId: 'student1' });
    await seedNote({ studentId: 'student2', studentName: 'Fatma Nur' });

    const res = await request(app).get('/api/notes?studentId=student2').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].studentId).toBe('student2');
  });

  it('student sees only own notes', async () => {
    asStudent('student1');
    await seedNote({ studentId: 'student1' });
    await seedNote({ studentId: 'student2', studentName: 'Fatma Nur' });

    const res = await request(app).get('/api/notes').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].studentId).toBe('student1');
  });

  it('parent with no linked children returns empty array', async () => {
    asParent('parent-no-kids');
    await seedNote({ studentId: 'student1' });

    // parent has no childId in DB — getParentChildIds returns [] → route returns []
    const res = await request(app).get('/api/notes').expect(200);

    // When childIds is empty the route does res.json([]) — raw array, not envelope
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it('inactive notes are excluded', async () => {
    await Note.create({ ...baseNote, isActive: false });

    const res = await request(app).get('/api/notes').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(0);
  });
});

// -----------------------------------------------------------------------
// GET /api/notes/student/:studentId
// -----------------------------------------------------------------------
describe('GET /api/notes/student/:studentId', () => {
  it('admin can fetch notes for any student', async () => {
    asAdmin();
    await seedNote({ studentId: 'student1' });
    await seedNote({ studentId: 'student1', lesson: 'Fizik' });

    const res = await request(app).get('/api/notes/student/student1').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  it('teacher can fetch notes for any student', async () => {
    asTeacher();
    await seedNote({ studentId: 'student1' });

    const res = await request(app).get('/api/notes/student/student1').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
  });

  it('student accessing own notes returns 200', async () => {
    asStudent('student1');
    await seedNote({ studentId: 'student1' });

    const res = await request(app).get('/api/notes/student/student1').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
  });

  it('student accessing another student notes returns 403', async () => {
    asStudent('student1');
    await seedNote({ studentId: 'student2', studentName: 'Fatma Nur' });

    const res = await request(app).get('/api/notes/student/student2').expect(403);

    expect(res.body).toHaveProperty('error');
  });
});

// -----------------------------------------------------------------------
// POST /api/notes
// -----------------------------------------------------------------------
describe('POST /api/notes', () => {
  it('teacher/admin can create a note and source is set to manual', async () => {
    asTeacher();
    const res = await request(app)
      .post('/api/notes')
      .send({
        studentId: 'student1',
        studentName: 'Ali Veli',
        lesson: 'Matematik',
        average: 80,
        semester: '1',
        academicYear: '2025-2026',
      })
      .expect(201);

    expect(res.body.studentId).toBe('student1');
    expect(res.body.lesson).toBe('Matematik');
    expect(res.body.source).toBe('manual');
  });

  it('missing required fields returns 400 with error details', async () => {
    asTeacher();
    const res = await request(app)
      .post('/api/notes')
      .send({ lesson: 'Matematik' }) // missing studentName, average, semester, academicYear
      .expect(400);

    expect(res.body).toHaveProperty('error');
    expect(res.body).toHaveProperty('details');
  });

  it('invalid lesson enum returns 400', async () => {
    asTeacher();
    const res = await request(app)
      .post('/api/notes')
      .send({ ...baseNote, lesson: 'InvalidLesson' })
      .expect(400);

    expect(res.body).toHaveProperty('error');
  });
});

// -----------------------------------------------------------------------
// PUT /api/notes/:id
// -----------------------------------------------------------------------
describe('PUT /api/notes/:id', () => {
  it('admin can update any note', async () => {
    asAdmin();
    const note = await seedNote();

    const res = await request(app)
      .put(`/api/notes/${note._id}`)
      .send({ average: 90, exam1: 90 })
      .expect(200);

    expect(res.body.average).toBe(90);
  });

  it('returns 404 for non-existent note id', async () => {
    asAdmin();
    const fakeId = '000000000000000000000001';

    const res = await request(app).put(`/api/notes/${fakeId}`).send({ average: 90 }).expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });

  it('teacher can update a note when createdBy is not set (schema has no createdBy field)', async () => {
    // The Note schema has no createdBy field — Mongoose silently drops it.
    // The route's ownership check: `existingNoteDoc.createdBy && createdBy !== userId`
    // evaluates to false when createdBy is undefined, so any teacher may update.
    const note = await seedNote();

    asTeacher('teacher1');

    const res = await request(app).put(`/api/notes/${note._id}`).send({ average: 55 }).expect(200);

    expect(res.body.average).toBe(55);
  });
});

// -----------------------------------------------------------------------
// DELETE /api/notes/:id
// -----------------------------------------------------------------------
describe('DELETE /api/notes/:id', () => {
  it('admin can soft-delete a note (isActive → false)', async () => {
    asAdmin();
    const note = await seedNote();

    const res = await request(app).delete(`/api/notes/${note._id}`).expect(200);

    expect(res.body.success).toBe(true);

    // Verify soft-delete in DB
    const deleted = await Note.findById(note._id);
    expect(deleted?.isActive).toBe(false);
  });

  it('returns 404 when note not found', async () => {
    asAdmin();
    const fakeId = '000000000000000000000002';

    const res = await request(app).delete(`/api/notes/${fakeId}`).expect(404);

    expect(res.body.success).toBe(false);
  });
});

// -----------------------------------------------------------------------
// GET /api/notes/stats
// -----------------------------------------------------------------------
describe('GET /api/notes/stats', () => {
  it('returns aggregated stats array for admin', async () => {
    asAdmin();
    await seedNote({ lesson: 'Matematik', average: 80 });
    await seedNote({ lesson: 'Matematik', average: 60 });
    await seedNote({ lesson: 'Fizik', average: 70 });

    const res = await request(app).get('/api/notes/stats').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);

    const mathStat = res.body.find(
      (s: { _id: { lesson: string } }) => s._id.lesson === 'Matematik',
    );
    expect(mathStat).toBeDefined();
    expect(mathStat.count).toBe(2);
    expect(mathStat).toHaveProperty('avgGrade');
    expect(mathStat).toHaveProperty('minGrade');
    expect(mathStat).toHaveProperty('maxGrade');
  });

  it('parent with no linked children returns empty stats array', async () => {
    asParent('parent-no-kids');
    await seedNote();

    const res = await request(app).get('/api/notes/stats').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });
});

// -----------------------------------------------------------------------
// PUT /api/notes/bulk-update
// -----------------------------------------------------------------------
describe('PUT /api/notes/bulk-update', () => {
  it('PUT /bulk-update is shadowed by PUT /:id — returns 400 (CastError on "bulk-update" as ObjectId)', async () => {
    // CHARACTERIZATION: PUT /:id is registered before PUT /bulk-update in the
    // router, so Express matches the literal string "bulk-update" as the :id
    // parameter. Note.findById("bulk-update") throws a CastError, which the
    // route catches and returns as 400.
    asAdmin();
    const n1 = await seedNote({ lesson: 'Matematik', average: 50 });
    const n2 = await seedNote({ lesson: 'Fizik', average: 60 });

    const res = await request(app)
      .put('/api/notes/bulk-update')
      .send({
        notes: [
          { id: String(n1._id), average: 85 },
          { id: String(n2._id), average: 90 },
        ],
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });

  it('sending invalid body to /bulk-update still returns 400 (shadowed by /:id)', async () => {
    // Same routing shadow: any PUT to /bulk-update goes to /:id handler first.
    asAdmin();

    const res = await request(app)
      .put('/api/notes/bulk-update')
      .send({ notes: 'not-an-array' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });
});

// -----------------------------------------------------------------------
// GET /api/notes/search
// -----------------------------------------------------------------------
describe('GET /api/notes/search', () => {
  it('returns 400 when q param is missing', async () => {
    asAdmin();

    const res = await request(app).get('/api/notes/search').expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });

  it('returns matching notes for admin when q matches lesson', async () => {
    asAdmin();
    await seedNote({ lesson: 'Matematik' });
    await seedNote({ lesson: 'Fizik' });

    const res = await request(app).get('/api/notes/search?q=Matematik').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].lesson).toBe('Matematik');
  });
});
