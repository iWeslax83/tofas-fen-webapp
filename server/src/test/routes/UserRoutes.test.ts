import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import { connectDB, closeDB } from '../../db';
import { User } from '../../models';
import type { Request, Response, NextFunction } from 'express';

// -----------------------------------------------------------------------
// Mutable auth context — tests set this before each request.
// -----------------------------------------------------------------------
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

vi.mock('../../middleware/waf', () => ({
  wafMiddleware: (_req: Request, _res: Response, next: NextFunction) => next(),
  cloudflareHeaders: (_req: Request, _res: Response, next: NextFunction) => next(),
  initWafRedis: vi.fn(),
  blockIP: vi.fn(),
  unblockIP: vi.fn(),
  getWafStatus: vi.fn(() => ({})),
}));

// -----------------------------------------------------------------------
// Role helpers
// -----------------------------------------------------------------------
function asAdmin(id = 'admin1') {
  mockUser = { userId: id, role: 'admin' };
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

// -----------------------------------------------------------------------
// Seed helpers
// -----------------------------------------------------------------------
async function seedUser(overrides: Record<string, unknown> = {}) {
  return User.create({
    id: 'user1',
    adSoyad: 'Test Kullanici',
    rol: 'student',
    sinif: '10',
    sube: 'A',
    sifre: 'hashed_pw',
    isActive: true,
    ...overrides,
  });
}

// -----------------------------------------------------------------------
// Lifecycle
// -----------------------------------------------------------------------
beforeEach(async () => {
  await connectDB();
  try {
    await User.deleteMany({});
  } catch (err) {
    console.warn('Test DB cleanup error', err);
  }
  asAdmin();
});

afterEach(async () => {
  await closeDB();
});

// -----------------------------------------------------------------------
// GET /api/users (list all — admin/teacher only)
// -----------------------------------------------------------------------
describe('GET /api/users', () => {
  it('admin gets array of all users, sensitive fields excluded', async () => {
    asAdmin();
    await seedUser({ id: 'u1', adSoyad: 'Ali Veli', rol: 'student' });
    await seedUser({ id: 'u2', adSoyad: 'Ayse Yilmaz', rol: 'teacher' });

    const res = await request(app).get('/api/users').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    // sensitive fields must be stripped
    res.body.forEach((u: Record<string, unknown>) => {
      expect(u).not.toHaveProperty('sifre');
      expect(u).not.toHaveProperty('tckn');
    });
  });

  it('teacher can list users', async () => {
    asTeacher();
    await seedUser();
    const res = await request(app).get('/api/users').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('filters by ?role= query param', async () => {
    asAdmin();
    await seedUser({ id: 's1', rol: 'student' });
    await seedUser({ id: 't1', rol: 'teacher' });

    const res = await request(app).get('/api/users?role=teacher').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].rol).toBe('teacher');
  });

  it('returns empty array when no users exist', async () => {
    asAdmin();
    const res = await request(app).get('/api/users').expect(200);
    expect(res.body).toEqual([]);
  });
});

// -----------------------------------------------------------------------
// GET /api/users/role/:role (paginated list by role)
// -----------------------------------------------------------------------
describe('GET /api/users/role/:role', () => {
  it('returns paginated shape with data and pagination', async () => {
    asAdmin();
    await seedUser({ id: 's1', rol: 'student' });
    await seedUser({ id: 's2', rol: 'student' });

    const res = await request(app).get('/api/users/role/student').expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination).toMatchObject({
      page: 1,
      limit: expect.any(Number),
      total: 2,
      totalPages: 1,
    });
  });

  it('teacher can access role list', async () => {
    asTeacher();
    await seedUser({ id: 'p1', rol: 'parent' });
    const res = await request(app).get('/api/users/role/parent').expect(200);
    expect(res.body).toHaveProperty('data');
  });

  it('supports ?search= to filter by name', async () => {
    asAdmin();
    await seedUser({ id: 's1', adSoyad: 'Ahmet Kaya', rol: 'student' });
    await seedUser({ id: 's2', adSoyad: 'Zeynep Demir', rol: 'student' });

    const res = await request(app).get('/api/users/role/student?search=Ahmet').expect(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].adSoyad).toBe('Ahmet Kaya');
  });

  it('returns 400 when search term exceeds 100 chars', async () => {
    asAdmin();
    const longSearch = 'a'.repeat(101);
    const res = await request(app).get(`/api/users/role/student?search=${longSearch}`).expect(400);
    expect(res.body).toHaveProperty('error');
  });

  it('excludes sensitive fields from results', async () => {
    asAdmin();
    await seedUser({ id: 's1', rol: 'student' });
    const res = await request(app).get('/api/users/role/student').expect(200);
    res.body.data.forEach((u: Record<string, unknown>) => {
      expect(u).not.toHaveProperty('sifre');
      expect(u).not.toHaveProperty('tckn');
    });
  });
});

