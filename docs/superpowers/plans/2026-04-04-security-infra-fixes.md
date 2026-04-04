# Security & Infrastructure Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix security vulnerabilities, add missing rate limiting/indexes, implement account unlock, harden frontend error handling, activate observability, and add email alerting — in 3 progressive phases.

**Architecture:** 3-phase rollout. Phase 1 fixes active security vulnerabilities (IDOR, validation, CORS). Phase 2 improves data integrity and performance (rate limiting with Redis, DB indexes, account unlock, frontend errors). Phase 3 adds observability and alerting (request timing, email alerts, Sentry hardening).

**Tech Stack:** Express 4, Mongoose, express-rate-limit + rate-limit-redis (already installed), isomorphic-dompurify, Nodemailer, Sentry, Vitest + supertest for testing.

**Key discoveries during planning:**

- `rate-limit-redis` v4.3.1 is already in `server/package.json` — no install needed
- User model already has `failedLoginAttempts` and `lockUntil` fields; authService already locks after 5 failures for 15 min. Only the unlock endpoint is needed.
- GraphQL has 3 mutations (login, createAnnouncement, createEvciRequest), not 18. The schema defines types but most CRUD goes through REST.

---

## File Map

### Phase 1 — Security-Critical

| Action | File                                                  | Responsibility                          |
| ------ | ----------------------------------------------------- | --------------------------------------- |
| Modify | `server/src/routes/Notification.ts`                   | Add ownership checks to PATCH endpoints |
| Create | `server/src/graphql/utils/validateInput.ts`           | GraphQL input sanitization utility      |
| Modify | `server/src/graphql/resolvers/index.ts`               | Apply validation to mutations           |
| Modify | `server/src/routes/MealList.ts`                       | Fix role string                         |
| Modify | `server/src/routes/User.ts`                           | Add auth to parent-children endpoint    |
| Modify | `server/src/config/cors.ts`                           | Restrict localhost to dev only          |
| Create | `server/src/test/unit/notification-ownership.test.ts` | Unit tests for notification ownership   |
| Create | `server/src/test/unit/graphql-validation.test.ts`     | Unit tests for GraphQL input validation |
| Create | `server/src/test/unit/cors.test.ts`                   | Unit tests for CORS config              |

### Phase 2 — Data Integrity & Performance

| Action | File                                                   | Responsibility                       |
| ------ | ------------------------------------------------------ | ------------------------------------ |
| Modify | `server/src/config/rateLimiters.ts`                    | Add Redis store factory              |
| Modify | `server/src/routes/Dilekce.ts`                         | Apply upload rate limiter            |
| Modify | `server/src/routes/Communication.ts`                   | Apply message + upload rate limiters |
| Modify | `server/src/routes/Kvkk.ts`                            | Apply data export rate limiter       |
| Create | `server/src/migrations/002-add-missing-indexes.ts`     | Add indexes to 6 collections         |
| Modify | `server/src/modules/auth/routes/authRoutes.ts`         | Add unlock-account endpoint          |
| Modify | `server/src/modules/auth/services/authService.ts`      | Add unlockAccount method             |
| Modify | `server/src/modules/auth/validators/authValidators.ts` | Add unlock validator                 |
| Modify | `client/src/main.tsx`                                  | Add global error listeners           |
| Create | `server/src/test/unit/redis-rate-limiter.test.ts`      | Test Redis store factory             |
| Create | `server/src/test/unit/account-unlock.test.ts`          | Test unlock logic                    |

### Phase 3 — Observability & Alerting

| Action | File                                          | Responsibility                    |
| ------ | --------------------------------------------- | --------------------------------- |
| Modify | `server/src/index.ts`                         | Register requestTiming middleware |
| Create | `server/src/services/AlertEmailService.ts`    | Email alert dispatcher            |
| Modify | `server/src/services/SecurityAlertService.ts` | Wire email alerts into triggers   |
| Modify | `server/src/config/environment.ts`            | Add ALERT*EMAIL*\* env vars       |
| Modify | `client/src/utils/monitoring.ts`              | Add Sentry beforeSend filter      |
| Modify | `client/src/App.tsx`                          | Wrap with Sentry profiler         |
| Create | `server/src/test/unit/alert-email.test.ts`    | Test AlertEmailService            |
| Create | `server/src/test/unit/sentry-filter.test.ts`  | Test Sentry beforeSend            |

---

## Phase 1: Security-Critical

### Task 1: Fix Notification IDOR — Ownership Checks

**Files:**

- Modify: `server/src/routes/Notification.ts:71-119`
- Create: `server/src/test/unit/notification-ownership.test.ts`

- [ ] **Step 1: Write failing test for single notification ownership**

