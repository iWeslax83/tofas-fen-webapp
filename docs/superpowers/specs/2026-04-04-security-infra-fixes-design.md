# Security & Infrastructure Fixes — Design Spec

**Date:** 2026-04-04
**Approach:** Progressive rollout in 3 phases, each with its own PR and testing cycle.

## Decisions

- **Password reset:** Not applicable. TCKN is the credential and can't change. Implementing account unlock instead (admin/parent-initiated + auto-unlock after timeout).
- **Email transport:** Nodemailer (already configured). No Resend migration.
- **Rate limiting store:** Redis-backed with in-memory fallback (same pattern as SecurityAlertService).
- **External alerting:** Email alerts only via Nodemailer to admin distribution list.

---

## Phase 1: Security-Critical

**Goal:** Eliminate active vulnerabilities. Smallest possible diff, ship fast.

### 1.1 Notification IDOR Fix

**File:** `server/src/routes/Notification.ts`

Three PATCH endpoints allow any authenticated user to modify any notification:

- `PATCH /:id/read`
- `PATCH /bulk-read`
- `PATCH /:id/archive`

**Fix:** Before updating, query the notification and verify `notification.userId === req.user.userId`. Admins bypass. For `bulk-read`, filter the provided IDs to only those owned by the requesting user.

### 1.2 GraphQL Input Validation

**File:** `server/src/graphql/resolvers/index.ts`

All GraphQL mutations accept raw input via `...input` spread with zero validation or sanitization.

**Fix:**

- Create `server/src/graphql/utils/validateInput.ts` — a utility that applies:
  - DOMPurify sanitization (reuse existing `isomorphic-dompurify` config)
  - MongoDB operator stripping (strip keys starting with `$`)
  - Field-level validation (length limits, type checks) per mutation
- Apply to all 18 mutations: `login`, `logout`, `updateProfile`, `createAnnouncement`, `updateAnnouncement`, `deleteAnnouncement`, `createHomework`, `updateHomework`, `deleteHomework`, `submitHomework`, `addNote`, `updateNote`, `deleteNote`, `createEvciRequest`, `updateEvciRequest`, `deleteEvciRequest`, `createMaintenanceRequest`, `updateMaintenanceRequest`.
- Validation errors return GraphQL `UserInputError` with field-specific messages.

### 1.3 Role Mismatch Fix

**File:** `server/src/routes/MealList.ts`

`authorizeRoles(['admin', 'kitchen_staff'])` references a nonexistent role. The actual staff role is `hizmetli`.

**Fix:** Change `'kitchen_staff'` to `'hizmetli'` on POST and PUT route handlers.

### 1.4 Parent Children Endpoint Auth

**File:** `server/src/routes/User.ts` (line ~272)

`GET /parent/:parentId/children` has no ownership check — any authenticated user can enumerate any parent's children.

**Fix:** Add authorization: only the parent themselves (`req.user.userId === req.params.parentId`), admins, or teachers can access this endpoint.

### 1.5 CORS Hardening

**File:** `server/src/config/cors.ts`

Localhost origins are hardcoded in all environments.

**Fix:**

- Wrap localhost/127.0.0.1 entries in `if (process.env.NODE_ENV !== 'production')` block.
- In production, if `CORS_ORIGIN` is not set, throw an error instead of falling back to localhost.

---

## Phase 2: Data Integrity & Performance

**Goal:** Close rate limiting gaps, add missing indexes, implement account unlock, harden frontend.

### 2.1 Per-Endpoint Rate Limiting with Redis

**Files:** `server/src/middleware/rateLimiter.ts`, `server/src/config/rateLimiters.ts`, individual route files

**Changes:**

- Add `rate-limit-redis` package.
- Create `createRedisStore()` that returns a RedisStore when Redis is available, falls back to MemoryStore with a warning log.
- Update existing global limiter to use Redis store.
- Add per-endpoint limiters applied directly in route files:

| Endpoint Category                     | Limit       | Window   |
| ------------------------------------- | ----------- | -------- |
| File uploads (Dilekce, Communication) | 10 requests | 1 hour   |
| Message sending (Communication POST)  | 30 requests | 1 minute |
| Data export / KVKK endpoints          | 5 requests  | 1 hour   |
| Bulk operations                       | 10 requests | 1 hour   |
| Notification bulk operations          | 20 requests | 1 minute |

### 2.2 Missing Database Indexes

**File:** New migration `server/src/migrations/002-add-missing-indexes.ts`

Indexes to add:

**Announcement:**

- `{ targetRoles: 1, createdAt: -1 }`
- `{ authorId: 1, createdAt: -1 }`
- `{ priority: 1, createdAt: -1 }`

**Homework:**

- `{ teacherId: 1, isPublished: 1 }`
- `{ classLevel: 1, classSection: 1, dueDate: 1 }`
- `{ dueDate: 1, status: 1 }`

**Schedule:**

- `{ classLevel: 1, classSection: 1, academicYear: 1 }`
- `{ isActive: 1 }`

**MealList:**

- `{ month: 1, year: 1 }`
- `{ isActive: 1, uploadedAt: -1 }`

**SupervisorList:**

- `{ month: 1, year: 1 }`
- `{ isActive: 1, uploadedAt: -1 }`

**Request:**

- `{ userId: 1, status: 1 }`
- `{ type: 1, status: 1, createdAt: -1 }`

Migration must have both `up()` and `down()` methods. `down()` drops only the indexes added by this migration.

### 2.3 Account Unlock Mechanism

**Files:**

- `server/src/models/User.ts` — add fields
- `server/src/modules/auth/routes/authRoutes.ts` — add endpoint
- `server/src/modules/auth/services/authService.ts` — add unlock logic
- `server/src/modules/auth/validators/authValidators.ts` — add validation