// -----------------------------------------------------------------------
// GET /api/users/me
// -----------------------------------------------------------------------
describe('GET /api/users/me', () => {
  it('returns current user profile', async () => {
    asStudent('student1');
    await seedUser({ id: 'student1', adSoyad: 'Ben', rol: 'student' });

    const res = await request(app).get('/api/users/me').expect(200);
    expect(res.body.id).toBe('student1');
    expect(res.body).not.toHaveProperty('sifre');
    expect(res.body).not.toHaveProperty('tckn');
  });

  it('returns 404 when authenticated user does not exist in DB', async () => {
    asStudent('nonexistent-user');
    const res = await request(app).get('/api/users/me').expect(404);
    expect(res.body).toHaveProperty('error');
  });
});

// -----------------------------------------------------------------------
// GET /api/users/:userId (get by ID)
// -----------------------------------------------------------------------
describe('GET /api/users/:userId', () => {
  it('admin can get any user by ID', async () => {
    asAdmin();
    await seedUser({ id: 'target1', adSoyad: 'Hedef Kullanici', rol: 'student' });

    const res = await request(app).get('/api/users/target1').expect(200);
    expect(res.body.id).toBe('target1');
    expect(res.body).not.toHaveProperty('sifre');
    expect(res.body).not.toHaveProperty('tckn');
  });

  it('teacher can view any user', async () => {
    asTeacher();
    await seedUser({ id: 'target2', rol: 'student' });

    const res = await request(app).get('/api/users/target2').expect(200);
    expect(res.body.id).toBe('target2');
  });

  it('student can view own profile', async () => {
    asStudent('student1');
    await seedUser({ id: 'student1', rol: 'student' });

    const res = await request(app).get('/api/users/student1').expect(200);
    expect(res.body.id).toBe('student1');
  });

  it('student cannot view another user — 403', async () => {
    asStudent('student1');
    await seedUser({ id: 'student2', rol: 'student' });

    const res = await request(app).get('/api/users/student2').expect(403);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 404 for non-existent userId', async () => {
    asAdmin();
    const res = await request(app).get('/api/users/nobody').expect(404);
    expect(res.body).toHaveProperty('error');
  });
});