Create `server/src/test/unit/notification-ownership.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../index';
import mongoose from 'mongoose';

// Mock auth middleware to inject user
vi.mock('../../middleware/auth', async () => {
  const actual = await vi.importActual('../../middleware/auth');
  return {
    ...(actual as any),
    requireAuth: vi.fn((req: any, _res: any, next: any) => {
      req.user = req.headers['x-test-user']
        ? JSON.parse(req.headers['x-test-user'] as string)
        : { userId: 'user-1', role: 'student' };
      next();
    }),
  };
});

// Mock NotificationService
vi.mock('../../services/NotificationService', () => ({
  default: {
    markAsRead: vi.fn(),
    markMultipleAsRead: vi.fn(),
    archiveNotification: vi.fn(),
  },
}));

// Mock the Notification model
vi.mock('../../models/Notification', () => {
  const mockFindById = vi.fn();
  const mockFind = vi.fn();
  return {
    default: {
      findById: mockFindById,
      find: mockFind,
    },
    Notification: {
      findById: mockFindById,
      find: mockFind,
    },
  };
});

import NotificationService from '../../services/NotificationService';
import { Notification } from '../../models/Notification';

describe('Notification Ownership Checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PATCH /:id/read', () => {
    it('should reject if notification belongs to another user', async () => {
      (Notification.findById as any).mockResolvedValue({
        _id: 'notif-1',
        userId: 'user-2', // different user
      });

      const res = await request(app)
        .patch('/api/notifications/notif-1/read')
        .set('x-test-user', JSON.stringify({ userId: 'user-1', role: 'student' }));

      expect(res.status).toBe(403);
      expect(NotificationService.markAsRead).not.toHaveBeenCalled();
    });

    it('should allow if notification belongs to requesting user', async () => {
      (Notification.findById as any).mockResolvedValue({
        _id: 'notif-1',
        userId: 'user-1',
      });
      (NotificationService.markAsRead as any).mockResolvedValue({
        _id: 'notif-1',
        userId: 'user-1',
        read: true,
      });

      const res = await request(app)
        .patch('/api/notifications/notif-1/read')
        .set('x-test-user', JSON.stringify({ userId: 'user-1', role: 'student' }));

      expect(res.status).toBe(200);
      expect(NotificationService.markAsRead).toHaveBeenCalledWith('notif-1');
    });

    it('should allow admin to mark any notification as read', async () => {
      (Notification.findById as any).mockResolvedValue({
        _id: 'notif-1',
        userId: 'user-2',
      });
      (NotificationService.markAsRead as any).mockResolvedValue({
        _id: 'notif-1',
        userId: 'user-2',
        read: true,
      });

      const res = await request(app)
        .patch('/api/notifications/notif-1/read')
        .set('x-test-user', JSON.stringify({ userId: 'admin-1', role: 'admin' }));

      expect(res.status).toBe(200);
    });
  });

  describe('PATCH /bulk-read', () => {
    it('should only mark notifications owned by requesting user', async () => {
      (Notification.find as any).mockReturnValue({
        select: vi.fn().mockResolvedValue([
          { _id: 'notif-1', userId: 'user-1' },
          { _id: 'notif-2', userId: 'user-2' }, // different user — filtered out
          { _id: 'notif-3', userId: 'user-1' },
        ]),
      });
      (NotificationService.markMultipleAsRead as any).mockResolvedValue(undefined);

      const res = await request(app)
        .patch('/api/notifications/bulk-read')
        .send({ notificationIds: ['notif-1', 'notif-2', 'notif-3'] })
        .set('x-test-user', JSON.stringify({ userId: 'user-1', role: 'student' }));

      expect(res.status).toBe(200);
      // Should only pass the owned notification IDs
      expect(NotificationService.markMultipleAsRead).toHaveBeenCalledWith(['notif-1', 'notif-3']);
    });
  });

  describe('PATCH /:id/archive', () => {
    it('should reject if notification belongs to another user', async () => {
      (Notification.findById as any).mockResolvedValue({
        _id: 'notif-1',
        userId: 'user-2',
      });

      const res = await request(app)
        .patch('/api/notifications/notif-1/archive')
        .set('x-test-user', JSON.stringify({ userId: 'user-1', role: 'student' }));

      expect(res.status).toBe(403);
      expect(NotificationService.archiveNotification).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/test/unit/notification-ownership.test.ts`
Expected: FAIL — the current routes don't check ownership, so the 403 tests will get 200 instead.

- [ ] **Step 3: Implement ownership checks in Notification routes**

Edit `server/src/routes/Notification.ts`. Replace the three PATCH handlers (lines 71-119):

Replace the `PATCH /:id/read` handler (lines 71-85) with:

```typescript
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const authUser = (req as any).user;

    const notification = await Notification.findById(id).select('userId');
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Bildirim bulunamadı' });
    }
    if (authUser.role !== 'admin' && notification.userId !== authUser.userId) {
      return res.status(403).json({ success: false, error: 'Bu bildirime erişim yetkiniz yok' });
    }

    const updated = await NotificationService.markAsRead(id);
    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error marking notification as read', {
      error: (error as Error).message,
      id: req.params.id,
    });
    res.status(500).json({ success: false, error: 'Bildirim okundu olarak işaretlenemedi' });
  }
});
```

Replace the `PATCH /bulk-read` handler (lines 88-102) with:

```typescript
router.patch('/bulk-read', async (req, res) => {
  try {
    const { notificationIds } = req.body;
    const authUser = (req as any).user;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return res.status(400).json({ success: false, error: "Geçerli bildirim ID'leri gerekli" });
    }

    let idsToMark = notificationIds;
    if (authUser.role !== 'admin') {
      const owned = await Notification.find({
        _id: { $in: notificationIds },
        userId: authUser.userId,
      }).select('_id');
      idsToMark = owned.map((n: any) => n._id.toString());
    }

    if (idsToMark.length > 0) {
      await NotificationService.markMultipleAsRead(idsToMark);
    }
    res.json({ success: true, message: `${idsToMark.length} bildirim okundu olarak işaretlendi` });
  } catch (error) {
    logger.error('Error marking multiple notifications as read', {
      error: (error as Error).message,
    });
    res.status(500).json({ success: false, error: 'Bildirimler okundu olarak işaretlenemedi' });
  }
});
```

Replace the `PATCH /:id/archive` handler (lines 105-119) with:

```typescript
router.patch('/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;
    const authUser = (req as any).user;

    const notification = await Notification.findById(id).select('userId');
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Bildirim bulunamadı' });
    }
    if (authUser.role !== 'admin' && notification.userId !== authUser.userId) {
      return res.status(403).json({ success: false, error: 'Bu bildirime erişim yetkiniz yok' });
    }

    const updated = await NotificationService.archiveNotification(id);
    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error archiving notification', {
      error: (error as Error).message,
      id: req.params.id,
    });
    res.status(500).json({ success: false, error: 'Bildirim arşivlenemedi' });
  }
});
```

Also add the Notification model import at the top of the file if not already present:

```typescript
import Notification from '../models/Notification';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npx vitest run src/test/unit/notification-ownership.test.ts`
Expected: All 5 tests PASS.

- [ ] **Step 5: Also remove the duplicate bulk-read handler**

The file has a duplicate `PATCH /bulk-read` handler at lines 360-375. Delete that duplicate block entirely since the first one now has proper ownership checks.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/Notification.ts server/src/test/unit/notification-ownership.test.ts
git commit -m "fix: add ownership checks to notification PATCH endpoints"
```

---

### Task 2: GraphQL Input Validation

**Files:**

- Create: `server/src/graphql/utils/validateInput.ts`
- Modify: `server/src/graphql/resolvers/index.ts`
- Create: `server/src/test/unit/graphql-validation.test.ts`

- [ ] **Step 1: Write failing test for GraphQL input validation**

Create `server/src/test/unit/graphql-validation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  sanitizeGraphQLInput,
  validateAnnouncementInput,
  validateEvciRequestInput,
} from '../../graphql/utils/validateInput';