**User model additions:**

```
isLocked: Boolean (default: false)
lockReason: String (enum: 'failed_attempts', 'admin_action', 'security_alert')
lockedAt: Date
lockExpiresAt: Date
lockedBy: ObjectId (ref: User, nullable — null means system-locked)
```

**Endpoint:** `POST /api/auth/unlock-account`

- Body: `{ userId: string }`
- Auth: `authenticateJWT` + admin role OR linked parent (verified via `parentId` relationship)
- Behavior: Sets `isLocked: false`, clears lock fields, logs `ACCOUNT_UNLOCKED` security event
- Rate limited: auth limiter (5 req/15min)

**Auto-unlock:** During login, if `isLocked && lockExpiresAt < now`, auto-unlock before proceeding. Default lock duration: 30 minutes (configurable via `ACCOUNT_LOCK_DURATION_MINUTES` env var).

**Lock trigger:** Modify existing login failure handling — after 5 consecutive failures, set `isLocked: true` with `lockReason: 'failed_attempts'` and `lockExpiresAt: now + 30min`.

### 2.4 Frontend Global Error Listeners

**File:** `client/src/main.tsx`

Add before `ReactDOM.createRoot()`:

```typescript
window.addEventListener('error', (event) => {
  Sentry.captureException(event.error);
});
window.addEventListener('unhandledrejection', (event) => {
  Sentry.captureException(event.reason);
});
```

Import Sentry at the top of the file (it's already initialized via `initializeMonitoring()`).

---

## Phase 3: Observability & Alerting

**Goal:** Make production debuggable. Ensure the team gets notified when things break.

### 3.1 Activate Request Timing Middleware

**File:** `server/src/index.ts`

The `requestTiming()` middleware in `server/src/middleware/performance.ts` already exists but is not registered. It provides:

- Unique request ID generation (set on `req.requestId`)
- Slow request logging (>1000ms threshold, WARNING level)
- Response time header (`X-Response-Time`)

**Fix:** Import and register after compression middleware, before routes:

```typescript
import { requestTiming } from './middleware/performance';
app.use(requestTiming());
```

### 3.2 Email Alerts for Critical Events

**Files:**

- `server/src/services/SecurityAlertService.ts` — add email dispatch
- `server/src/services/AlertEmailService.ts` — new, thin wrapper around Nodemailer

**AlertEmailService:**

- Uses existing Nodemailer transport config (`SMTP_*` env vars)
- Single method: `sendAlert(subject: string, body: string, severity: 'warning' | 'critical')`
- Sends to `ALERT_EMAIL_TO` env var (comma-separated admin email addresses)
- Gated by `ALERT_EMAIL_ENABLED` env var (default: `'false'`)
- Includes rate limiting: max 10 emails per hour per alert type (prevent email storms)

**Integration points — wire into existing triggers:**

| Trigger                                | Source                    | Severity |
| -------------------------------------- | ------------------------- | -------- |
| Mass login failures (20+ in 5min)      | SecurityAlertService      | critical |
| Distributed brute force (5+ IPs/user)  | SecurityAlertService      | critical |
| Data export spike (5+ in 1hr)          | SecurityAlertService      | warning  |
| Off-hours admin access (23:00-06:00)   | SecurityAlertService      | warning  |
| Role change spike (3+ in 10min)        | SecurityAlertService      | warning  |
| Uncaught exception (graceful shutdown) | index.ts process handlers | critical |
| Error rate >5%                         | System monitoring service | critical |

**Email format:** Plain text with structured sections — timestamp, alert type, severity, details, affected user/IP if available.

### 3.3 Sentry Hardening

**Files:**

- `client/src/utils/monitoring.ts` — add `beforeSend` hook
- `client/src/App.tsx` — wrap with profiler

**beforeSend hook:** Strip sensitive fields before sending to Sentry:

- Remove `tckn`, `tcknHash`, `password`, `token`, `refreshToken`, `secret` from error context/breadcrumbs
- Strip Authorization headers from request breadcrumbs

**Profiler:** Wrap the App export with `Sentry.withProfiler(App)` to capture component render performance.

---

## Testing Strategy

Each phase gets tested before merging:

**Phase 1:**

- Unit tests for notification ownership check logic
- Unit tests for GraphQL input validation utility
- Integration test: unauthenticated/wrong-user access to notification PATCH returns 403
- Integration test: GraphQL mutation with malicious input is rejected
- Manual verify: MealList POST works with `hizmetli` role
- Manual verify: CORS rejects requests without `CORS_ORIGIN` in production mode

**Phase 2:**

- Unit tests for account lock/unlock logic
- Integration test: rate limiter returns 429 after threshold
- Integration test: account locks after 5 failed logins, auto-unlocks after 30min
- Migration test: `up()` creates indexes, `down()` removes them (run against test DB)
- Frontend test: global error listeners capture and report errors

**Phase 3:**

- Unit test for AlertEmailService (mock Nodemailer transport)
- Integration test: security alert triggers email dispatch
- Manual verify: request IDs appear in logs, slow requests logged
- Manual verify: Sentry strips sensitive fields from error reports

---

## Env Vars Added

| Variable                        | Phase | Default                     | Description                  |
| ------------------------------- | ----- | --------------------------- | ---------------------------- |
| `ACCOUNT_LOCK_DURATION_MINUTES` | 2     | `30`                        | Auto-unlock duration         |
| `ALERT_EMAIL_TO`                | 3     | (none, required if enabled) | Comma-separated admin emails |
| `ALERT_EMAIL_ENABLED`           | 3     | `false`                     | Enable email alerting        |

## Dependencies Added

| Package            | Phase | Purpose                            |
| ------------------ | ----- | ---------------------------------- |
| `rate-limit-redis` | 2     | Redis store for express-rate-limit |