// -----------------------------------------------------------------------
// POST /api/users (create user — admin only)
// -----------------------------------------------------------------------
describe('POST /api/users', () => {
  it('admin creates user — returns 201 with id field', async () => {
    asAdmin();
    const res = await request(app)
      .post('/api/users')
      .send({ id: 'new1', adSoyad: 'Yeni Kullanici', sifre: 'pass123', rol: 'student' })
      .expect(201);

    expect(res.body).toHaveProperty('id', 'new1');
  });

  it('returns 400 when required fields missing', async () => {
    asAdmin();
    const res = await request(app).post('/api/users').send({ adSoyad: 'Eksik' }).expect(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 on duplicate user id', async () => {
    asAdmin();
    await seedUser({ id: 'dup1', rol: 'student' });

    const res = await request(app)
      .post('/api/users')
      .send({ id: 'dup1', adSoyad: 'Kopya', sifre: 'pw', rol: 'student' })
      .expect(400);
    expect(res.body.error.toLowerCase()).toContain('exist');
  });

  it('does not expose the password hash or TCKN in the create response', async () => {
    asAdmin();
    const res = await request(app)
      .post('/api/users')
      .send({ id: 'hash1', adSoyad: 'Hash Test', sifre: 'plaintext', rol: 'student' })
      .expect(201);

    expect(res.body).toHaveProperty('id', 'hash1');
    expect(res.body).not.toHaveProperty('sifre');
    expect(res.body).not.toHaveProperty('tckn');
  });

  it('creating a student auto-creates a shared V<id> parent account', async () => {
    asAdmin();
    const res = await request(app)
      .post('/api/users')
      .send({ id: '500', adSoyad: 'Ogrenci Bes Yuz', sifre: 'pw', rol: 'student' })
      .expect(201);

    expect(res.body.parentAccount).toMatchObject({ id: 'V500' });
    expect(typeof res.body.parentAccount.generatedPassword).toBe('string');

    const parent = await User.findOne({ id: 'V500' });
    expect(parent).not.toBeNull();
    expect(parent?.rol).toBe('parent');
    expect(parent?.childId).toContain('500');
    expect(parent?.isActive).toBe(true);
  });

  it('rejects direct creation of a personal parent account', async () => {
    asAdmin();
    const res = await request(app)
      .post('/api/users')
      .send({ id: 'directparent1', adSoyad: 'Deneme', sifre: 'pw', rol: 'parent' })
      .expect(400);
    expect(res.body).toHaveProperty('error');

    const found = await User.findOne({ id: 'directparent1' });
    expect(found).toBeNull();
  });
});

// -----------------------------------------------------------------------
// POST /api/users/create (legacy create — admin only)
// -----------------------------------------------------------------------
describe('POST /api/users/create', () => {
  it('admin creates user via legacy endpoint — returns 201 with success:true', async () => {
    asAdmin();
    const res = await request(app)
      .post('/api/users/create')
      .send({ id: 'leg1', adSoyad: 'Legacy User', sifre: 'pw', rol: 'teacher' })
      .expect(201);

    expect(res.body).toHaveProperty('success', true);
  });

  it('returns 400 when required fields missing (no adSoyad)', async () => {
    asAdmin();
    const res = await request(app)
      .post('/api/users/create')
      .send({ id: 'leg2', rol: 'student' })
      .expect(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when sifre is missing', async () => {
    asAdmin();
    const res = await request(app)
      .post('/api/users/create')
      .send({ id: 'leg3', adSoyad: 'No Pass', rol: 'student' })
      .expect(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 on duplicate id', async () => {
    asAdmin();
    await seedUser({ id: 'dup2', rol: 'student' });

    const res = await request(app)
      .post('/api/users/create')
      .send({ id: 'dup2', adSoyad: 'Kopya', sifre: 'pw', rol: 'student' })
      .expect(400);
    expect(res.body).toHaveProperty('error');
  });

  it('creating a student via legacy endpoint auto-creates a V<id> parent account', async () => {
    asAdmin();
    const res = await request(app)
      .post('/api/users/create')
      .send({ id: '501', adSoyad: 'Ogrenci Bes Yuz Bir', sifre: 'pw', rol: 'student' })
      .expect(201);

    expect(res.body.parentAccount).toMatchObject({ id: 'V501' });
    expect(typeof res.body.parentAccount.generatedPassword).toBe('string');

    const parent = await User.findOne({ id: 'V501' });
    expect(parent).not.toBeNull();
    expect(parent?.rol).toBe('parent');
  });

  it('rejects direct creation of a personal parent account via legacy endpoint', async () => {
    asAdmin();
    const res = await request(app)
      .post('/api/users/create')
      .send({ id: 'directparent2', adSoyad: 'Deneme', sifre: 'pw', rol: 'parent' })
      .expect(400);
    expect(res.body).toHaveProperty('error');
  });
});

// -----------------------------------------------------------------------
// PUT /api/users/:userId (update)
// -----------------------------------------------------------------------
describe('PUT /api/users/:userId', () => {
  it('admin can update any user — returns updated user', async () => {
    asAdmin();
    await seedUser({ id: 'upd1', adSoyad: 'Eski Ad', rol: 'student' });

    const res = await request(app).put('/api/users/upd1').send({ adSoyad: 'Yeni Ad' }).expect(200);

    expect(res.body.adSoyad).toBe('Yeni Ad');
    expect(res.body).not.toHaveProperty('sifre');
    expect(res.body).not.toHaveProperty('tckn');
  });

  it('user can update own profile', async () => {
    asStudent('self1');
    await seedUser({ id: 'self1', adSoyad: 'Kendim', rol: 'student' });

    const res = await request(app)
      .put('/api/users/self1')
      .send({ adSoyad: 'Guncel Kendim' })
      .expect(200);

    expect(res.body.adSoyad).toBe('Guncel Kendim');
  });

  it('non-admin cannot update another user — 403', async () => {
    asStudent('student1');
    await seedUser({ id: 'other1', rol: 'student' });

    const res = await request(app)
      .put('/api/users/other1')
      .send({ adSoyad: 'Hacklendi' })
      .expect(403);
    expect(res.body).toHaveProperty('error');
  });

  it('non-admin cannot escalate own role via PUT', async () => {
    asStudent('self2');
    await seedUser({ id: 'self2', adSoyad: 'Normal', rol: 'student' });

    // rol field is stripped for non-admins, update still succeeds
    const res = await request(app)
      .put('/api/users/self2')
      .send({ adSoyad: 'Updated', rol: 'admin' })
      .expect(200);

    // rol should remain student (stripped by route)
    expect(res.body.rol).toBe('student');
  });

  it('returns 404 for non-existent userId', async () => {
    asAdmin();
    const res = await request(app).put('/api/users/nobody').send({ adSoyad: 'Ghost' }).expect(404);
    expect(res.body).toHaveProperty('error');
  });

  it('deactivating a student mirrors isActive onto its V<id> parent account', async () => {
    asAdmin();
    await seedUser({ id: 'deact1', adSoyad: 'Deaktif Ogrenci', rol: 'student', isActive: true });
    await seedUser({
      id: 'Vdeact1',
      adSoyad: 'Deaktif Ogrenci Velisi',
      rol: 'parent',
      childId: ['deact1'],
      isActive: true,
    });

    await request(app).put('/api/users/deact1').send({ isActive: false }).expect(200);

    const parent = await User.findOne({ id: 'Vdeact1' });
    expect(parent?.isActive).toBe(false);
  });
});

// -----------------------------------------------------------------------
// PUT /api/users/:userId/update (legacy update endpoint)
// -----------------------------------------------------------------------
describe('PUT /api/users/:userId/update', () => {
  it('admin can update via legacy endpoint — returns {success:true, user}', async () => {
    asAdmin();
    await seedUser({ id: 'lupd1', adSoyad: 'Eski', rol: 'student' });

    const res = await request(app)
      .put('/api/users/lupd1/update')
      .send({ adSoyad: 'Yeni' })
      .expect(200);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.adSoyad).toBe('Yeni');
  });

  it('non-admin cannot update another user via legacy endpoint — 403', async () => {
    asStudent('student1');
    await seedUser({ id: 'other2', rol: 'student' });

    const res = await request(app)
      .put('/api/users/other2/update')
      .send({ adSoyad: 'Ele Gecirdi' })
      .expect(403);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 404 for non-existent userId on legacy update', async () => {
    asAdmin();
    const res = await request(app)
      .put('/api/users/nobody/update')
      .send({ adSoyad: 'Ghost' })
      .expect(404);
    expect(res.body).toHaveProperty('error');
  });
});

// -----------------------------------------------------------------------
// DELETE /api/users/:userId
// -----------------------------------------------------------------------
describe('DELETE /api/users/:userId', () => {
  it('admin can delete user — returns 204', async () => {
    asAdmin();
    await seedUser({ id: 'del1', rol: 'student' });

    await request(app).delete('/api/users/del1').expect(204);

    const gone = await User.findOne({ id: 'del1' });
    expect(gone).toBeNull();
  });

  it('deleting non-existent user still returns 204 (no error)', async () => {
    asAdmin();
    // Route calls deleteOne and doesn't check result — always 204
    await request(app).delete('/api/users/nobody').expect(204);
  });

  it('deleting a student cascades to its V<id> parent account', async () => {
    asAdmin();
    await seedUser({ id: 'del2', rol: 'student' });
    await seedUser({ id: 'Vdel2', rol: 'parent', childId: ['del2'] });

    await request(app).delete('/api/users/del2').expect(204);

    expect(await User.findOne({ id: 'del2' })).toBeNull();
    expect(await User.findOne({ id: 'Vdel2' })).toBeNull();
  });

  it('deleting a non-student does not touch unrelated V<id> accounts', async () => {
    asAdmin();
    await seedUser({ id: 'teacherX', rol: 'teacher' });
    await seedUser({ id: 'VteacherX', rol: 'parent', childId: ['someone-else'] });

    await request(app).delete('/api/users/teacherX').expect(204);

    expect(await User.findOne({ id: 'VteacherX' })).not.toBeNull();
  });
});

// -----------------------------------------------------------------------
// GET /api/users/parent/:parentId/children
// -----------------------------------------------------------------------
describe('GET /api/users/parent/:parentId/children', () => {
  it('admin can get children list for any parent', async () => {
    asAdmin();
    await seedUser({ id: 'par10', adSoyad: 'Veli On', rol: 'parent', childId: ['chi10'] });
    await seedUser({ id: 'chi10', adSoyad: 'Cocuk On', rol: 'student' });

    const res = await request(app).get('/api/users/parent/par10/children').expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe('chi10');
    // password must be excluded
    expect(res.body[0]).not.toHaveProperty('sifre');
  });

  it('parent can get own children', async () => {
    asParent('par11');
    await seedUser({ id: 'par11', adSoyad: 'Veli Onbir', rol: 'parent', childId: ['chi11'] });
    await seedUser({ id: 'chi11', adSoyad: 'Cocuk Onbir', rol: 'student' });

    const res = await request(app).get('/api/users/parent/par11/children').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("parent cannot get another parent's children — 403", async () => {
    asParent('par12');
    await seedUser({ id: 'par13', adSoyad: 'Baska', rol: 'parent' });

    const res = await request(app).get('/api/users/parent/par13/children').expect(403);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 404 when parent user does not exist', async () => {
    asAdmin();
    const res = await request(app).get('/api/users/parent/ghost-par/children').expect(404);
    expect(res.body).toHaveProperty('error');
  });

  it('teacher can get children for any parent', async () => {
    asTeacher();
    await seedUser({ id: 'par14', adSoyad: 'Veli', rol: 'parent', childId: [] });

    const res = await request(app).get('/api/users/parent/par14/children').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// -----------------------------------------------------------------------
// Route alias: /api/user (singular mount) mirrors /api/users
// -----------------------------------------------------------------------
describe('/api/user alias mirrors /api/users', () => {
  it('GET /api/user returns same list as /api/users', async () => {
    asAdmin();
    await seedUser({ id: 'alias1', rol: 'student' });

    const [r1, r2] = await Promise.all([
      request(app).get('/api/user').expect(200),
      request(app).get('/api/users').expect(200),
    ]);

    expect(Array.isArray(r1.body)).toBe(true);
    expect(Array.isArray(r2.body)).toBe(true);
    expect(r1.body.length).toBe(r2.body.length);
  });

  it('POST /api/user creates user (same as /api/users)', async () => {
    asAdmin();
    const res = await request(app)
      .post('/api/user')
      .send({ id: 'alias2', adSoyad: 'Alias Kullanici', sifre: 'pw', rol: 'student' })
      .expect(201);

    expect(res.body).toHaveProperty('id', 'alias2');
  });
});