describe('sanitizeGraphQLInput', () => {
  it('should strip HTML tags from string fields', () => {
    const input = { title: '<script>alert("xss")</script>Hello', content: '<b>Bold</b>' };
    const result = sanitizeGraphQLInput(input);
    expect(result.title).toBe('Hello');
    expect(result.content).toBe('Bold');
  });

  it('should strip MongoDB operators from keys', () => {
    const input = { $gt: 1, name: 'safe', nested: { $where: 'malicious' } };
    const result = sanitizeGraphQLInput(input);
    expect(result).not.toHaveProperty('$gt');
    expect(result.name).toBe('safe');
    expect(result.nested).not.toHaveProperty('$where');
  });

  it('should handle nested objects', () => {
    const input = { outer: { inner: '<img onerror=alert(1) src=x>text' } };
    const result = sanitizeGraphQLInput(input);
    expect(result.outer.inner).toBe('text');
  });

  it('should handle arrays', () => {
    const input = { tags: ['<script>bad</script>safe', 'clean'] };
    const result = sanitizeGraphQLInput(input);
    expect(result.tags).toEqual(['safe', 'clean']);
  });

  it('should preserve non-string primitives', () => {
    const input = { count: 5, active: true, date: null };
    const result = sanitizeGraphQLInput(input);
    expect(result).toEqual({ count: 5, active: true, date: null });
  });
});

describe('validateAnnouncementInput', () => {
  it('should throw on missing title', () => {
    expect(() => validateAnnouncementInput({ content: 'body' })).toThrow('title');
  });

  it('should throw on title exceeding 200 chars', () => {
    expect(() => validateAnnouncementInput({ title: 'a'.repeat(201), content: 'body' })).toThrow(
      'title',
    );
  });

  it('should pass on valid input', () => {
    expect(() => validateAnnouncementInput({ title: 'Test', content: 'Body text' })).not.toThrow();
  });
});

describe('validateEvciRequestInput', () => {
  it('should throw on missing startDate', () => {
    expect(() => validateEvciRequestInput({ endDate: '2026-04-10', destination: 'Home' })).toThrow(
      'startDate',
    );
  });

  it('should throw on missing destination', () => {
    expect(() =>
      validateEvciRequestInput({ startDate: '2026-04-05', endDate: '2026-04-10' }),
    ).toThrow('destination');
  });

  it('should pass on valid input', () => {
    expect(() =>
      validateEvciRequestInput({
        startDate: '2026-04-05',
        endDate: '2026-04-10',
        destination: 'Ev',
        willGo: 'Otobüs',
      }),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/test/unit/graphql-validation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the validation utility**

Create `server/src/graphql/utils/validateInput.ts`:

```typescript
import DOMPurify from 'isomorphic-dompurify';
import { GraphQLError } from 'graphql';

/**
 * Recursively sanitize all string values in a GraphQL input object.
 * Strips HTML tags and MongoDB operators (keys starting with $).
 */
export function sanitizeGraphQLInput<T extends Record<string, any>>(input: T): T {
  if (input === null || input === undefined) return input;

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(input)) {
    if (key.startsWith('$')) continue; // strip MongoDB operators

    if (typeof value === 'string') {
      sanitized[key] = DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string'
          ? DOMPurify.sanitize(item, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
          : typeof item === 'object' && item !== null
            ? sanitizeGraphQLInput(item)
            : item,
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeGraphQLInput(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

function requireField(input: Record<string, any>, field: string, maxLength?: number): void {
  if (!input[field] && input[field] !== 0 && input[field] !== false) {
    throw new GraphQLError(`${field} alanı zorunludur`, {
      extensions: { code: 'BAD_USER_INPUT', field },
    });
  }
  if (maxLength && typeof input[field] === 'string' && input[field].length > maxLength) {
    throw new GraphQLError(`${field} alanı en fazla ${maxLength} karakter olabilir`, {
      extensions: { code: 'BAD_USER_INPUT', field },
    });
  }
}

export function validateAnnouncementInput(input: Record<string, any>): void {
  requireField(input, 'title', 200);
  requireField(input, 'content', 5000);
}

export function validateEvciRequestInput(input: Record<string, any>): void {
  requireField(input, 'startDate');
  requireField(input, 'endDate');
  requireField(input, 'destination', 200);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npx vitest run src/test/unit/graphql-validation.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Apply validation to GraphQL resolvers**

Edit `server/src/graphql/resolvers/index.ts`. Add import at top:

```typescript
import {
  sanitizeGraphQLInput,
  validateAnnouncementInput,
  validateEvciRequestInput,
} from '../utils/validateInput';
```

Modify `createAnnouncement` mutation to validate and sanitize:

```typescript
createAnnouncement: async (_parent, { input }, context: GraphQLContext) => {
  if (!context.user) throw new Error('Not authenticated');
  const sanitized = sanitizeGraphQLInput(input);
  validateAnnouncementInput(sanitized);

  const announcement = new Announcement({
    ...sanitized,
    createdBy: context.user._id,
  });
  return announcement.save();
},
```

Modify `createEvciRequest` mutation:

```typescript
createEvciRequest: async (_parent, { input }, context: GraphQLContext) => {
  if (!context.user) throw new Error('Not authenticated');
  const sanitized = sanitizeGraphQLInput(input);
  validateEvciRequestInput(sanitized);

  const request = new EvciRequest({
    ...sanitized,
    studentId: context.user._id,
    status: 'pending',
  });
  return request.save();
},
```

The `login` mutation takes scalar args (`id`, `sifre`) not an input object, and passes them to `SecureAPI.login()` which handles its own validation — no change needed.

- [ ] **Step 6: Commit**

```bash
git add server/src/graphql/utils/validateInput.ts server/src/graphql/resolvers/index.ts server/src/test/unit/graphql-validation.test.ts
git commit -m "fix: add input validation and sanitization to GraphQL mutations"
```

---

### Task 3: Fix MealList Role Mismatch

**Files:**

- Modify: `server/src/routes/MealList.ts:45,57`

- [ ] **Step 1: Fix the role string**

Edit `server/src/routes/MealList.ts`.

Replace on line 45:

```typescript
router.post("/", authenticateJWT, authorizeRoles(['admin', 'kitchen_staff']), validateMealList, async (req, res) => {
```

with:

```typescript
router.post("/", authenticateJWT, authorizeRoles(['admin', 'hizmetli']), validateMealList, async (req, res) => {
```

Replace on line 57:

```typescript
router.put("/:id", authenticateJWT, authorizeRoles(['admin', 'kitchen_staff']), validateMealList, async (req, res) => {
```

with:

```typescript
router.put("/:id", authenticateJWT, authorizeRoles(['admin', 'hizmetli']), validateMealList, async (req, res) => {
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/MealList.ts
git commit -m "fix: correct role name kitchen_staff to hizmetli in MealList routes"
```

---

### Task 4: Add Auth to Parent-Children Endpoint

**Files:**

- Modify: `server/src/routes/User.ts:272-281`

- [ ] **Step 1: Write failing test**

Create `server/src/test/unit/parent-children-auth.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../index';

vi.mock('../../middleware/auth', async () => {
  const actual = await vi.importActual('../../middleware/auth');
  return {
    ...(actual as any),
    authenticateJWT: vi.fn((req: any, _res: any, next: any) => {
      req.user = req.headers['x-test-user']
        ? JSON.parse(req.headers['x-test-user'] as string)
        : { userId: 'student-1', role: 'student' };
      next();
    }),
    authorizeRoles: (actual as any).authorizeRoles,
  };
});

vi.mock('../../models/User', () => ({
  default: {
    findOne: vi.fn(),
    find: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue([]) }),
  },
}));

import User from '../../models/User';

describe('GET /parent/:parentId/children', () => {
  it('should reject student accessing another parent children', async () => {
    const res = await request(app)
      .get('/api/users/parent/parent-1/children')
      .set('x-test-user', JSON.stringify({ userId: 'student-1', role: 'student' }));

    expect(res.status).toBe(403);
  });

  it('should allow parent to access own children', async () => {
    (User.findOne as any).mockResolvedValue({ id: 'parent-1', childId: ['child-1'] });

    const res = await request(app)
      .get('/api/users/parent/parent-1/children')
      .set('x-test-user', JSON.stringify({ userId: 'parent-1', role: 'parent' }));

    expect(res.status).not.toBe(403);
  });

  it('should allow admin to access any parent children', async () => {
    (User.findOne as any).mockResolvedValue({ id: 'parent-1', childId: ['child-1'] });

    const res = await request(app)
      .get('/api/users/parent/parent-1/children')
      .set('x-test-user', JSON.stringify({ userId: 'admin-1', role: 'admin' }));

    expect(res.status).not.toBe(403);
  });

  it('should allow teacher to access any parent children', async () => {
    (User.findOne as any).mockResolvedValue({ id: 'parent-1', childId: ['child-1'] });

    const res = await request(app)
      .get('/api/users/parent/parent-1/children')
      .set('x-test-user', JSON.stringify({ userId: 'teacher-1', role: 'teacher' }));

    expect(res.status).not.toBe(403);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/test/unit/parent-children-auth.test.ts`
Expected: FAIL — student access returns 200 instead of 403.

- [ ] **Step 3: Add authorization check**

Edit `server/src/routes/User.ts`. Replace lines 272-281:

```typescript
router.get('/parent/:parentId/children', authenticateJWT, async (req, res) => {
  const { parentId } = req.params;
  const parent = await User.findOne({ id: parentId });
  if (!parent) {
    res.status(404).json({ error: 'Parent not found' });
    return;
  }
  const children = await User.find({ id: { $in: parent.childId || [] } }).select('-sifre');
  res.json(children);
});
```

with:

```typescript
router.get('/parent/:parentId/children', authenticateJWT, async (req, res) => {
  const { parentId } = req.params;
  const authUser = (req as any).user;

  const allowedRoles = ['admin', 'teacher'];
  if (!allowedRoles.includes(authUser.role) && authUser.userId !== parentId) {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
  }

  const parent = await User.findOne({ id: parentId });
  if (!parent) {
    res.status(404).json({ error: 'Parent not found' });
    return;
  }
  const children = await User.find({ id: { $in: parent.childId || [] } }).select('-sifre');
  res.json(children);
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npx vitest run src/test/unit/parent-children-auth.test.ts`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/User.ts server/src/test/unit/parent-children-auth.test.ts
git commit -m "fix: add authorization check to parent-children endpoint"
```

---

### Task 5: CORS Hardening

**Files:**

- Modify: `server/src/config/cors.ts`
- Create: `server/src/test/unit/cors.test.ts`

- [ ] **Step 1: Write failing test**

Create `server/src/test/unit/cors.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('CORS Configuration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should reject missing CORS_ORIGIN in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CORS_ORIGIN', '');

    await expect(async () => {
      const mod = await import('../../config/cors');
      mod.createCorsOptions();
    }).rejects.toThrow('CORS_ORIGIN');

    vi.unstubAllEnvs();
  });

  it('should not include localhost origins in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CORS_ORIGIN', 'https://tofas-fen.com');

    const mod = await import('../../config/cors');
    const options = mod.createCorsOptions();

    // Test the origin callback
    const testOrigin = (origin: string | undefined): Promise<boolean> => {
      return new Promise((resolve) => {
        (options.origin as any)(origin, (_err: any, allow: boolean) => {
          resolve(!!allow);
        });
      });
    };

    expect(await testOrigin('https://tofas-fen.com')).toBe(true);
    expect(await testOrigin('http://localhost:5173')).toBe(false);
    expect(await testOrigin('http://localhost:3000')).toBe(false);

    vi.unstubAllEnvs();
  });

  it('should include localhost origins in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('CORS_ORIGIN', '');

    const mod = await import('../../config/cors');
    const options = mod.createCorsOptions();

    const testOrigin = (origin: string | undefined): Promise<boolean> => {
      return new Promise((resolve) => {
        (options.origin as any)(origin, (_err: any, allow: boolean) => {
          resolve(!!allow);
        });
      });
    };

    expect(await testOrigin('http://localhost:5173')).toBe(true);
    expect(await testOrigin('http://localhost:3000')).toBe(true);

    vi.unstubAllEnvs();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/test/unit/cors.test.ts`
Expected: FAIL — production doesn't throw on missing CORS_ORIGIN, and localhost is allowed in production.

- [ ] **Step 3: Harden CORS configuration**

Replace the entire `server/src/config/cors.ts` file:

```typescript
import cors from 'cors';

/**
 * CORS configuration — restricts localhost origins to development only.
 * In production, CORS_ORIGIN env var is required.
 */
export function createCorsOptions() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && !process.env.CORS_ORIGIN) {
    throw new Error('CORS_ORIGIN environment variable is required in production');
  }

  const allowedOrigins: string[] = [];

  if (process.env.CORS_ORIGIN) {
    allowedOrigins.push(process.env.CORS_ORIGIN);
  }

  if (!isProduction) {
    allowedOrigins.push(
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    );
  }

  return {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!isProduction) {
        let isLocalOrigin = false;
        if (origin) {
          try {
            const url = new URL(origin);
            isLocalOrigin =
              (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
              url.protocol === 'http:';
          } catch {
            isLocalOrigin = false;
          }
        }
        if (!origin || isLocalOrigin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS policy: Origin not allowed in development'));
        }
      } else {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS policy: Origin not allowed'));
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    exposedHeaders: ['X-CSRF-Token'],
    optionsSuccessStatus: 200,
  };
}

export function configureCors() {
  return cors(createCorsOptions());
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npx vitest run src/test/unit/cors.test.ts`
Expected: All 3 tests PASS.

- [ ] **Step 5: Commit Phase 1**

```bash
git add server/src/config/cors.ts server/src/test/unit/cors.test.ts
git commit -m "fix: restrict CORS localhost origins to development, require CORS_ORIGIN in production"
```

---

## Phase 2: Data Integrity & Performance

### Task 6: Redis-Backed Rate Limiting with Per-Endpoint Limits

**Files:**

- Modify: `server/src/config/rateLimiters.ts`
- Modify: `server/src/routes/Dilekce.ts`
- Modify: `server/src/routes/Communication.ts`
- Modify: `server/src/routes/Kvkk.ts`
- Modify: `server/src/routes/Notification.ts`
- Create: `server/src/test/unit/redis-rate-limiter.test.ts`

- [ ] **Step 1: Write failing test for Redis store factory**

Create `server/src/test/unit/redis-rate-limiter.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createRedisRateLimitStore, createEndpointLimiter } from '../../config/rateLimiters';

describe('createRedisRateLimitStore', () => {
  it('should return undefined when Redis is not available (falls back to memory)', () => {
    // In test environment, Redis is not connected
    const store = createRedisRateLimitStore();
    // Returns undefined when Redis unavailable — express-rate-limit uses MemoryStore by default
    expect(store).toBeUndefined();
  });
});

describe('createEndpointLimiter', () => {
  it('should create a limiter with correct windowMs and max', () => {
    const limiter = createEndpointLimiter({
      windowMs: 60 * 1000,
      max: 30,
      message: 'Too many requests',
    });
    expect(limiter).toBeDefined();
    expect(typeof limiter).toBe('function'); // express middleware
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/test/unit/redis-rate-limiter.test.ts`
Expected: FAIL — functions not exported yet.

- [ ] **Step 3: Add Redis store factory and endpoint limiter to rateLimiters.ts**

Edit `server/src/config/rateLimiters.ts`. Add these exports at the end of the file (before the `applyRateLimiters` function):

```typescript
import { RedisStore } from 'rate-limit-redis';
import { createClient } from 'redis';
import rateLimit from 'express-rate-limit';

let redisStoreClient: ReturnType<typeof createClient> | null = null;

/**
 * Creates a Redis store for rate limiting. Returns undefined if Redis is unavailable,
 * in which case express-rate-limit falls back to its built-in MemoryStore.
 */
export function createRedisRateLimitStore(): RedisStore | undefined {
  try {
    const redisUrl =
      process.env.REDIS_URL ||
      `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`;

    if (!redisStoreClient) {
      redisStoreClient = createClient({ url: redisUrl });
      redisStoreClient.connect().catch(() => {
        logger.warn('Redis not available for rate limiting, using in-memory store');
        redisStoreClient = null;
      });
    }

    if (!redisStoreClient) return undefined;

    return new RedisStore({
      sendCommand: (...args: string[]) => (redisStoreClient as any).sendCommand(args),
    });
  } catch {
    logger.warn('Failed to create Redis rate limit store, using in-memory fallback');
    return undefined;
  }
}

/**
 * Creates an endpoint-specific rate limiter.
 */
export function createEndpointLimiter(opts: { windowMs: number; max: number; message: string }) {
  return rateLimit({
    windowMs: opts.windowMs,
    max: opts.max,
    message: { error: opts.message },
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisRateLimitStore(),
  });
}
```

Make sure `logger` is imported at the top of the file (add if missing):

```typescript
import logger from '../utils/logger';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npx vitest run src/test/unit/redis-rate-limiter.test.ts`
Expected: PASS.

- [ ] **Step 5: Apply per-endpoint limiters to route files**

Edit `server/src/routes/Dilekce.ts`. Add at the top (after other imports):

```typescript
import { createEndpointLimiter } from '../config/rateLimiters';

const uploadLimiter = createEndpointLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Çok fazla dosya yükleme isteği. Lütfen daha sonra tekrar deneyin.',
});
```

Apply `uploadLimiter` to the POST route that handles file uploads — add it as middleware before the handler.

Edit `server/src/routes/Communication.ts`. Add at the top:

```typescript
import { createEndpointLimiter } from '../config/rateLimiters';

const messageLimiter = createEndpointLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Çok fazla mesaj gönderildi. Lütfen bir dakika bekleyin.',
});
const commUploadLimiter = createEndpointLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Çok fazla dosya yükleme isteği.',
});
```

Apply `messageLimiter` to POST message endpoints and `commUploadLimiter` to file upload endpoints.

Edit `server/src/routes/Kvkk.ts`. Add at the top:

```typescript
import { createEndpointLimiter } from '../config/rateLimiters';

const dataExportLimiter = createEndpointLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Çok fazla veri dışa aktarma isteği. Lütfen daha sonra tekrar deneyin.',
});
```

Apply `dataExportLimiter` to data export/deletion request endpoints.

Edit `server/src/routes/Notification.ts`. Add at the top:

```typescript
import { createEndpointLimiter } from '../config/rateLimiters';

const bulkNotifLimiter = createEndpointLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Çok fazla toplu bildirim isteği.',
});
```

Apply `bulkNotifLimiter` to the `PATCH /bulk-read` endpoint.

- [ ] **Step 6: Commit**

```bash
git add server/src/config/rateLimiters.ts server/src/routes/Dilekce.ts server/src/routes/Communication.ts server/src/routes/Kvkk.ts server/src/routes/Notification.ts server/src/test/unit/redis-rate-limiter.test.ts
git commit -m "feat: add Redis-backed per-endpoint rate limiting"
```

---

### Task 7: Add Missing Database Indexes

**Files:**

- Create: `server/src/migrations/002-add-missing-indexes.ts`

- [ ] **Step 1: Create migration file**

Create `server/src/migrations/002-add-missing-indexes.ts`:

```typescript
import mongoose from 'mongoose';
import logger from '../utils/logger';

export interface Migration {
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

export const migration: Migration = {
  name: '002-add-missing-indexes',

  async up() {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not connected');

    logger.info('Migration 002: Creating missing indexes...');

    // Announcement indexes
    const announcements = db.collection('announcements');
    await announcements.createIndex(
      { targetRoles: 1, createdAt: -1 },
      { name: 'targetRoles_createdAt_idx' },
    );
    await announcements.createIndex(
      { authorId: 1, createdAt: -1 },
      { name: 'authorId_createdAt_idx' },
    );
    await announcements.createIndex(
      { priority: 1, createdAt: -1 },
      { name: 'priority_createdAt_idx' },
    );

    // Homework indexes
    const homework = db.collection('homeworks');
    await homework.createIndex(
      { teacherId: 1, isPublished: 1 },
      { name: 'teacherId_isPublished_idx' },
    );
    await homework.createIndex(
      { classLevel: 1, classSection: 1, dueDate: 1 },
      { name: 'class_dueDate_idx' },
    );
    await homework.createIndex({ dueDate: 1, status: 1 }, { name: 'dueDate_status_idx' });

    // Schedule indexes
    const schedules = db.collection('schedules');
    await schedules.createIndex(
      { classLevel: 1, classSection: 1, academicYear: 1 },
      { name: 'class_academicYear_idx' },
    );
    await schedules.createIndex({ isActive: 1 }, { name: 'isActive_idx' });

    // MealList indexes
    const meallists = db.collection('meallists');
    await meallists.createIndex({ month: 1, year: 1 }, { name: 'month_year_idx' });
    await meallists.createIndex(
      { isActive: 1, uploadedAt: -1 },
      { name: 'isActive_uploadedAt_idx' },
    );

    // SupervisorList indexes
    const supervisorlists = db.collection('supervisorlists');
    await supervisorlists.createIndex({ month: 1, year: 1 }, { name: 'month_year_idx' });
    await supervisorlists.createIndex(
      { isActive: 1, uploadedAt: -1 },
      { name: 'isActive_uploadedAt_idx' },
    );

    // Request indexes
    const requests = db.collection('requests');
    await requests.createIndex({ userId: 1, status: 1 }, { name: 'userId_status_idx' });
    await requests.createIndex(
      { type: 1, status: 1, createdAt: -1 },
      { name: 'type_status_createdAt_idx' },
    );

    logger.info('Migration 002: All indexes created successfully');
  },

  async down() {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not connected');

    logger.info('Migration 002: Dropping indexes...');

    const drops: Array<[string, string]> = [
      ['announcements', 'targetRoles_createdAt_idx'],
      ['announcements', 'authorId_createdAt_idx'],
      ['announcements', 'priority_createdAt_idx'],
      ['homeworks', 'teacherId_isPublished_idx'],
      ['homeworks', 'class_dueDate_idx'],
      ['homeworks', 'dueDate_status_idx'],
      ['schedules', 'class_academicYear_idx'],
      ['schedules', 'isActive_idx'],
      ['meallists', 'month_year_idx'],
      ['meallists', 'isActive_uploadedAt_idx'],
      ['supervisorlists', 'month_year_idx'],
      ['supervisorlists', 'isActive_uploadedAt_idx'],
      ['requests', 'userId_status_idx'],
      ['requests', 'type_status_createdAt_idx'],
    ];

    for (const [collection, indexName] of drops) {
      try {
        await db.collection(collection).dropIndex(indexName);
      } catch (error) {
        logger.warn(`Index ${indexName} on ${collection} may not exist, skipping`);
      }
    }

    logger.info('Migration 002: Indexes dropped');
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add server/src/migrations/002-add-missing-indexes.ts
git commit -m "feat: add missing database indexes for Announcement, Homework, Schedule, MealList, SupervisorList, Request"
```

---

### Task 8: Account Unlock Endpoint

**Files:**

- Modify: `server/src/models/User.ts`
- Modify: `server/src/modules/auth/services/authService.ts`
- Modify: `server/src/modules/auth/routes/authRoutes.ts`
- Modify: `server/src/modules/auth/validators/authValidators.ts`
- Create: `server/src/test/unit/account-unlock.test.ts`

- [ ] **Step 1: Write failing test**

Create `server/src/test/unit/account-unlock.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock User model
const mockFindOne = vi.fn();
const mockSave = vi.fn();
vi.mock('../../models/User', () => ({
  default: { findOne: mockFindOne },
}));

// Mock security logger
vi.mock('../../modules/auth/utils/securityLogger', () => ({
  logSecurityEvent: vi.fn(),
  SecurityEvent: { ACCOUNT_UNLOCKED: 'ACCOUNT_UNLOCKED' },
}));

import { AuthService } from '../../modules/auth/services/authService';

describe('Account Unlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should unlock a locked account', async () => {
    const mockUser = {
      id: 'student-1',
      failedLoginAttempts: 5,
      lockUntil: new Date(Date.now() + 30 * 60 * 1000),
      isLocked: true,
      lockReason: 'failed_attempts',
      save: mockSave.mockResolvedValue(true),
    };
    mockFindOne.mockResolvedValue(mockUser);

    await AuthService.unlockAccount('student-1', 'admin-1');

    expect(mockUser.failedLoginAttempts).toBe(0);
    expect(mockUser.lockUntil).toBeUndefined();
    expect(mockUser.isLocked).toBe(false);
    expect(mockUser.lockReason).toBeUndefined();
    expect(mockSave).toHaveBeenCalled();
  });

  it('should throw if user not found', async () => {
    mockFindOne.mockResolvedValue(null);

    await expect(AuthService.unlockAccount('nonexistent', 'admin-1')).rejects.toThrow(
      'Kullanıcı bulunamadı',
    );
  });

  it('should throw if account is not locked', async () => {
    const mockUser = {
      id: 'student-1',
      failedLoginAttempts: 0,
      lockUntil: null,
      isLocked: false,
      save: mockSave,
    };
    mockFindOne.mockResolvedValue(mockUser);

    await expect(AuthService.unlockAccount('student-1', 'admin-1')).rejects.toThrow(
      'kilitli değil',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/test/unit/account-unlock.test.ts`
Expected: FAIL — `AuthService.unlockAccount` does not exist.

- [ ] **Step 3: Add isLocked and lockReason fields to User model**

Edit `server/src/models/User.ts`. Add these fields after `lockUntil` (around line 139):

```typescript
  isLocked: { type: Boolean, default: false },
  lockReason: { type: String, enum: ['failed_attempts', 'admin_action', 'security_alert'] },
```

- [ ] **Step 4: Add unlockAccount method to AuthService**

Edit `server/src/modules/auth/services/authService.ts`. Add this static method to the `AuthService` class:

```typescript
  static async unlockAccount(userId: string, unlockedBy: string): Promise<void> {
    const user = await User.findOne({ id: userId });
    if (!user) {
      throw new Error('Kullanıcı bulunamadı');
    }

    const isCurrentlyLocked = user.isLocked || (user.lockUntil && user.lockUntil > new Date());
    if (!isCurrentlyLocked && user.failedLoginAttempts === 0) {
      throw new Error('Bu hesap kilitli değil');
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.isLocked = false;
    user.lockReason = undefined;
    await user.save();

    logSecurityEvent(SecurityEvent.ACCOUNT_UNLOCKED, {
      userId,
      unlockedBy,
      timestamp: new Date().toISOString(),
    });
  }
```

Make sure `logSecurityEvent` and `SecurityEvent` are imported. Add `ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED'` to the `SecurityEvent` enum in `server/src/modules/auth/utils/securityLogger.ts` if not already present.

- [ ] **Step 5: Add unlock validator**

Edit `server/src/modules/auth/validators/authValidators.ts`. Add:

```typescript
export const validateUnlockAccount = [
  body('userId')
    .trim()
    .notEmpty()
    .withMessage('Kullanıcı ID gerekli')
    .isLength({ min: 1, max: 50 })
    .withMessage('Geçersiz kullanıcı ID'),
  handleValidationErrors,
];
```

- [ ] **Step 6: Add unlock route**

Edit `server/src/modules/auth/routes/authRoutes.ts`. Add after the existing routes (before the export):

```typescript
// Unlock account — admin or linked parent only
router.post(
  '/unlock-account',
  authLimiter,
  authenticateJWT,
  validateUnlockAccount,
  async (req: Request, res: Response) => {
    try {
      const authUser = (req as any).user;
      const { userId } = req.body;

      // Only admin or linked parent can unlock
      if (authUser.role !== 'admin') {
        const parentUser = await User.findOne({ id: authUser.userId });
        if (!parentUser || authUser.role !== 'parent' || !parentUser.childId?.includes(userId)) {
          return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
        }
      }

      await AuthService.unlockAccount(userId, authUser.userId);
      res.json({ success: true, message: 'Hesap kilidi açıldı' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Hesap kilidi açılamadı';
      res.status(400).json({ error: message });
    }
  },
);
```

Import `validateUnlockAccount` from the validators file and `User` from the models.

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd server && npx vitest run src/test/unit/account-unlock.test.ts`
Expected: All 3 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add server/src/models/User.ts server/src/modules/auth/services/authService.ts server/src/modules/auth/routes/authRoutes.ts server/src/modules/auth/validators/authValidators.ts server/src/modules/auth/utils/securityLogger.ts server/src/test/unit/account-unlock.test.ts
git commit -m "feat: add account unlock endpoint for admin and parent users"
```

---

### Task 9: Frontend Global Error Listeners

**Files:**

- Modify: `client/src/main.tsx`

- [ ] **Step 1: Add global error listeners**

Edit `client/src/main.tsx`. Add after the `initializeMonitoring()` call (around line 49) and before `ReactDOM.createRoot()`:

```typescript
import * as Sentry from '@sentry/react';

// Capture uncaught errors globally
window.addEventListener('error', (event) => {
  if (import.meta.env.PROD) {
    Sentry.captureException(event.error);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (import.meta.env.PROD) {
    Sentry.captureException(event.reason);
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add client/src/main.tsx
git commit -m "fix: add global window error and unhandledrejection listeners"
```

---

## Phase 3: Observability & Alerting

### Task 10: Activate Request Timing Middleware

**Files:**

- Modify: `server/src/index.ts`

- [ ] **Step 1: Register requestTiming middleware**

Edit `server/src/index.ts`. Add import at the top with other middleware imports:

```typescript
import { requestTiming } from './middleware/performance';
```

Add `app.use(requestTiming());` after the compression middleware (line 82) and before CORS (line 101). Insert around line 84:

```typescript
// Request timing and ID generation
app.use(requestTiming());
```

- [ ] **Step 2: Verify server starts**

Run: `cd server && npx ts-node --transpile-only src/index.ts`
Expected: Server starts without errors. Ctrl+C to stop.

- [ ] **Step 3: Commit**

```bash
git add server/src/index.ts
git commit -m "feat: activate request timing middleware for request IDs and slow request logging"
```

---

### Task 11: Email Alerts for Critical Events

**Files:**

- Create: `server/src/services/AlertEmailService.ts`
- Modify: `server/src/services/SecurityAlertService.ts`
- Modify: `server/src/config/environment.ts`
- Create: `server/src/test/unit/alert-email.test.ts`

- [ ] **Step 1: Write failing test**

Create `server/src/test/unit/alert-email.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock nodemailer
const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' });
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: mockSendMail })),
  },
}));

vi.stubEnv('ALERT_EMAIL_ENABLED', 'true');
vi.stubEnv('ALERT_EMAIL_TO', 'admin1@school.com,admin2@school.com');
vi.stubEnv('SMTP_HOST', 'smtp.test.com');
vi.stubEnv('SMTP_PORT', '587');
vi.stubEnv('SMTP_USER', 'test@test.com');
vi.stubEnv('SMTP_PASS', 'password');
vi.stubEnv('SMTP_FROM', 'noreply@test.com');

import { AlertEmailService } from '../../services/AlertEmailService';

describe('AlertEmailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AlertEmailService.resetRateLimits();
  });

  it('should send email when enabled', async () => {
    await AlertEmailService.sendAlert('Test Alert', 'Something happened', 'critical');

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin1@school.com,admin2@school.com',
        subject: expect.stringContaining('Test Alert'),
      }),
    );
  });

  it('should not send when disabled', async () => {
    vi.stubEnv('ALERT_EMAIL_ENABLED', 'false');

    // Re-import to pick up new env
    vi.resetModules();
    const mod = await import('../../services/AlertEmailService');
    await mod.AlertEmailService.sendAlert('Test', 'body', 'warning');

    expect(mockSendMail).not.toHaveBeenCalled();
    vi.stubEnv('ALERT_EMAIL_ENABLED', 'true');
  });

  it('should rate limit same alert type', async () => {
    await AlertEmailService.sendAlert('Alert A', 'body', 'critical');
    await AlertEmailService.sendAlert('Alert A', 'body', 'critical');
    await AlertEmailService.sendAlert('Alert A', 'body', 'critical');

    // Should only send once — rate limited
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  it('should allow different alert types', async () => {
    await AlertEmailService.sendAlert('Alert A', 'body', 'critical');
    await AlertEmailService.sendAlert('Alert B', 'body', 'warning');

    expect(mockSendMail).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/test/unit/alert-email.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Add env vars to environment config**

Edit `server/src/config/environment.ts`. Add after the SMTP vars (around line 64):

```typescript
  // Alert emails
  ALERT_EMAIL_ENABLED: process.env.ALERT_EMAIL_ENABLED === 'true',
  ALERT_EMAIL_TO: process.env.ALERT_EMAIL_TO || '',
```

- [ ] **Step 4: Create AlertEmailService**

Create `server/src/services/AlertEmailService.ts`:

```typescript
import nodemailer from 'nodemailer';
import logger from '../utils/logger';

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_EMAILS_PER_TYPE = 10;

// Track email sends per alert type for rate limiting
const emailSendCounts = new Map<string, { count: number; windowStart: number }>();

function getTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export class AlertEmailService {
  static async sendAlert(
    subject: string,
    body: string,
    severity: 'warning' | 'critical',
  ): Promise<void> {
    const enabled = process.env.ALERT_EMAIL_ENABLED === 'true';
    const recipients = process.env.ALERT_EMAIL_TO || '';

    if (!enabled || !recipients) {
      return;
    }

    // Rate limiting per subject
    const now = Date.now();
    const tracker = emailSendCounts.get(subject);
    if (tracker) {
      if (now - tracker.windowStart < RATE_LIMIT_WINDOW_MS) {
        if (tracker.count >= MAX_EMAILS_PER_TYPE) {
          logger.warn(`Alert email rate limited: ${subject}`);
          return;
        }
        tracker.count++;
      } else {
        emailSendCounts.set(subject, { count: 1, windowStart: now });
      }
    } else {
      emailSendCounts.set(subject, { count: 1, windowStart: now });
    }

    const severityPrefix = severity === 'critical' ? '[KRITIK]' : '[UYARI]';
    const from = process.env.SMTP_FROM || 'noreply@tofas-fen.com';

    try {
      const transport = getTransport();
      await transport.sendMail({
        from,
        to: recipients,
        subject: `${severityPrefix} Tofaş Fen - ${subject}`,
        text: `Severity: ${severity.toUpperCase()}\nTime: ${new Date().toISOString()}\n\n${body}`,
      });
      logger.info(`Alert email sent: ${subject}`, { severity, to: recipients });
    } catch (error) {
      logger.error('Failed to send alert email', { error: (error as Error).message, subject });
    }
  }

  /** Reset rate limit trackers — used in tests */
  static resetRateLimits(): void {
    emailSendCounts.clear();
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server && npx vitest run src/test/unit/alert-email.test.ts`
Expected: All 4 tests PASS.

- [ ] **Step 6: Wire AlertEmailService into SecurityAlertService**

Edit `server/src/services/SecurityAlertService.ts`. Add import at the top:

```typescript
import { AlertEmailService } from './AlertEmailService';
```

In the `triggerAlert()` method, after the admin notification loop (around line 408, after the `for (const adminId of adminIds)` block), add:

```typescript
// Send email alert for critical/high severity events
const emailSeverity = event.severity === 'critical' ? 'critical' : 'warning';
const alertMessage = messages[event.type] || `Güvenlik olayı: ${event.type}`;
const emailBody = [
  `Olay: ${event.type}`,
  `Detay: ${alertMessage}`,
  `IP: ${event.ip || 'Bilinmiyor'}`,
  `Kullanıcı: ${event.userId || 'Bilinmiyor'}`,
  event.metadata ? `Ek bilgi: ${JSON.stringify(event.metadata)}` : '',
]
  .filter(Boolean)
  .join('\n');

await AlertEmailService.sendAlert(`Güvenlik Alarmı: ${event.type}`, emailBody, emailSeverity);
```

- [ ] **Step 7: Commit**

```bash
git add server/src/services/AlertEmailService.ts server/src/services/SecurityAlertService.ts server/src/config/environment.ts server/src/test/unit/alert-email.test.ts
git commit -m "feat: add email alerting for security events via Nodemailer"
```

---

### Task 12: Sentry Hardening

**Files:**

- Modify: `client/src/utils/monitoring.ts`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Add beforeSend filter to strip sensitive data**

Edit `client/src/utils/monitoring.ts`. Replace the `beforeSend` in `initializeSentry()` (the one that just returns `event`):

```typescript
      beforeSend(event) {
        // Strip sensitive fields from error reports
        const sensitiveKeys = ['tckn', 'tcknHash', 'password', 'sifre', 'token', 'refreshToken', 'secret', 'authorization'];

        function scrubObject(obj: Record<string, any>): Record<string, any> {
          const cleaned: Record<string, any> = {};
          for (const [key, value] of Object.entries(obj)) {
            if (sensitiveKeys.includes(key.toLowerCase())) {
              cleaned[key] = '[REDACTED]';
            } else if (typeof value === 'object' && value !== null) {
              cleaned[key] = scrubObject(value);
            } else {
              cleaned[key] = value;
            }
          }
          return cleaned;
        }

        if (event.extra) {
          event.extra = scrubObject(event.extra as Record<string, any>);
        }
        if (event.contexts) {
          event.contexts = scrubObject(event.contexts as Record<string, any>);
        }
        // Strip Authorization header from breadcrumbs
        if (event.breadcrumbs) {
          for (const crumb of event.breadcrumbs) {
            if (crumb.data?.headers) {
              delete crumb.data.headers.Authorization;
              delete crumb.data.headers.authorization;
            }
          }
        }
        return event;
      },
```

- [ ] **Step 2: Wrap App with Sentry profiler**

Edit `client/src/App.tsx`. Add import at the top:

```typescript
import * as Sentry from '@sentry/react';
```

Replace the default export at the end of the file:

```typescript
export default App;
```

with:

```typescript
export default Sentry.withProfiler(App);
```

- [ ] **Step 3: Commit**

```bash
git add client/src/utils/monitoring.ts client/src/App.tsx
git commit -m "fix: harden Sentry with sensitive data filtering and performance profiling"
```

---

## Final Verification

- [ ] **Step 1: Run all server tests**

```bash
cd server && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 2: Run all client tests**

```bash
cd client && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 3: Run linting**

```bash
npm run lint
```

Expected: No new lint errors.

- [ ] **Step 4: Run type checking**

```bash
npm run type-check
```

Expected: No type errors.

- [ ] **Step 5: Start dev server and verify**

```bash
npm run dev
```

Expected: Both client and server start without errors.
