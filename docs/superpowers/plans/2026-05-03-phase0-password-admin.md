# Phase 0 + Password Admin Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the must-fix Phase 0 findings from `CODE_REVIEW_REPORT_2026-04-29.md` plus the cohesive password-admin module quality fixes that touch the same files.

**Architecture:** Five small PRs delivered in sequence: hygiene → security cross-cutting → password-admin hardening → compose+nginx → deployment runbook. PR #2 unblocks PR #3 (User.sifre `select: false` migration). PR #4 is independent of #2/#3 and can be developed in parallel after #1.

**Tech Stack:** Node 18 + Express 4 + Mongoose 8 + Vitest (server); React 19 + Vite 6 + TanStack Query 5 + Vitest + Tailwind 4 (client); nginx + Docker Compose (infra).

**Spec:** [`docs/superpowers/specs/2026-05-03-phase0-password-admin-design.md`](../specs/2026-05-03-phase0-password-admin-design.md)

**Trust posture:** Administrative users are trusted operators. Mechanisms favor trust + low friction over policing; defense-in-depth is reserved for log/heap hygiene and correctness. Per-user reset still surfaces plaintext in JSON (admin trusted); only bulk-import stops shipping plaintext via JSON.

---

## PR #1 — Repo hygiene (`chore/repo-hygiene`)

### Task 1.1: Branch + gitignore credentials exports

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Create branch**

```bash
git checkout main && git pull
git checkout -b chore/repo-hygiene
```

- [ ] **Step 2: Append credentials patterns to `.gitignore`**

Append these lines to the end of `.gitignore`:

```
# Generated credentials exports — never commit (N-L3 in CODE_REVIEW_REPORT_2026-04-29.md)
credentials-*.xlsx
credentials-*.xls
local-data/
```

- [ ] **Step 3: Verify gitignore matches**

Run: `git check-ignore credentials-test.xlsx credentials-test.xls local-data/foo.txt`
Expected: each line echoed back, exit 0.

- [ ] **Step 4: Move existing untracked credentials files into `local-data/`**

```bash
mkdir -p local-data
git mv -k 'credentials-20260421-*.xlsx' local-data/ 2>/dev/null || mv credentials-20260421-*.xlsx local-data/
mv 'credentials-atlas-20260422-*.xlsx' local-data/ 2>/dev/null || true
mv 'öğrenci tüm liste 20042026.XLS' local-data/ 2>/dev/null || true
```

(`git mv -k` is a no-op if the file isn't tracked; in that case the plain `mv` runs. The Turkish-named XLS file is the original input, also private.)

- [ ] **Step 5: Verify state**

Run: `git status -sb`
Expected: no `credentials-*.xlsx` listed; `local-data/` not listed (gitignored).

- [ ] **Step 6: Commit**

```bash
git add .gitignore
git commit -m "chore(hygiene): gitignore credentials exports and local-data dir

Closes: N-L3"
```

### Task 1.2: Delete empty sealed-secret.yaml stub

**Files:**
- Delete: `k8s/sealed-secret.yaml`
- Modify: `k8s/secret.yaml.template`

- [ ] **Step 1: Confirm the stub is empty**

Run: `wc -c k8s/sealed-secret.yaml`
Expected: `0 k8s/sealed-secret.yaml`

If non-zero, abort and reread the spec — the stub may have been edited.

- [ ] **Step 2: Delete the stub**

```bash
git rm k8s/sealed-secret.yaml
```

- [ ] **Step 3: Add deferral note to secret template**

Open `k8s/secret.yaml.template` and add a comment as the first line(s):

```yaml
# NOTE: K8s secrets management (SealedSecrets / SOPS / external-secrets)
# is deferred to its own spec. The current Hostinger Compose deployment
# uses .env files instead — see docs/deployment.md.
# Tracked: I-C2 / I-H10 in CODE_REVIEW_REPORT_2026-04-29.md
```

(If the file uses `# ---` separators or already has a leading comment, place this block after the existing leading comments but before the first YAML key.)

- [ ] **Step 4: Commit**

```bash
git add k8s/secret.yaml.template k8s/sealed-secret.yaml
git commit -m "chore(k8s): drop empty sealed-secret.yaml stub, note deferred secrets work

Tracked: I-C2, I-H10 (deferred)"
```

### Task 1.3: Push, open PR, verify CI green

- [ ] **Step 1: Push branch**

```bash
git push -u origin chore/repo-hygiene
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "chore(hygiene): gitignore credentials exports + drop empty sealed-secret stub" --body "$(cat <<'EOF'
## Summary
- Adds `credentials-*.xlsx`, `credentials-*.xls`, and `local-data/` to `.gitignore` (N-L3)
- Moves existing untracked credentials files into `local-data/` (gitignored)
- Deletes the empty `k8s/sealed-secret.yaml` stub; notes deferred K8s secrets work in `secret.yaml.template`

## Test plan
- [ ] CI green
- [ ] `git check-ignore credentials-test.xlsx` returns the line
- [ ] No tracked files contain plaintext credentials

Closes: N-L3
Notes: I-C2 / I-H10 deferred to a separate spec (Hostinger Compose is the deployment target).
EOF
)"
```

- [ ] **Step 3: Wait for CI; merge when green**

Run: `gh pr checks --watch`
Expected: all checks pass. Then `gh pr merge --squash --delete-branch`.

- [ ] **Step 4: Sync local main**

```bash
git checkout main && git pull
```

---

## PR #2 — Security cross-cutting (`fix/security-cross-cutting`)

### Task 2.0: Branch from up-to-date main

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull
git checkout -b fix/security-cross-cutting
```

### Task 2.1: Create the `redaction` utility (TDD)

**Files:**
- Create: `server/src/utils/redaction.ts`
- Create: `server/src/test/unit/utils/redaction.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/src/test/unit/utils/redaction.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { redactSensitive } from '../../../utils/redaction';

describe('redactSensitive', () => {
  it('redacts password keys at any depth', () => {
    const input = { id: 'u1', password: 'hunter2', nested: { sifre: 'şifre1' } };
    const out = redactSensitive(input);
    expect(out).toEqual({ id: 'u1', password: '[REDACTED]', nested: { sifre: '[REDACTED]' } });
  });

  it('matches mixed case and common variants', () => {
    const input = {
      Authorization: 'Bearer x',
      apiKey: 'k',
      api_key: 'k',
      secret: 's',
      Cookie: 'c',
      Token: 't',
      pw: 'p',
      plaintext: 'pt',
    };
    const out = redactSensitive(input);
    Object.values(out).forEach((v) => expect(v).toBe('[REDACTED]'));
  });

  it('leaves non-sensitive keys alone', () => {
    expect(redactSensitive({ id: 'u1', adSoyad: 'Ada' })).toEqual({ id: 'u1', adSoyad: 'Ada' });
  });

  it('handles arrays of objects', () => {
    expect(redactSensitive([{ password: 'a' }, { password: 'b' }])).toEqual([
      { password: '[REDACTED]' },
      { password: '[REDACTED]' },
    ]);
  });

  it('does not mutate the input', () => {
    const input = { password: 'hunter2' };
    redactSensitive(input);
    expect(input.password).toBe('hunter2');
  });

  it('handles null/undefined/primitives', () => {
    expect(redactSensitive(null)).toBeNull();
    expect(redactSensitive(undefined)).toBeUndefined();
    expect(redactSensitive('hi')).toBe('hi');
    expect(redactSensitive(42)).toBe(42);
    expect(redactSensitive(true)).toBe(true);
  });

  it('handles circular references safely', () => {
    const input: any = { a: 1 };
    input.self = input;
    const out = redactSensitive(input);
    expect(out.a).toBe(1);
    expect(out.self).toBe('[CIRCULAR]');
  });

  it('caps depth to bound cost', () => {
    let deep: any = { password: 'p' };
    for (let i = 0; i < 20; i++) deep = { nested: deep };
    const out = redactSensitive(deep);
    // Anything below depth 8 becomes '[DEPTH_LIMIT]'.
    let cur: any = out;
    for (let i = 0; i < 8; i++) cur = cur?.nested;
    expect(cur).toBe('[DEPTH_LIMIT]');
  });
});
```

- [ ] **Step 2: Run test, verify failure**

Run: `cd server && npx vitest run src/test/unit/utils/redaction.test.ts`
Expected: FAIL — `Cannot find module '../../../utils/redaction'`.

- [ ] **Step 3: Implement `redaction.ts`**

Create `server/src/utils/redaction.ts`:

```ts
const SENSITIVE_KEY_RE =
  /(password|sifre|pw|plaintext|token|secret|api[_-]?key|authorization|cookie)/i;
const REDACTED = '[REDACTED]';
const CIRCULAR = '[CIRCULAR]';
const DEPTH_LIMIT = '[DEPTH_LIMIT]';
const MAX_DEPTH = 8;

function clone(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (depth > MAX_DEPTH) return DEPTH_LIMIT;
  if (value === null || typeof value !== 'object') return value;

  const obj = value as object;
  if (seen.has(obj)) return CIRCULAR;
  seen.add(obj);

  if (Array.isArray(value)) {
    return value.map((item) => clone(item, depth + 1, seen));
  }

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY_RE.test(key)) {
      out[key] = REDACTED;
    } else {
      out[key] = clone(val, depth + 1, seen);
    }
  }
  return out;
}

/**
 * Deep-clone `input`, replacing values for keys matching the sensitive-key
 * pattern with '[REDACTED]'. Pure: never mutates input. Bounded depth.
 *
 * Use this before logging request bodies, query strings, or arbitrary
 * payloads that may carry credentials. See N-C2 in
 * CODE_REVIEW_REPORT_2026-04-29.md.
 */
export function redactSensitive<T>(input: T): T {
  return clone(input, 0, new WeakSet()) as T;
}
```

- [ ] **Step 4: Re-run test, verify pass**

Run: `cd server && npx vitest run src/test/unit/utils/redaction.test.ts`
Expected: 8 passing.

- [ ] **Step 5: Commit**

```bash
git add server/src/utils/redaction.ts server/src/test/unit/utils/redaction.test.ts
git commit -m "feat(server): add redactSensitive utility for safe logging

Closes: N-C2 (foundation)"
```

### Task 2.2: Apply `redactSensitive` in errorHandler

**Files:**
- Modify: `server/src/middleware/errorHandler.ts:40-58`

- [ ] **Step 1: Read current state**

Run: `sed -n '38,60p' server/src/middleware/errorHandler.ts`
Confirm lines 40-58 still match what the spec describes (`body: req.body, query: req.query, params: req.params, headers: req.headers as ...`).

- [ ] **Step 2: Patch errorHandler.ts**

In `server/src/middleware/errorHandler.ts`, add the import at the top (after the existing imports):

```ts
import { redactSensitive } from '../utils/redaction';
```

Replace the `errorContextData` object (lines ~40-58) with:

```ts
const SAFE_HEADER_KEYS = new Set([
  'content-type',
  'user-agent',
  'referer',
  'x-request-id',
  'x-forwarded-for',
]);

function pickSafeHeaders(headers: Record<string, string | string[] | undefined>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (SAFE_HEADER_KEYS.has(k.toLowerCase())) {
      out[k] = Array.isArray(v) ? v.join(',') : String(v ?? '');
    }
  }
  return out;
}
```

(Place these helpers near the top of the file, after the imports, before `globalErrorHandler`.)

Then, inside `globalErrorHandler`, replace the `errorContextData` block with:

```ts
const errorContextData: ErrorContext = {
  userId: (req as unknown as { user?: { userId?: string } }).user?.userId,
  requestId: (req as unknown as { requestId?: string }).requestId,
  sessionId: (req as unknown as { sessionId?: string }).sessionId,
  userAgent: req.get('User-Agent') || '',
  ip: req.ip || req.connection.remoteAddress || '',
  path: req.path,
  method: req.method,
  // N-C2: deep-clone + redact before logging. req.body / req.query may
  // carry plaintext credentials on auth endpoints; req.headers carries
  // Authorization / Cookie. Strip them all before they hit Winston.
  body: redactSensitive(req.body),
  query: redactSensitive(req.query),
  params: req.params,
  headers: pickSafeHeaders(
    req.headers as Record<string, string | string[] | undefined>,
  ) as unknown as Record<string, string>,
  severity: getErrorSeverity(appError.statusCode),
  type: getErrorType(appError.statusCode),
  additionalData: {
    originalError: error.name,
    stack: error.stack,
  },
};
```

- [ ] **Step 3: Run server tests to verify nothing broke**

Run: `cd server && npm test -- --run` (or `npx vitest run`)
Expected: all existing tests pass; new `redaction.test.ts` passes too.

- [ ] **Step 4: Add an integration test for the redaction**

Create `server/src/test/integration/errorHandler.redaction.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { globalErrorHandler } from '../../middleware/errorHandler';
import logger from '../../utils/logger';

describe('globalErrorHandler — req.body redaction (N-C2)', () => {
  beforeEach(() => {
    vi.spyOn(logger, 'warn').mockImplementation(() => logger);
    vi.spyOn(logger, 'error').mockImplementation(() => logger);
  });

  it('redacts password fields from logged body on errors', async () => {
    const app = express();
    app.use(express.json());
    app.post('/boom', (_req, _res, next) => next(new Error('synthetic')));
    app.use(globalErrorHandler);

    await request(app).post('/boom').send({ id: 'u1', password: 'hunter2', sifre: 'şf' });

    const calls = (logger.error as any).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const logged = JSON.stringify(calls[0]);
    expect(logged).not.toContain('hunter2');
    expect(logged).not.toContain('şf');
    expect(logged).toContain('[REDACTED]');
  });

  it('drops Authorization header from logged context', async () => {
    const app = express();
    app.use(express.json());
    app.get('/boom', (_req, _res, next) => next(new Error('synthetic')));
    app.use(globalErrorHandler);

    await request(app).get('/boom').set('Authorization', 'Bearer secret-token-xyz');

    const calls = (logger.error as any).mock.calls;
    const logged = JSON.stringify(calls[0]);
    expect(logged).not.toContain('secret-token-xyz');
  });
});
```

- [ ] **Step 5: Run the integration test**

Run: `cd server && npx vitest run src/test/integration/errorHandler.redaction.test.ts`
Expected: 2 passing.

- [ ] **Step 6: Commit**

```bash
git add server/src/middleware/errorHandler.ts server/src/test/integration/errorHandler.redaction.test.ts
git commit -m "fix(server): redact req.body/query/headers in error logs

Closes: N-C2"
```

### Task 2.3: Create the `regex` utility (TDD)

**Files:**
- Create: `server/src/utils/regex.ts`
- Create: `server/src/test/unit/utils/regex.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/src/test/unit/utils/regex.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { escapeRegex, safeSearchRegex } from '../../../utils/regex';

describe('escapeRegex', () => {
  it('escapes regex metacharacters', () => {
    expect(escapeRegex('a.b*c+d?')).toBe('a\\.b\\*c\\+d\\?');
    expect(escapeRegex('(x)[y]{z}|w')).toBe('\\(x\\)\\[y\\]\\{z\\}\\|w');
    expect(escapeRegex('^start$')).toBe('\\^start\\$');
    expect(escapeRegex('back\\slash')).toBe('back\\\\slash');
  });

  it('passes plain text through unchanged', () => {
    expect(escapeRegex('hello world')).toBe('hello world');
    expect(escapeRegex('öğrenci')).toBe('öğrenci');
  });
});

describe('safeSearchRegex', () => {
  it('returns null for empty / whitespace input', () => {
    expect(safeSearchRegex('')).toBeNull();
    expect(safeSearchRegex('   ')).toBeNull();
  });

  it('returns null when input exceeds maxLength', () => {
    expect(safeSearchRegex('a'.repeat(101))).toBeNull();
    expect(safeSearchRegex('a'.repeat(50), { maxLength: 10 })).toBeNull();
  });

  it('returns a case-insensitive RegExp for valid input', () => {
    const re = safeSearchRegex('Ada');
    expect(re).toBeInstanceOf(RegExp);
    expect(re!.test('ada lovelace')).toBe(true);
    expect(re!.flags).toContain('i');
  });

  it('escapes metacharacters so search literal works', () => {
    const re = safeSearchRegex('user.id');
    expect(re).toBeInstanceOf(RegExp);
    expect(re!.test('user.id')).toBe(true);
    expect(re!.test('userXid')).toBe(false);
  });

  it('handles Turkish characters', () => {
    const re = safeSearchRegex('Öğrenci');
    expect(re!.test('öğrenci no 5')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, verify failure**

Run: `cd server && npx vitest run src/test/unit/utils/regex.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `regex.ts`**

Create `server/src/utils/regex.ts`:

```ts
const META_RE = /[.*+?^${}()|[\]\\]/g;

export function escapeRegex(input: string): string {
  return input.replace(META_RE, '\\$&');
}

export interface SafeSearchOptions {
  maxLength?: number;
}

const DEFAULT_MAX_LENGTH = 100;

/**
 * Build a case-insensitive RegExp suitable for $regex queries.
 * Returns null when the trimmed input is empty or exceeds `maxLength`
 * (default 100). Callers must treat null as "no search" (e.g. skip the
 * filter, or return an empty result set).
 *
 * Closes the residual ReDoS surface called out by N-H3 / N-M8 in the
 * 2026-04-29 review.
 */
export function safeSearchRegex(
  input: string,
  opts: SafeSearchOptions = {},
): RegExp | null {
  const max = opts.maxLength ?? DEFAULT_MAX_LENGTH;
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > max) return null;
  return new RegExp(escapeRegex(trimmed), 'i');
}
```

- [ ] **Step 4: Re-run test, verify pass**

Run: `cd server && npx vitest run src/test/unit/utils/regex.test.ts`
Expected: 7 passing.

- [ ] **Step 5: Commit**

```bash
git add server/src/utils/regex.ts server/src/test/unit/utils/regex.test.ts
git commit -m "feat(server): add safeSearchRegex utility (escape + length cap)

Foundation for: N-H3, N-M8"
```

### Task 2.4: Migrate `routes/User.ts` to shared utility

**Files:**
- Modify: `server/src/routes/User.ts:5-18, 139-152`

- [ ] **Step 1: Replace inline `escapeRegex` import**

In `server/src/routes/User.ts`, remove the local `escapeRegex` function (lines 15-18) and import from the new utility instead. Add to the existing imports near the top:

```ts
import { safeSearchRegex } from '../utils/regex';
```

Then delete:

```ts
// Regex özel karakterlerini escape et (ReDoS/injection koruması)
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

- [ ] **Step 2: Replace the search filter block**

In the same file, the block at lines 139-152 currently looks like:

```ts
if (search) {
  const rawSearch = String(search).trim();
  if (rawSearch.length > 100) {
    return res.status(400).json({ error: 'Arama terimi çok uzun (en fazla 100 karakter)' });
  }
  const safeSearch = escapeRegex(rawSearch);
  filter.$or = [
    { adSoyad: { $regex: safeSearch, $options: 'i' } },
    { id: { $regex: safeSearch, $options: 'i' } },
  ];
}
```

Replace with:

```ts
if (search) {
  const re = safeSearchRegex(String(search));
  if (re === null) {
    // Empty after trim, or > 100 chars — return early with a 400 to
    // preserve the prior contract.
    return res.status(400).json({ error: 'Arama terimi çok uzun (en fazla 100 karakter)' });
  }
  filter.$or = [{ adSoyad: re }, { id: re }];
}
```

- [ ] **Step 3: Type-check + run server tests**

Run in parallel:
- `cd server && npm run type-check`
- `cd server && npm test -- --run`

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/User.ts
git commit -m "refactor(server): use shared safeSearchRegex in User routes

Part of: N-H3 / N-M8 cleanup"
```

### Task 2.5: Apply `safeSearchRegex` to Notes search (N-H3)

**Files:**
- Modify: `server/src/routes/Notes.ts:920-940`

- [ ] **Step 1: Add import**

In `server/src/routes/Notes.ts`, add to the existing imports:

```ts
import { safeSearchRegex } from '../utils/regex';
```

- [ ] **Step 2: Patch the search handler**

The block currently around lines 920-940 looks like:

```ts
const { q, semester, academicYear } = req.query;

if (!q) {
  res.status(400).json({ success: false, error: 'Arama terimi gerekli' });
  return;
}

const role = req.user?.role;
const userId = req.user?.userId;

const filter: any = {
  isActive: true,
  $or: [
    { studentId: { $regex: q, $options: 'i' } },
    { lesson: { $regex: q, $options: 'i' } },
    { description: { $regex: q, $options: 'i' } },
  ],
};
```

Replace with:

```ts
const { q, semester, academicYear } = req.query;

if (!q) {
  res.status(400).json({ success: false, error: 'Arama terimi gerekli' });
  return;
}

// N-H3: cap length and escape metacharacters before piping into $regex.
const searchRe = safeSearchRegex(String(q));
if (searchRe === null) {
  res.status(400).json({ success: false, error: 'Arama terimi geçersiz veya çok uzun (≤100 karakter)' });
  return;
}

const role = req.user?.role;
const userId = req.user?.userId;

const filter: any = {
  isActive: true,
  $or: [
    { studentId: searchRe },
    { lesson: searchRe },
    { description: searchRe },
  ],
};
```

- [ ] **Step 3: Add a regression test**

Create `server/src/test/unit/routes/notesSearch.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { safeSearchRegex } from '../../../utils/regex';

describe('Notes search input handling (N-H3)', () => {
  it('rejects > 100-char search', () => {
    expect(safeSearchRegex('a'.repeat(101))).toBeNull();
  });

  it('escapes regex metacharacters from caller input', () => {
    const re = safeSearchRegex('.*');
    expect(re).toBeInstanceOf(RegExp);
    // The literal string ".*" should match itself, not match arbitrary text.
    expect(re!.test('.*')).toBe(true);
    expect(re!.test('xyz')).toBe(false);
  });
});
```

(The handler itself is exercised by existing integration tests; this unit test pins the contract of the helper as used by Notes.)

- [ ] **Step 4: Run the new test + full server suite**

Run: `cd server && npx vitest run src/test/unit/routes/notesSearch.test.ts && npm test -- --run`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/Notes.ts server/src/test/unit/routes/notesSearch.test.ts
git commit -m "fix(server): sanitize Notes search query (escape + length cap)

Closes: N-H3"
```

### Task 2.6: Apply `safeSearchRegex` to userService search (N-M8)

**Files:**
- Modify: `server/src/modules/users/services/userService.ts:34-40, 219-228`

- [ ] **Step 1: Add import**

At the top of `server/src/modules/users/services/userService.ts`:

```ts
import { safeSearchRegex } from '../../../utils/regex';
```

- [ ] **Step 2: Patch `getAllUsers` search block (lines 34-40)**

Replace:

```ts
if (search) {
  query.$or = [
    { adSoyad: { $regex: search, $options: 'i' } },
    { id: { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
  ];
}
```

With:

```ts
if (search) {
  const re = safeSearchRegex(search);
  if (re !== null) {
    query.$or = [{ adSoyad: re }, { id: re }, { email: re }];
  }
  // Silently drop the filter when re is null (>100 chars or empty);
  // listing endpoints prefer permissive behavior over a 400.
}
```

- [ ] **Step 3: Patch `searchUsers` (lines 219-228)**

Replace the body of `searchUsers` so its `searchQuery.$or` uses `safeSearchRegex`. Specifically, change:

```ts
const searchQuery: any = {
  $or: [
    { adSoyad: { $regex: query, $options: 'i' } },
    { id: { $regex: query, $options: 'i' } },
    { email: { $regex: query, $options: 'i' } },
  ],
  isActive: true,
};
```

To:

```ts
const re = safeSearchRegex(query);
if (re === null) {
  // Empty / too-long input → no results rather than running an unbounded scan.
  return [];
}
const searchQuery: any = {
  $or: [{ adSoyad: re }, { id: re }, { email: re }],
  isActive: true,
};
```

- [ ] **Step 4: Run full server tests**

Run: `cd server && npm test -- --run`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/users/services/userService.ts
git commit -m "fix(server): sanitize userService search (escape + length cap)

Closes: N-M8"
```

### Task 2.7: Migrate User schema to `select: false` for sifre (N-H4)

**Files:**
- Modify: `server/src/models/User.ts:76-80`

- [ ] **Step 1: Patch the schema**

In `server/src/models/User.ts` lines 76-80, replace:

```ts
sifre: {
  type: String,
  // Deprecated - artık TCKN kullanılacak, geriye dönük uyumluluk için bırakıldı
  // Şifre validasyonu kaldırıldı
},
```

With:

```ts
sifre: {
  type: String,
  // N-H4: defense in depth. Casual finds (homework, calendar, etc.) used
  // to receive the bcrypt hash whether they wanted it or not. With
  // `select: false`, the field is omitted unless the caller opts in via
  // `.select('+sifre')`. Auth, password-change, and admin reset paths
  // do that explicitly; everything else now silently stops carrying the
  // hash, which is the desired behaviour.
  select: false,
},
```

- [ ] **Step 2: Run server test suite to surface failures**

Run: `cd server && npm test -- --run 2>&1 | tee /tmp/sifre-migration.log`

Expected: many failures in tests that currently rely on `user.sifre` being populated. Each failure points at a callsite that needs `.select('+sifre')`.

- [ ] **Step 3: Add `.select('+sifre')` at the read callsites**

The audit (verified via `grep -n '\.sifre' server/src --include='*.ts'`) classifies each access:

- **Reads** of `user.sifre` (require `.select('+sifre')` on the preceding find): `authService.ts:88-103`, `utils/api.ts:17-19`.
- **Writes** to `user.sifre = ...` followed by `user.save()` work without `.select` because Mongoose tracks set-then-save on individual paths regardless of initial selection.
- **Spread/destructure** like `const { sifre, ...rest } = user.toObject()` returns `undefined` for sifre when not selected — that's the desired behavior (sifre absent from response payload).

Concrete edits required:

| File | Action |
|---|---|
| `server/src/modules/auth/services/authService.ts:61` | `User.findOne({ id, isActive: true })` → `User.findOne({ id, isActive: true }).select('+sifre')` (login bcrypt.compare needs the hash) |
| `server/src/utils/api.ts` | Whichever `User.findOne` precedes the `user.sifre` access at lines 17/19 — add `.select('+sifre')` |

For documentation/intent, the password-admin write paths can also opt-in (no behavior change, but signals that `user.sifre = ...` is deliberate):

| File | Action (optional but recommended) |
|---|---|
| `server/src/modules/passwordAdmin/passwordAdminService.ts:31` (`loadUserOrThrow`) | `User.findOne({ id: userId })` → `User.findOne({ id: userId }).select('+sifre')` |

Leave the rest of the User.findOne callsites alone — they don't read sifre, and with `select: false` they correctly stop carrying the hash.

For each, change e.g.:

```ts
const user = await User.findOne({ id, isActive: true });
```

To:

```ts
const user = await User.findOne({ id, isActive: true }).select('+sifre');
```

- [ ] **Step 4: Re-run server tests**

Run: `cd server && npm test -- --run`
Expected: all tests pass. If a test fails because a fixture asserted `user.sifre` was returned by a non-auth endpoint, that test should be updated to assert the field is **absent** — the migration is working.

- [ ] **Step 5: Add an explicit test for the schema default**

Append to `server/src/test/models/User.test.ts` (or create if it doesn't exist):

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { User } from '../../models/User';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';

describe('User schema sifre `select: false` (N-H4)', () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it('omits sifre by default on find', async () => {
    await User.create({
      id: 't1',
      adSoyad: 'Test',
      rol: 'student',
      sifre: await bcrypt.hash('pw', 4),
      emailVerified: false,
      pansiyon: false,
      childId: [],
      tokenVersion: 0,
      isActive: true,
      kvkkConsent: false,
      twoFactorEnabled: false,
      twoFactorAttempts: 0,
      failedLoginAttempts: 0,
      isLocked: false,
      loginCount: 0,
    });
    const u = await User.findOne({ id: 't1' });
    expect(u).toBeTruthy();
    expect((u as any).sifre).toBeUndefined();
  });

  it('returns sifre when explicitly selected', async () => {
    const u = await User.findOne({ id: 't1' }).select('+sifre');
    expect((u as any).sifre).toMatch(/^\$2[abxy]?\$/);
  });
});
```

(If `mongodb-memory-server` is not already a dev dep, install it: `cd server && npm install --save-dev mongodb-memory-server` — but check `server/package.json` first; if it's already used in other tests, no install needed.)

- [ ] **Step 6: Run the new model test**

Run: `cd server && npx vitest run src/test/models/User.test.ts`
Expected: 2 new passing tests (plus any pre-existing).

- [ ] **Step 7: Manual smoke (developer-only)**

If a local server is available:
1. Start: `npm run dev:server` + `docker-compose up -d` (mongo+redis).
2. POST `/api/auth/login` with valid credentials → 200, login works.
3. POST `/api/auth/login` with invalid → 401 (and check that auth log entry shows `password: '[REDACTED]'`).
4. Hit any non-auth endpoint that returns a User (e.g. `/api/users` as admin) → response has no `sifre` field.

- [ ] **Step 8: Commit**

```bash
git add server/src/models/User.ts \
        server/src/modules/auth/services/authService.ts \
        server/src/modules/passwordAdmin/passwordAdminService.ts \
        server/src/utils/api.ts \
        server/src/test/models/User.test.ts
git commit -m "fix(server): User.sifre select:false; opt-in via .select('+sifre')

Closes: N-H4"
```

### Task 2.8: Push, open PR, verify CI green

- [ ] **Step 1: Push**

```bash
git push -u origin fix/security-cross-cutting
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "fix(security): redact error logs, sanitize $regex, User.sifre select:false" --body "$(cat <<'EOF'
## Summary
- `redactSensitive` utility deep-clones + redacts password/token/secret keys before logging (N-C2)
- Apply in `errorHandler.ts` for `req.body`, `req.query`, headers (allowlist)
- `safeSearchRegex` shared util (escape + length cap); migrate `User.ts`, `Notes.ts`, `userService.ts` (N-H3, N-M8)
- `User.sifre` becomes `select: false`; opt-in callsites updated in auth, password-admin, userService, api utils (N-H4)

## Test plan
- [ ] CI green
- [ ] `vitest run src/test/unit/utils/redaction.test.ts` — 8 passing
- [ ] `vitest run src/test/unit/utils/regex.test.ts` — 7 passing
- [ ] `vitest run src/test/integration/errorHandler.redaction.test.ts` — 2 passing
- [ ] `vitest run src/test/models/User.test.ts` — sifre omit + opt-in tests passing
- [ ] Manual: login still works after select:false migration
- [ ] Manual: non-auth endpoints no longer return `sifre`

Closes: N-C2, N-H3, N-M8, N-H4
EOF
)"
```

- [ ] **Step 3: Wait for CI; merge when green**

```bash
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main && git pull
```

---

## PR #3 — Password admin hardening (`feat/password-admin-hardening`)

### Task 3.0: Branch from up-to-date main

- [ ] **Step 1: Branch (after PR #2 merged)**

```bash
git checkout main && git pull
git checkout -b feat/password-admin-hardening
```

### Task 3.1: Extend `PasswordImportBatch` to carry the credentials buffer

**Files:**
- Modify: `server/src/models/PasswordImportBatch.ts`

- [ ] **Step 1: Add `credentialsXlsx` field**

In `server/src/models/PasswordImportBatch.ts`, change the interface to add:

```ts
credentialsXlsx?: Buffer;
credentialsFilename?: string;
```

…inside `IPasswordImportBatch` (alongside the existing fields).

In the schema definition, add inside the schema object (e.g., after `cancelledAt: Date`):

```ts
// N-C1: bulk-import XLSX is held on the batch document instead of being
// returned in JSON. Cleared (`$unset`) when the batch transitions to
// activated/cancelled by the atomic findOneAndUpdate flows.
credentialsXlsx: { type: Buffer, select: false },
credentialsFilename: { type: String, select: false },
```

(`select: false` so a casual `find()` doesn't haul the XLSX into memory.)

- [ ] **Step 2: Type-check**

Run: `cd server && npm run type-check`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add server/src/models/PasswordImportBatch.ts
git commit -m "feat(server): add credentialsXlsx field to PasswordImportBatch (N-C1 prep)"
```

### Task 3.2: Add TTL index to `PasswordAuditLog` (N-L4)

**Files:**
- Modify: `server/src/models/PasswordAuditLog.ts`

- [ ] **Step 1: Add the TTL index**

Append to `server/src/models/PasswordAuditLog.ts` after the existing `index(...)` calls (around line 58):

```ts
// N-L4: KVKK retention. Audit log auto-purges after 365 days. The TTL
// monitor runs at most once a minute, so deletes lag the boundary
// slightly — acceptable for a 1-year window.
PasswordAuditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 365 * 24 * 3600 },
);
```

- [ ] **Step 2: Verify it compiles**

Run: `cd server && npm run type-check`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add server/src/models/PasswordAuditLog.ts
git commit -m "feat(server): TTL index on PasswordAuditLog (365d retention)

Closes: N-L4"
```

### Task 3.3: Cap import row count at 500 (N-M2)

**Files:**
- Modify: `server/src/modules/passwordAdmin/classListParser.ts`
- Modify: `server/src/modules/passwordAdmin/__tests__/classListParser.test.ts` (if exists; else create)

- [ ] **Step 1: Add the cap to the parser**

In `server/src/modules/passwordAdmin/classListParser.ts`, add a constant near the top (after imports):

```ts
const MAX_IMPORT_ROWS = 500;
```

In the parser's main loop (after `rows.push({ ... })` near line 90-97), add before the `return`:

```ts
if (rows.length > MAX_IMPORT_ROWS) {
  warnings.push(`En fazla ${MAX_IMPORT_ROWS} öğrenci içe aktarılabilir; ${rows.length} satır bulundu.`);
  rows.length = MAX_IMPORT_ROWS;
}
```

(Truncate-with-warning, not throw — preview/commit both go through this; an admin previewing a 600-row file should see the warning, then trim before committing. The commit path will also error out below.)

In `passwordAdminService.ts`, in `bulkImportClassList`, add a hard check after `parseClassListFile` succeeds:

```ts
const { rows, warnings } = parseClassListFile(input.fileBuffer);
if (rows.length === 0) {
  const err: NodeJS.ErrnoException = new Error('Dosyada içe aktarılacak satır yok');
  err.code = 'EMPTY_IMPORT';
  throw err;
}
// rows is already truncated to <= MAX_IMPORT_ROWS by the parser; warnings
// surface the truncation to the admin.
```

- [ ] **Step 2: Add a unit test for the truncation**

Append to `server/src/modules/passwordAdmin/__tests__/classListParser.test.ts` (create the file if absent):

```ts
import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseClassListFile } from '../classListParser';

function buildClassListXls(numRows: number): Buffer {
  const data: any[][] = [['9. Sınıf / A Şubesi 2026 Sınıf Listesi']];
  for (let i = 1; i <= numRows; i++) {
    data.push([i, `2026${i.toString().padStart(4, '0')}`, '', `Ad${i}`, '', '', '', `Soyad${i}`, '', '', '', '', '', '']);
  }
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

describe('parseClassListFile row cap (N-M2)', () => {
  it('truncates at 500 rows with a warning', () => {
    const buf = buildClassListXls(600);
    const { rows, warnings } = parseClassListFile(buf);
    expect(rows.length).toBe(500);
    expect(warnings.some((w) => w.includes('500'))).toBe(true);
  });

  it('does not warn when under the cap', () => {
    const buf = buildClassListXls(50);
    const { rows, warnings } = parseClassListFile(buf);
    expect(rows.length).toBe(50);
    expect(warnings.some((w) => w.includes('500'))).toBe(false);
  });
});

// Note: Task 3.7 Step 5 extracts buildClassListXls into
// server/src/test/helpers/buildClassListXls.ts and imports it here.
```

- [ ] **Step 3: Run test**

Run: `cd server && npx vitest run src/modules/passwordAdmin/__tests__/classListParser.test.ts`
Expected: passing (including any pre-existing tests in that file).

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/passwordAdmin/classListParser.ts \
        server/src/modules/passwordAdmin/passwordAdminService.ts \
        server/src/modules/passwordAdmin/__tests__/classListParser.test.ts
git commit -m "feat(server): cap class-list import at 500 rows

Closes: N-M2"
```

### Task 3.4: Make batch state transitions atomic (N-H2)

**Files:**
- Modify: `server/src/modules/passwordAdmin/passwordAdminService.ts:203-228, 287-296`

- [ ] **Step 1: Replace `loadPendingBatchOrThrow` callers with atomic transitions**

In `passwordAdminService.ts`, replace `activateImportBatch` (lines 218-228):

```ts
export async function activateImportBatch(input: {
  batchId: string;
  admin: AdminContext;
}): Promise<{ activated: number }> {
  // N-H2: atomic compare-and-swap on status. Two concurrent requests can
  // no longer both pass the status check.
  const updated = await PasswordImportBatch.findOneAndUpdate(
    { batchId: input.batchId, status: 'pending' },
    {
      $set: { status: 'activated', activatedAt: new Date() },
      $unset: { credentialsXlsx: '', credentialsFilename: '' },
    },
    { new: true },
  );
  if (!updated) {
    const err: NodeJS.ErrnoException = new Error(
      `Batch bulunamadı veya zaten işlenmiş: ${input.batchId}`,
    );
    err.code = 'BATCH_NOT_PENDING';
    throw err;
  }
  await User.updateMany(
    { importBatchId: updated.batchId },
    { $set: { isActive: true } },
  );
  return { activated: updated.userIds.length };
}
```

Replace `cancelImportBatch` (lines 287-297):

```ts
export async function cancelImportBatch(input: {
  batchId: string;
  admin: AdminContext;
}): Promise<{ cancelled: number }> {
  const updated = await PasswordImportBatch.findOneAndUpdate(
    { batchId: input.batchId, status: 'pending' },
    {
      $set: { status: 'cancelled', cancelledAt: new Date() },
      $unset: { credentialsXlsx: '', credentialsFilename: '' },
    },
    { new: true },
  );
  if (!updated) {
    const err: NodeJS.ErrnoException = new Error(
      `Batch bulunamadı veya zaten işlenmiş: ${input.batchId}`,
    );
    err.code = 'BATCH_NOT_PENDING';
    throw err;
  }
  await User.deleteMany({ importBatchId: updated.batchId });
  return { cancelled: updated.userIds.length };
}
```

- [ ] **Step 2: Add a concurrency test**

Append to `server/src/modules/passwordAdmin/__tests__/passwordAdminService.test.ts`:

```ts
import { activateImportBatch, bulkImportClassList } from '../passwordAdminService';
import { PasswordImportBatch } from '../../../models/PasswordImportBatch';

describe('batch atomic transitions (N-H2)', () => {
  it('two concurrent activate calls — exactly one succeeds', async () => {
    // Arrange: a known-pending batch (insert directly).
    const batchId = 'test-batch-' + Date.now();
    await PasswordImportBatch.create({
      batchId,
      adminId: 'admin1',
      userIds: [],
      totalCount: 0,
      status: 'pending',
    });

    const admin = { id: 'admin1', adSoyad: 'Test Admin' };
    const results = await Promise.allSettled([
      activateImportBatch({ batchId, admin }),
      activateImportBatch({ batchId, admin }),
    ]);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);
    expect((failures[0] as PromiseRejectedResult).reason.code).toBe('BATCH_NOT_PENDING');
  });
});
```

(The existing `passwordAdminService.test.ts` should already have a Mongo-memory-server `beforeAll` setup; if not, copy the boilerplate from `User.test.ts` from PR #2 Task 2.7.)

- [ ] **Step 3: Run the test**

Run: `cd server && npx vitest run src/modules/passwordAdmin/__tests__/passwordAdminService.test.ts`
Expected: pass, including the new concurrency test.

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/passwordAdmin/passwordAdminService.ts \
        server/src/modules/passwordAdmin/__tests__/passwordAdminService.test.ts
git commit -m "fix(server): atomic findOneAndUpdate for batch activate/cancel

Closes: N-H2"
```

### Task 3.5: Make regenerate transactional (N-H5)

> Note: this task changes regenerate to return `{ credentialsRows, failures }`. Task 3.7 then changes it again to persist the XLSX on the batch and return `{ imported, failures, credentialsFilename }`. Do them in order — 3.5 first to establish the transactional core, then 3.7 to swap the return shape.

**Files:**
- Modify: `server/src/modules/passwordAdmin/passwordAdminService.ts:230-285`

- [ ] **Step 1: Replace the regenerate body**

Replace `regenerateImportBatchPasswords`:

```ts
export interface RegenerateResult {
  credentialsRows: CredentialsRow[];
  failures: { userId: string; error: string }[];
}

export async function regenerateImportBatchPasswords(input: {
  batchId: string;
  admin: AdminContext;
}): Promise<RegenerateResult> {
  // N-H5: previously a Promise.all of updateOne could partially fail and
  // still return a "complete" XLSX. Use bulkWrite + a session when
  // available so partial failures roll back; if the deployment isn't a
  // replica set, fall back to per-row reporting without rollback.
  const batch = await PasswordImportBatch.findOne({
    batchId: input.batchId,
    status: 'pending',
  });
  if (!batch) {
    const err: NodeJS.ErrnoException = new Error(
      `Batch bulunamadı veya bekleyen durumda değil: ${input.batchId}`,
    );
    err.code = 'BATCH_NOT_PENDING';
    throw err;
  }

  const users = await User.find({ importBatchId: batch.batchId })
    .select('+sifre')
    .lean();
  const now = new Date();

  const entries = await Promise.all(
    users.map(async (user) => {
      const pw = generatePassword();
      const hash = await bcrypt.hash(pw, BCRYPT_ROUNDS);
      return { user, pw, hash };
    }),
  );

  const ops = entries.map(({ user, hash }) => ({
    updateOne: {
      filter: { id: user.id },
      update: {
        $set: { sifre: hash, passwordLastSetAt: now },
        $inc: { tokenVersion: 1 },
      },
    },
  }));

  const session = await mongoose.startSession();
  let succeededIds: string[];
  let failures: { userId: string; error: string }[] = [];
  try {
    session.startTransaction();
    const result = await User.bulkWrite(ops, { ordered: true, session });
    if (result.matchedCount !== users.length) {
      throw new Error(
        `bulkWrite matched ${result.matchedCount}/${users.length}; rolling back`,
      );
    }
    await session.commitTransaction();
    succeededIds = users.map((u) => u.id);
  } catch (txErr) {
    // Replica-set required for transactions. On standalone Mongo the
    // commit will throw with code 20 — fall back to non-transactional
    // bulkWrite and report failures.
    await session.abortTransaction().catch(() => undefined);
    const fallback = await User.bulkWrite(ops, { ordered: false });
    succeededIds = users
      .filter((_u, i) => i < (fallback.matchedCount ?? 0))
      .map((u) => u.id);
    failures = users
      .filter((u) => !succeededIds.includes(u.id))
      .map((u) => ({ userId: u.id, error: 'bulkWrite did not match' }));
    void txErr;
  } finally {
    session.endSession();
  }

  // Audit log — best-effort, separate from the credential write.
  await Promise.all(
    entries
      .filter(({ user }) => succeededIds.includes(user.id))
      .map(({ user }) =>
        recordPasswordEvent({
          user: { id: user.id, adSoyad: user.adSoyad, rol: user.rol },
          admin: { id: input.admin.id, adSoyad: input.admin.adSoyad },
          action: 'admin_reset',
          reason: 'bulk_import',
          batchId: batch.batchId,
          ip: input.admin.ip,
          userAgent: input.admin.userAgent,
        }),
      ),
  );

  const credentialsRows: CredentialsRow[] = entries
    .filter(({ user }) => succeededIds.includes(user.id))
    .map(({ user, pw }) => ({
      id: user.id,
      adSoyad: user.adSoyad,
      rol: user.rol,
      sinif: user.sinif,
      sube: user.sube,
      pansiyon: (user.pansiyon as boolean) ?? false,
      password: pw,
    }));

  return { credentialsRows, failures };
}
```

Add the import at the top of the file:

```ts
import mongoose from 'mongoose';
```

- [ ] **Step 2: Type-check + run tests**

Run: `cd server && npm run type-check && npm test -- --run`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/passwordAdmin/passwordAdminService.ts
git commit -m "fix(server): transactional regenerate with partial-failure surfacing

Closes: N-H5"
```

### Task 3.6: Tighten in-memory password lifetime (N-M3) + clear after XLSX build

**Files:**
- Modify: `server/src/modules/passwordAdmin/passwordAdminService.ts:163-200`

- [ ] **Step 1: Patch `bulkImportClassList`**

Update the trailing portion of `bulkImportClassList` so the `passwords` Map is cleared as soon as `credentialsRows` is built:

```ts
export async function bulkImportClassList(input: BulkImportInput): Promise<BulkImportResult> {
  const { rows, warnings } = parseClassListFile(input.fileBuffer);
  if (rows.length === 0) {
    const err: NodeJS.ErrnoException = new Error('Dosyada içe aktarılacak satır yok');
    err.code = 'EMPTY_IMPORT';
    throw err;
  }
  const batchId = randomUUID();
  const { written, skipped, passwords } = await writeUsersForBatch(batchId, rows);

  await Promise.all(
    written.map((r) =>
      recordPasswordEvent({
        user: { id: r.id, adSoyad: r.adSoyad, rol: r.rol },
        admin: { id: input.admin.id, adSoyad: input.admin.adSoyad },
        action: 'bulk_import',
        reason: 'bulk_import',
        batchId,
        ip: input.admin.ip,
        userAgent: input.admin.userAgent,
      }),
    ),
  );

  const credentialsRows: CredentialsRow[] = written.map((r) => ({
    id: r.id,
    adSoyad: r.adSoyad,
    rol: r.rol,
    sinif: r.sinif,
    sube: r.sube,
    pansiyon: r.pansiyon,
    password: passwords.get(r.id)!,
  }));

  // N-M3: passwords are now in credentialsRows; the Map can go.
  passwords.clear();

  await PasswordImportBatch.create({
    batchId,
    adminId: input.admin.id,
    userIds: written.map((r) => r.id),
    totalCount: written.length,
    status: 'pending',
  });

  return { batchId, credentialsRows, skipped, warnings };
}
```

- [ ] **Step 2: Run tests**

Run: `cd server && npx vitest run src/modules/passwordAdmin`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/passwordAdmin/passwordAdminService.ts
git commit -m "fix(server): clear in-memory password map after building credentials

Closes: N-M3"
```

### Task 3.7: Backend N-C1 — store XLSX on batch, add download route, drop base64 from JSON

**Files:**
- Modify: `server/src/modules/passwordAdmin/passwordAdminService.ts` (bulk import + regenerate now persist XLSX on batch)
- Modify: `server/src/modules/passwordAdmin/passwordAdminController.ts` (drop `credentialsFileBase64`; add downloadCredentialsXlsx)
- Modify: `server/src/modules/passwordAdmin/passwordAdminRoutes.ts` (add download route)

- [ ] **Step 1: Persist XLSX on the batch in `bulkImportClassList`**

In `passwordAdminService.ts`, change the `BulkImportResult` interface and `bulkImportClassList` so the XLSX is built inside the service and stored on the batch:

```ts
export interface BulkImportResult {
  batchId: string;
  imported: number;
  skipped: string[];
  warnings: string[];
  credentialsFilename: string;
}
```

Update `bulkImportClassList` end-of-function:

```ts
const credentialsRows: CredentialsRow[] = written.map((r) => ({
  id: r.id,
  adSoyad: r.adSoyad,
  rol: r.rol,
  sinif: r.sinif,
  sube: r.sube,
  pansiyon: r.pansiyon,
  password: passwords.get(r.id)!,
}));
passwords.clear();

const xlsx = await buildCredentialsXlsx(credentialsRows);
const credentialsFilename = `credentials-${new Date()
  .toISOString()
  .slice(0, 10)
  .replace(/-/g, '')}-${batchId}.xlsx`;

await PasswordImportBatch.create({
  batchId,
  adminId: input.admin.id,
  userIds: written.map((r) => r.id),
  totalCount: written.length,
  status: 'pending',
  credentialsXlsx: xlsx,
  credentialsFilename,
});

return {
  batchId,
  imported: written.length,
  skipped,
  warnings,
  credentialsFilename,
};
```

Add the import at the top:

```ts
import { buildCredentialsXlsx } from './credentialsExporter';
```

Now do the same for `regenerateImportBatchPasswords` — change its return type and the body of the function so the XLSX is persisted on the batch and the return value carries `credentialsFilename` + `failures` instead of `credentialsRows`. Replace the existing function body's tail (everything after `succeededIds`/`failures` are computed) with:

```ts
  const successfulEntries = entries.filter(({ user }) => succeededIds.includes(user.id));

  await Promise.all(
    successfulEntries.map(({ user }) =>
      recordPasswordEvent({
        user: { id: user.id, adSoyad: user.adSoyad, rol: user.rol },
        admin: { id: input.admin.id, adSoyad: input.admin.adSoyad },
        action: 'admin_reset',
        reason: 'bulk_import',
        batchId: batch.batchId,
        ip: input.admin.ip,
        userAgent: input.admin.userAgent,
      }),
    ),
  );

  const credentialsRows: CredentialsRow[] = successfulEntries.map(({ user, pw }) => ({
    id: user.id,
    adSoyad: user.adSoyad,
    rol: user.rol,
    sinif: user.sinif,
    sube: user.sube,
    pansiyon: (user.pansiyon as boolean) ?? false,
    password: pw,
  }));

  // Build & persist the XLSX, then drop plaintext from memory.
  const xlsx = await buildCredentialsXlsx(credentialsRows);
  credentialsRows.length = 0;
  const credentialsFilename = `credentials-regen-${new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '')}-${batch.batchId}.xlsx`;
  await PasswordImportBatch.findOneAndUpdate(
    { batchId: batch.batchId },
    { $set: { credentialsXlsx: xlsx, credentialsFilename } },
  );

  return {
    imported: succeededIds.length,
    failures,
    credentialsFilename,
  };
}
```

Also update `RegenerateResult`:

```ts
export interface RegenerateResult {
  imported: number;
  failures: { userId: string; error: string }[];
  credentialsFilename: string;
}
```

- [ ] **Step 2: Add a `downloadCredentialsXlsx` service function**

Append to `passwordAdminService.ts`:

```ts
export async function loadBatchCredentialsXlsx(
  batchId: string,
): Promise<{ buffer: Buffer; filename: string } | null> {
  const batch = await PasswordImportBatch.findOne({ batchId, status: 'pending' })
    .select('+credentialsXlsx +credentialsFilename')
    .lean();
  if (!batch || !batch.credentialsXlsx || !batch.credentialsFilename) return null;
  return {
    buffer: Buffer.from(batch.credentialsXlsx as Buffer),
    filename: batch.credentialsFilename,
  };
}
```

- [ ] **Step 3: Update controller — drop base64, add download handler**

Replace `bulkImport` in `passwordAdminController.ts`:

```ts
export async function bulkImport(req: Request, res: Response) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Dosya yüklenmedi' });
    const admin = await getAdminContext(req);

    if (req.query.preview === 'true') {
      const preview = await previewClassList(req.file.buffer);
      return res.json({
        total: preview.rows.length,
        warnings: preview.warnings,
        existingIds: preview.existingIds,
        sample: preview.rows.slice(0, 20),
        classDistribution: preview.rows.reduce<Record<string, number>>((acc, r) => {
          const k = `${r.sinif}${r.sube}`;
          acc[k] = (acc[k] ?? 0) + 1;
          return acc;
        }, {}),
      });
    }

    const result = await bulkImportClassList({ fileBuffer: req.file.buffer, admin });
    setNoStore(res);
    res.json({
      batchId: result.batchId,
      imported: result.imported,
      skipped: result.skipped,
      warnings: result.warnings,
      // N-C1: no credentialsFileBase64 in JSON. Frontend follows downloadUrl.
      credentialsFilename: result.credentialsFilename,
      downloadUrl: `/api/admin/passwords/batch/${encodeURIComponent(result.batchId)}/credentials.xlsx`,
    });
  } catch (err) {
    handleServiceError(err, res);
  }
}
```

Replace `regenerateBatch` similarly: drop `credentialsFileBase64`, return `{ imported, credentialsFilename, downloadUrl }`.

Add a new download handler:

```ts
import { loadBatchCredentialsXlsx } from './passwordAdminService';

export async function downloadBatchCredentials(req: Request, res: Response) {
  try {
    const batchId = req.params.batchId;
    const file = await loadBatchCredentialsXlsx(batchId);
    if (!file) {
      return res.status(404).json({ error: 'Bulunamadı veya batch zaten aktif/iptal' });
    }
    setNoStore(res);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`,
    );
    return res.end(file.buffer);
  } catch (err) {
    handleServiceError(err, res);
  }
}
```

- [ ] **Step 4: Wire the route**

In `passwordAdminRoutes.ts`, add the import:

```ts
import { downloadBatchCredentials } from './passwordAdminController';
```

Add the route (place it before the `:batchId` DELETE so order doesn't matter — Express allows method+path overlap):

```ts
router.get(
  '/batch/:batchId/credentials.xlsx',
  validateBatchIdParam,
  downloadBatchCredentials,
);
```

- [ ] **Step 5: Extract the XLS test helper into a shared file**

Create `server/src/test/helpers/buildClassListXls.ts` so both the parser test (Task 3.3) and the new download test can share it:

```ts
import * as XLSX from 'xlsx';

export function buildClassListXls(numRows: number): Buffer {
  const data: any[][] = [['9. Sınıf / A Şubesi 2026 Sınıf Listesi']];
  for (let i = 1; i <= numRows; i++) {
    data.push([
      i,
      `2026${i.toString().padStart(4, '0')}`,
      '',
      `Ad${i}`,
      '',
      '',
      '',
      `Soyad${i}`,
      '',
      '',
      '',
      '',
      '',
      '',
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}
```

Update `classListParser.test.ts` (Task 3.3) to import from this helper instead of defining `buildXls` inline.

- [ ] **Step 6: Add an integration test for the download flow**

Append to `server/src/modules/passwordAdmin/__tests__/passwordAdminService.test.ts`:

```ts
import {
  bulkImportClassList,
  loadBatchCredentialsXlsx,
  activateImportBatch,
} from '../passwordAdminService';
import { buildClassListXls } from '../../../test/helpers/buildClassListXls';

describe('downloadable credentials XLSX (N-C1)', () => {
  it('serves the XLSX while pending and 404s after activation', async () => {
    const buf = buildClassListXls(3);
    const admin = { id: 'admin1', adSoyad: 'Test Admin' };

    const result = await bulkImportClassList({ fileBuffer: buf, admin });
    expect(result.imported).toBe(3);
    expect(result.credentialsFilename).toMatch(/^credentials-\d{8}-/);

    const file = await loadBatchCredentialsXlsx(result.batchId);
    expect(file).not.toBeNull();
    expect(file!.buffer.length).toBeGreaterThan(0);
    expect(file!.filename).toBe(result.credentialsFilename);

    await activateImportBatch({ batchId: result.batchId, admin });

    const fileAfter = await loadBatchCredentialsXlsx(result.batchId);
    expect(fileAfter).toBeNull();
  });
});
```

- [ ] **Step 7: Run all password-admin tests**

Run: `cd server && npx vitest run src/modules/passwordAdmin`
Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add server/src/modules/passwordAdmin/passwordAdminService.ts \
        server/src/modules/passwordAdmin/passwordAdminController.ts \
        server/src/modules/passwordAdmin/passwordAdminRoutes.ts \
        server/src/modules/passwordAdmin/__tests__/passwordAdminService.test.ts \
        server/src/modules/passwordAdmin/__tests__/classListParser.test.ts \
        server/src/test/helpers/buildClassListXls.ts
git commit -m "feat(server): bulk import streams XLSX via download endpoint

Closes: N-C1 (bulk-import path), N-M4"
```

### Task 3.8: Add mild rate limits (N-H1)

**Files:**
- Modify: `server/src/modules/passwordAdmin/passwordAdminRoutes.ts`

- [ ] **Step 1: Add rate-limit middleware**

In `passwordAdminRoutes.ts`, add the import:

```ts
import rateLimit from 'express-rate-limit';
```

Add after the imports, before the router setup:

```ts
// N-H1: generous DoS protection only — admins are trusted operators.
const generalLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
const importLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
```

Apply to the router:

```ts
router.use(authenticateJWT, authorizeRoles(['admin']), generalLimiter);
```

Apply to bulk-import:

```ts
router.post(
  '/bulk-import',
  importLimiter,
  upload.single('file'),
  verifyUploadedFiles,
  bulkImport,
);
```

- [ ] **Step 2: Run server tests**

Run: `cd server && npm test -- --run`
Expected: pass. (The rate-limit middleware should be no-op in test env unless tests fire >100 requests.)

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/passwordAdmin/passwordAdminRoutes.ts
git commit -m "feat(server): mild rate limits on password admin (100/min general, 20/min import)

Closes: N-H1"
```

### Task 3.9: Add multer fileFilter (N-M7)

**Files:**
- Modify: `server/src/modules/passwordAdmin/passwordAdminRoutes.ts`

- [ ] **Step 1: Replace the multer config**

In `passwordAdminRoutes.ts`, replace the multer setup (line 23):

```ts
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    // N-M7: defense in depth alongside verifyUploadedFiles magic-byte check.
    if (/\.(xlsx?|XLSX?)$/.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece XLS / XLSX dosyaları kabul edilir'));
    }
  },
});
```

- [ ] **Step 2: Run tests**

Run: `cd server && npx vitest run src/modules/passwordAdmin`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/passwordAdmin/passwordAdminRoutes.ts
git commit -m "feat(server): multer fileFilter rejects non-XLS uploads

Closes: N-M7"
```

### Task 3.10: Wrap controller handlers in `asyncHandler` (N-M6)

**Files:**
- Modify: `server/src/modules/passwordAdmin/passwordAdminController.ts`
- Modify: `server/src/modules/passwordAdmin/passwordAdminRoutes.ts`

- [ ] **Step 1: Refactor each controller export**

In `passwordAdminController.ts`, the manual try/catch around each handler is doing two things: (a) catching and mapping known service errors via `handleServiceError`, and (b) preventing unhandled rejections. With `express-async-errors` already in place (B-C1), (b) is moot. Keep `handleServiceError` for known-error mapping but stop wrapping every handler.

Refactor pattern: for each handler, extract the body to use `asyncHandler` from `middleware/errorHandler.ts`:

Add the import at the top:

```ts
import { asyncHandler } from '../../middleware/errorHandler';
```

For example, replace `resetPassword`:

```ts
export const resetPassword = asyncHandler(async (req, res) => {
  const admin = await getAdminContext(req);
  try {
    const result = await resetUserPassword({
      userId: req.params.userId,
      admin,
      reason: req.body.reason,
      reasonNote: req.body.reasonNote,
    });
    setNoStore(res);
    res.json({ password: result.password, userId: result.userId });
  } catch (err) {
    handleServiceError(err, res);
  }
});
```

Apply the same shape to `generatePasswordForUser`, `bulkImport`, `activateBatch`, `regenerateBatch`, `cancelBatch`, `pendingBatches`, `auditLog`, `downloadBatchCredentials`.

- [ ] **Step 2: Update routes file (the export shape stays the same — `asyncHandler` returns a regular Express handler)**

No change needed in `passwordAdminRoutes.ts` — `asyncHandler` returns `(req, res, next) => void`, which is the same callable signature.

- [ ] **Step 3: Type-check + run tests**

Run: `cd server && npm run type-check && npm test -- --run`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/passwordAdmin/passwordAdminController.ts
git commit -m "refactor(server): wrap passwordAdmin handlers in asyncHandler

Closes: N-M6"
```

### Task 3.11: Log errors in `handleServiceError` (N-L1)

**Files:**
- Modify: `server/src/modules/passwordAdmin/passwordAdminController.ts:53-57`

- [ ] **Step 1: Add logger import + log call**

At the top of `passwordAdminController.ts`, add:

```ts
import logger from '../../utils/logger';
```

Replace `handleServiceError`:

```ts
function handleServiceError(err: unknown, res: Response) {
  const e = err as NodeJS.ErrnoException;
  const status = httpStatusForCode(e.code);
  // N-L1: previously this branch was silent server-side. Log at warn for
  // expected-but-mapped errors and let unmapped (status 500) escalate.
  if (status >= 500) {
    logger.error('passwordAdmin service error', { code: e.code, message: e.message });
  } else {
    logger.warn('passwordAdmin domain error', { code: e.code, message: e.message });
  }
  res.status(status).json({ error: e.message, code: e.code });
}
```

- [ ] **Step 2: Run tests**

Run: `cd server && npx vitest run src/modules/passwordAdmin`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/passwordAdmin/passwordAdminController.ts
git commit -m "fix(server): log password admin service errors

Closes: N-L1"
```

### Task 3.12: Annotate test fixture passwords (N-L5)

**Files:**
- Modify: `server/src/modules/passwordAdmin/__tests__/credentialsExporter.test.ts:13,22` (or whatever lines hold the literal passwords)

- [ ] **Step 1: Add the comments**

Open `server/src/modules/passwordAdmin/__tests__/credentialsExporter.test.ts`. Above the lines that have `password: 'abc12345'` (or similar), add:

```ts
// fixture only — not a real password (N-L5)
```

- [ ] **Step 2: Commit**

```bash
git add server/src/modules/passwordAdmin/__tests__/credentialsExporter.test.ts
git commit -m "chore(test): annotate fixture passwords as non-secret

Closes: N-L5"
```

### Task 3.13: Frontend NF-H4 — onError toasts in BulkImportTab

**Files:**
- Modify: `client/src/pages/Dashboard/PasswordManagement/BulkImportTab.tsx`

- [ ] **Step 1: Find the toast utility used elsewhere in the codebase**

Run: `grep -rn "toast\." client/src/pages/Dashboard --include='*.tsx' | head -5`
Expected: surfaces the project's toast import (e.g., `react-hot-toast` or a local wrapper). Use whichever the rest of the dashboard uses.

If no toast lib is already in use, add `react-hot-toast`:

```bash
cd client && npm install react-hot-toast
```

…and ensure `<Toaster />` is mounted somewhere in the app shell (`App.tsx` or `ModernDashboardLayout.tsx`). If it isn't, add `<Toaster position="top-right" />` near the top-level layout.

- [ ] **Step 2: Add `onError` handlers**

In `BulkImportTab.tsx`, change `handlePreview` and `handleCommit`:

```ts
import toast from 'react-hot-toast';

const handlePreview = () => {
  if (!file) return;
  previewMut.mutate(file, {
    onSuccess: setPreview,
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'Önizleme başarısız'),
  });
};

const handleCommit = () => {
  if (!file) return;
  commitMut.mutate(file, {
    onSuccess: (res) => {
      // N-C1 frontend: server returns downloadUrl; follow it instead of
      // decoding base64 from the JSON envelope.
      if (res.downloadUrl) {
        window.location.href = res.downloadUrl;
      }
      setFile(null);
      setPreview(null);
      toast.success(`${res.imported ?? 0} öğrenci içe aktarıldı`);
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'İçe aktarma başarısız'),
  });
};
```

Update the type for the commit response — open `client/src/utils/passwordAdminService.ts` and change the bulk-import commit response shape from `{ batchId, imported, credentialsFileBase64, credentialsFilename, ... }` to `{ batchId, imported, skipped, warnings, credentialsFilename, downloadUrl }`. Update the API client function accordingly.

Delete `client/src/pages/Dashboard/PasswordManagement/downloadBase64.ts` if it's no longer referenced (it was only used by `BulkImportTab.handleCommit`):

```bash
grep -rn "downloadBase64" client/src
```

If grep shows zero hits other than the (removed) `BulkImportTab` import, delete the file:

```bash
git rm client/src/pages/Dashboard/PasswordManagement/downloadBase64.ts
```

Remove its import from `BulkImportTab.tsx`.

- [ ] **Step 3: Run client tests + type-check**

Run in parallel:
- `cd client && npm run type-check`
- `cd client && npm test -- --run`

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Dashboard/PasswordManagement/BulkImportTab.tsx \
        client/src/utils/passwordAdminService.ts \
        client/src/pages/Dashboard/PasswordManagement/downloadBase64.ts \
        client/package.json client/package-lock.json
git commit -m "feat(client): bulk import follows downloadUrl + error toasts

Closes: NF-H4, N-C1 (frontend)"
```

### Task 3.14: Frontend NF-M2 — clipboard auto-clear

**Files:**
- Modify: `client/src/pages/Dashboard/PasswordManagement/PasswordRevealModal.tsx`

- [ ] **Step 1: Add the auto-clear timer**

In `PasswordRevealModal.tsx`, replace the body of the component (keep the existing imports, add `useRef`):

```tsx
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Copy, Check, X } from 'lucide-react';

const CLIPBOARD_CLEAR_MS = 60_000;

export interface PasswordRevealModalProps {
  password: string;
  userLabel: string;
  onClose: () => void;
}

export default function PasswordRevealModal({
  password,
  userLabel,
  onClose,
}: PasswordRevealModalProps) {
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [clearedAt, setClearedAt] = useState<number | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clearTimer.current) clearTimeout(clearTimer.current);
      setCopied(false);
      setAcknowledged(false);
    };
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setClearedAt(null);
    if (clearTimer.current) clearTimeout(clearTimer.current);
    clearTimer.current = setTimeout(async () => {
      try {
        await navigator.clipboard.writeText('');
        setClearedAt(Date.now());
      } catch {
        // Some browsers reject programmatic clipboard writes after focus
        // loss; nothing we can do, just leave the indicator unset.
      }
    }, CLIPBOARD_CLEAR_MS);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[var(--paper)] rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={24} />
          <div>
            <h2 className="text-lg font-semibold text-[var(--ink)]">Şifre üretildi</h2>
            <p className="text-sm text-[var(--ink-dim)]">
              <span className="font-medium">{userLabel}</span> için aşağıdaki şifre sadece bir kez
              gösterilir. Şimdi kopyalayın ve güvenli bir yerde saklayın.
            </p>
          </div>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--rule)] rounded p-4 mb-4 font-mono text-xl tracking-wider text-center select-all text-[var(--ink)]">
          {password}
        </div>
        <button
          onClick={handleCopy}
          className="w-full mb-2 flex items-center justify-center gap-2 px-4 py-2 bg-[var(--state)] text-white rounded hover:bg-[var(--state-deep)] transition"
          type="button"
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? 'Kopyalandı' : 'Panoya kopyala'}
        </button>
        {copied && !clearedAt && (
          <p className="text-xs text-[var(--ink-dim)] mb-2 text-center">
            Pano 60 saniye sonra otomatik temizlenecek.
          </p>
        )}
        {clearedAt && (
          <p className="text-xs text-[var(--ink-dim)] mb-2 text-center">Pano temizlendi.</p>
        )}
        <label className="flex items-center gap-2 text-sm text-[var(--ink-dim)] mb-3">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
          />
          Şifreyi kaydettim, bu pencere kapatılabilir.
        </label>
        <button
          onClick={onClose}
          disabled={!acknowledged}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--ink)] text-[var(--paper)] rounded hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
        >
          <X size={18} />
          Kapat
        </button>
      </div>
    </div>
  );
}
```

(This also wraps in NF-H3 token migration for this file — see Task 3.15. The combined diff is cleaner than two passes.)

- [ ] **Step 2: Type-check + tests**

Run: `cd client && npm run type-check && npm test -- --run`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Dashboard/PasswordManagement/PasswordRevealModal.tsx
git commit -m "feat(client): clipboard auto-clear + Devlet tokens on PasswordRevealModal

Closes: NF-M2, partial NF-H3"
```

### Task 3.15: Frontend NF-H3 — Devlet tokens across remaining password admin files

**Files:**
- Modify: `client/src/pages/Dashboard/PasswordManagement/PasswordManagementPage.tsx`
- Modify: `client/src/pages/Dashboard/PasswordManagement/UsersTab.tsx`
- Modify: `client/src/pages/Dashboard/PasswordManagement/BulkImportTab.tsx`
- Modify: `client/src/pages/Dashboard/PasswordManagement/AuditLogTab.tsx`
- Modify: `client/src/pages/Dashboard/PasswordManagement/ResetReasonModal.tsx`

- [ ] **Step 1: Read tokens.css to confirm token names**

Verified token names (from `client/src/styles/tokens.css`):
- `--paper` (white surface), `--surface`, `--surface-2` (off-white panels)
- `--ink`, `--ink-2`, `--ink-dim`, `--ink-dim-2` (text)
- `--rule`, `--rule-2` (borders)
- `--state`, `--state-deep` (Tofaş red — primary action)

(There is no `--ok` / `--warn` token; status colors map to plain Tailwind amber/green is acceptable, OR introduce `--ok: #1f7a3a` and `--warn: #b45309` in tokens.css. Per spec §6.7, prefer the token-introduction approach.)

- [ ] **Step 2: Introduce `--ok` and `--warn` if missing**

Append to `client/src/styles/tokens.css` `:root`:

```css
  /* Status accents — used by admin tables and toasts. */
  --ok: #1f7a3a;
  --warn: #b45309;
```

And to `[data-theme='dark']`:

```css
  --ok: #4ea76a;
  --warn: #d4923f;
```

- [ ] **Step 3: Migrate each file**

Use this mapping table when editing:

| Old Tailwind | New token expression |
|---|---|
| `bg-white` | `bg-[var(--paper)]` |
| `bg-gray-50` | `bg-[var(--surface)]` |
| `bg-gray-100` | `bg-[var(--surface-2)]` |
| `bg-gray-800` / `bg-gray-900` | `bg-[var(--ink)]` |
| `text-gray-700` / `text-gray-600` | `text-[var(--ink-dim)]` |
| `text-gray-500` | `text-[var(--ink-dim-2)]` |
| `border` / `border-gray-200` | `border border-[var(--rule)]` |
| `bg-red-600` / `bg-red-700` | `bg-[var(--state)]` / `bg-[var(--state-deep)]` |
| `text-green-700` | `text-[var(--ok)]` |
| `text-amber-700` | `text-[var(--warn)]` |
| `bg-blue-600` / `bg-blue-700` (primary action) | `bg-[var(--state)]` / `bg-[var(--state-deep)]` |

Open each of the 5 files and apply the mapping. Verify nothing visually regresses by running the dev server and toggling `[data-theme='dark']`.

- [ ] **Step 4: Type-check + tests + manual smoke**

Run in parallel:
- `cd client && npm run type-check`
- `cd client && npm test -- --run`

Then: `npm run dev:client`. Open `/admin/password-management`. Toggle dark mode (browser dev tools → set `<html data-theme="dark">`). Verify pages render correctly in both themes.

- [ ] **Step 5: Commit**

```bash
git add client/src/styles/tokens.css \
        client/src/pages/Dashboard/PasswordManagement/PasswordManagementPage.tsx \
        client/src/pages/Dashboard/PasswordManagement/UsersTab.tsx \
        client/src/pages/Dashboard/PasswordManagement/BulkImportTab.tsx \
        client/src/pages/Dashboard/PasswordManagement/AuditLogTab.tsx \
        client/src/pages/Dashboard/PasswordManagement/ResetReasonModal.tsx
git commit -m "feat(client): migrate password admin pages to Devlet tokens

Adds --ok / --warn tokens.
Closes: NF-H3"
```

### Task 3.16: Push, open PR, verify CI green

- [ ] **Step 1: Push**

```bash
git push -u origin feat/password-admin-hardening
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "feat(password-admin): hardening — atomic batches, transactional regen, no-base64 download, mild rate limits" --body "$(cat <<'EOF'
## Summary
**Backend**
- N-C1: bulk import now stores XLSX on the batch document; client follows `downloadUrl` to a streaming endpoint. No base64 in JSON.
- N-H1: mild rate limits (100/min general, 20/min import) — DoS protection only, admins are trusted.
- N-H2: atomic findOneAndUpdate for batch activate/cancel state transitions.
- N-H5: transactional regenerate via bulkWrite + Mongoose session, with non-replica-set fallback that surfaces partial failures.
- N-M2: 500-row import cap with truncate-with-warning.
- N-M3: in-memory password Map cleared after XLSX is built.
- N-M4: resolved by N-C1.
- N-M6: handlers wrapped in asyncHandler.
- N-M7: multer fileFilter rejects non-XLS uploads.
- N-L1: handleServiceError now logs.
- N-L4: 365-day TTL on PasswordAuditLog.
- N-L5: test fixture comments.

**Frontend**
- NF-H3: Devlet tokens replace raw Tailwind colors across 5 password admin files; `--ok` / `--warn` tokens added.
- NF-H4: BulkImportTab mutations get onError toasts.
- NF-M2: PasswordRevealModal clipboard auto-clears after 60s with visible indicator.

## Test plan
- [ ] CI green
- [ ] `vitest run src/modules/passwordAdmin` — concurrency / regenerate / parser-cap / download-route tests pass
- [ ] Dev smoke: bulk-import → preview → commit → XLSX downloads via Content-Disposition (no base64 in JSON)
- [ ] Dev smoke: per-user reset → modal still shows plaintext (admin-trust preserved)
- [ ] Dev smoke: copy password → wait 60s → indicator says cleared
- [ ] Dev smoke: dark-mode toggle on `/admin/password-management` renders correctly

Closes: N-C1, N-H1, N-H2, N-H5, N-M2, N-M3, N-M4, N-M6, N-M7, N-L1, N-L4, N-L5, NF-H3, NF-H4, NF-M2
Depends-on: PR #2 (`fix/security-cross-cutting`) — User.sifre select:false migration
EOF
)"
```

- [ ] **Step 3: Wait for CI; merge when green**

```bash
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main && git pull
```

---

## PR #4 — Compose + nginx (`fix/infra-compose-nginx`)

This PR can be developed in parallel with PR #2/#3 once PR #1 is merged. To keep the sequence simple, it goes after #3 here.

### Task 4.0: Branch

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull
git checkout -b fix/infra-compose-nginx
```

### Task 4.1: Add `ENCRYPTION_KEY` (and other lost vars) to `docker-compose.prod.yml` (N-M9)

**Files:**
- Modify: `docker-compose.prod.yml`

- [ ] **Step 1: Diff base vs override env vars**

The base `docker-compose.yml` backend `environment:` block (lines 31-59) defines: `NODE_ENV`, `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `MONGODB_TLS`, `SKIP_EVCI_MIGRATION`, `PORT`, `CORS_ORIGIN`, `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `BCRYPT_ROUNDS`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`.

The override `docker-compose.prod.yml` backend `environment:` (lines 7-13) defines only: `NODE_ENV`, `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `REDIS_URL`.

Compose **replaces** mappings wholesale, so the override silently drops: `ENCRYPTION_KEY`, `MONGODB_TLS`, `SKIP_EVCI_MIGRATION`, `PORT`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `BCRYPT_ROUNDS`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`.

- [ ] **Step 2: Patch the override**

Replace the `backend.environment` block in `docker-compose.prod.yml` with:

```yaml
  backend:
    environment:
      # NOTE: docker compose merges `environment:` blocks wholesale, not
      # key-by-key. Every var defined in the base file MUST appear here too,
      # otherwise the override silently drops it.
      NODE_ENV: production
      MONGODB_URI: mongodb://admin:${MONGO_PASSWORD:?MONGO_PASSWORD environment variable is required}@mongodb:27017/tofas-fen?authSource=admin
      JWT_SECRET: ${JWT_SECRET:?JWT_SECRET environment variable is required}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET:?JWT_REFRESH_SECRET environment variable is required}
      # N-M9: ENCRYPTION_KEY MUST be present in the prod override; B-C5 makes
      # the backend fail-closed if it's missing.
      ENCRYPTION_KEY: ${ENCRYPTION_KEY:?ENCRYPTION_KEY environment variable is required}
      MONGODB_TLS: ${MONGODB_TLS:-false}
      SKIP_EVCI_MIGRATION: 'true'
      PORT: 3001
      CORS_ORIGIN: ${FRONTEND_URL:?FRONTEND_URL environment variable is required}
      REDIS_URL: redis://:${REDIS_PASSWORD:?REDIS_PASSWORD environment variable is required}@redis:6379
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      BCRYPT_ROUNDS: 13
      RATE_LIMIT_WINDOW_MS: 900000
      RATE_LIMIT_MAX_REQUESTS: 100
```

(`BCRYPT_ROUNDS: 13` matches the prod cost in `authService.ts` constant.)

- [ ] **Step 3: Verify compose can render**

Create a temporary `.env.test`:

```bash
cat > /tmp/compose-test.env <<'EOF'
MONGO_PASSWORD=test-mongo
JWT_SECRET=test-jwt
JWT_REFRESH_SECRET=test-jwt-refresh
ENCRYPTION_KEY=test-encryption-key-must-be-64-chars-long-but-this-is-shorter-ok
REDIS_PASSWORD=test-redis
FRONTEND_URL=https://example.com
EOF
docker compose --env-file /tmp/compose-test.env -f docker-compose.yml -f docker-compose.prod.yml config > /dev/null
```

Expected: exit 0, no errors. Then test the fail-loud:

```bash
docker compose --env-file /dev/null -f docker-compose.yml -f docker-compose.prod.yml config 2>&1 | grep -E "ENCRYPTION_KEY|JWT_SECRET" | head -3
```

Expected: error mentioning `ENCRYPTION_KEY environment variable is required`.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.prod.yml
git commit -m "fix(compose): re-include all base env vars in prod override

Adds ENCRYPTION_KEY (B-C5 fail-closed), restores REDIS_*, BCRYPT_ROUNDS, etc.
Closes: N-M9"
```

### Task 4.2: nginx CSP/HSTS on static asset block (N-H7)

**Files:**
- Modify: `nginx/nginx.conf`
- Modify: `client/nginx.conf`
- Create: `nginx/snippets/security-headers.conf`

- [ ] **Step 1: Extract security headers into a reusable snippet**

Create `nginx/snippets/security-headers.conf`:

```nginx
# Repeated security headers — included in every location block that uses
# `add_header` for caching/CORS, because nginx silently discards parent
# `add_header` directives whenever a child block declares any of its own.
# See N-H7 in CODE_REVIEW_REPORT_2026-04-29.md.
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header X-Permitted-Cross-Domain-Policies "none" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

- [ ] **Step 2: Patch `nginx/nginx.conf`**

Replace lines 54-64 (the global `add_header` block) and the static-asset location block (around lines 122-127) so they both include the snippet.

Replace lines 54-64 with:

```nginx
    # Security Headers (kept at http scope as fallback, but nginx
    # add_header inheritance is broken if any location block also adds
    # headers — see N-H7. Each location that uses add_header includes
    # snippets/security-headers.conf.)
    include /etc/nginx/snippets/security-headers.conf;
```

(That single `include` expands to the same set of `add_header always` lines.)

Then update the static asset block at lines 122-127:

```nginx
            # Cache static assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
                proxy_pass http://frontend;
                expires 1y;
                add_header Cache-Control "public, immutable" always;
                # N-H7: re-add security headers because the Cache-Control
                # add_header above silently discards the parent block's set.
                include /etc/nginx/snippets/security-headers.conf;
                # CORS for fonts (preload uses crossorigin).
                add_header Access-Control-Allow-Origin "*" always;
            }
```

Update the `/api/` block (lines 131-155) to also include the snippet alongside its CORS headers:

```nginx
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # N-M10: match multer's 5MB cap; default 1m would 413 valid bulk imports.
            client_max_body_size 5m;

            # N-H7: include security headers explicitly (the CORS add_header
            # below would otherwise wipe out the http-level set).
            include /etc/nginx/snippets/security-headers.conf;

            # CORS headers
            add_header Access-Control-Allow-Origin "https://$host" always;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With" always;
            add_header Access-Control-Allow-Credentials "true" always;

            if ($request_method = 'OPTIONS') {
                add_header Access-Control-Allow-Origin "https://$host";
                add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
                add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With";
                add_header Access-Control-Allow-Credentials "true";
                add_header Content-Length 0;
                add_header Content-Type text/plain;
                return 204;
            }
        }
```

- [ ] **Step 3: Patch `client/nginx.conf`**

Wholesale replace `client/nginx.conf` so the static asset block gets the same treatment. The file is small enough to include in full:

```nginx
server {
    listen 8080;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 256;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        image/svg+xml;

    # Security headers (server scope)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable" always;
        # N-H7: re-add security headers because Cache-Control add_header
        # silently discards the parent set.
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        # CORS for font preload (crossorigin attribute).
        add_header Access-Control-Allow-Origin "*" always;
        try_files $uri =404;
    }

    location /health {
        access_log off;
        return 200 '{"status":"ok"}';
        add_header Content-Type application/json;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

(The client image's nginx doesn't load the `nginx/snippets/...` path because that file lives in the proxy image's volume mount; it's simpler to inline the headers here.)

- [ ] **Step 4: Mount the snippet in `docker-compose.yml`**

In `docker-compose.yml`, in the `nginx` service `volumes:` block (around line 132), add the snippet mount:

```yaml
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/snippets:/etc/nginx/snippets:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
```

- [ ] **Step 5: Validate nginx config**

```bash
docker run --rm -v "$PWD/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" \
                -v "$PWD/nginx/snippets:/etc/nginx/snippets:ro" \
                nginx:alpine nginx -t
```

Expected: `nginx: configuration file /etc/nginx/nginx.conf test is successful`.

(SSL certs are referenced but only used at runtime; the syntax check should still pass. If it complains about missing ssl files, add `-c` overrides or mount placeholder certs — usually `nginx -t` only chokes on missing certs at runtime.)

- [ ] **Step 6: Commit**

```bash
git add nginx/nginx.conf client/nginx.conf nginx/snippets/security-headers.conf docker-compose.yml
git commit -m "fix(nginx): re-add security headers in static-asset blocks (add_header inheritance)

Adds reusable snippets/security-headers.conf for nginx/nginx.conf.
Inlines headers in client/nginx.conf (no shared snippet path in client image).
Closes: N-H7"
```

### Task 4.3: Push, open PR, verify CI green

- [ ] **Step 1: Push**

```bash
git push -u origin fix/infra-compose-nginx
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "fix(infra): compose env audit + nginx header inheritance + body size" --body "$(cat <<'EOF'
## Summary
- N-M9: re-include every base env var in `docker-compose.prod.yml` (compose merges environment maps wholesale). Adds the missing `ENCRYPTION_KEY` (B-C5 fail-closed), `REDIS_*`, `BCRYPT_ROUNDS`, `MONGODB_TLS`, `SKIP_EVCI_MIGRATION`, `PORT`, etc.
- N-H7: re-add CSP/HSTS/X-Frame-Options inside static-asset and /api/ location blocks (nginx `add_header` inheritance silently drops parent-scope headers). New `nginx/snippets/security-headers.conf` shared by the proxy image; client-image nginx inlines the same headers.
- N-M10: `client_max_body_size 5m` in the `/api/` block to match multer's 5MB cap.

## Test plan
- [ ] CI green
- [ ] `docker compose --env-file <test> -f docker-compose.yml -f docker-compose.prod.yml config` succeeds
- [ ] Same command with empty env fails loudly on `ENCRYPTION_KEY`
- [ ] `nginx -t` clean against `nginx/nginx.conf` + snippets
- [ ] Manual after deploy: `curl -vI https://<host>/some-bundle.js` shows CSP/HSTS/X-Frame-Options headers
- [ ] Manual after deploy: bulk-import a 4 MB XLS — succeeds; 6 MB — 413

Closes: N-M9, N-H7, N-M10
EOF
)"
```

- [ ] **Step 3: Wait for CI; merge when green**

```bash
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main && git pull
```

---

## PR #5 — Deployment runbook (`docs/deployment-runbook`)

### Task 5.0: Branch

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull
git checkout -b docs/deployment-runbook
```

### Task 5.1: Write `docs/deployment.md`

**Files:**
- Create: `docs/deployment.md`

- [ ] **Step 1: Write the runbook**

Create `docs/deployment.md`:

````markdown
# Tofaş Fen Webapp — Hostinger Compose Deployment Runbook

This document covers the day-1 and day-2 deployment of the Tofaş Fen webapp on a Hostinger VPS using Docker Compose.

K8s manifests in `k8s/` are aspirational; secrets management for K8s is tracked separately under I-C2 / I-H10.

## 1. Prerequisites

- Hostinger VPS with at least 2 vCPU, 4 GB RAM, 40 GB disk
- Domain pointing to the VPS (A record)
- TLS certificate (Let's Encrypt via certbot — instructions below)
- Docker Engine ≥ 24 + compose plugin
- `git`, `openssl`, and a password manager you trust

## 2. Initial setup

```bash
ssh root@<vps-host>
adduser tofas && usermod -aG docker tofas
sudo -iu tofas
git clone https://github.com/iWeslax83/tofas-fen-webapp.git /srv/tofas-fen
cd /srv/tofas-fen
```

## 3. Generate secrets

```bash
cd server && npm run generate-secrets > /tmp/secrets.txt
```

This emits values for `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`. Record them in your password manager **before** moving them into `.env`.

## 4. Create `.env`

```bash
cd /srv/tofas-fen
cp server/.env.example .env
$EDITOR .env
```

### Required env vars

| Variable | Source | Notes |
|---|---|---|
| `MONGO_PASSWORD` | generate via `openssl rand -base64 24` | Mongo root password |
| `JWT_SECRET` | from step 3 | Access-token signing key |
| `JWT_REFRESH_SECRET` | from step 3 | Refresh-token signing key |
| `ENCRYPTION_KEY` | from step 3 | **Required** — backend fail-closes without it. 64 hex chars. |
| `REDIS_PASSWORD` | `openssl rand -base64 24` | Redis password |
| `FRONTEND_URL` | `https://yourdomain.tld` | CORS origin + cookie domain |
| `MONGODB_TLS` | `false` (default) | Set `true` only if Mongo has its own TLS cert |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | your SMTP provider | Email delivery |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | from step 3 | Push notifications |
| `SENTRY_DSN` | from sentry.io | Optional but recommended |

Lock the file down:

```bash
chmod 600 .env
```

## 5. TLS

Quickest path is certbot in standalone mode before nginx is bound to :443:

```bash
sudo certbot certonly --standalone -d yourdomain.tld
sudo cp /etc/letsencrypt/live/yourdomain.tld/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.tld/privkey.pem nginx/ssl/key.pem
sudo chown -R tofas:tofas nginx/ssl
openssl dhparam -out nginx/ssl/dhparam.pem 2048
```

(Renewal: certbot installs a systemd timer; copy the renewed cert into `nginx/ssl/` via a post-renewal hook, or symlink.)

## 6. First deploy

```bash
cd /srv/tofas-fen
docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml --profile production up -d
```

Verify:

```bash
docker compose ps
docker compose logs -f backend | head -50
curl -kI https://yourdomain.tld/health
```

## 7. Day-2 ops

### Update

```bash
cd /srv/tofas-fen
git pull
docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml pull
docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml --profile production up -d
docker image prune -f
```

### Backup

Mongo:

```bash
docker compose exec mongodb mongodump --archive --gzip \
  -u admin -p "$MONGO_PASSWORD" --authenticationDatabase admin \
  > /srv/backups/mongo-$(date +%Y%m%d-%H%M%S).archive.gz
```

Recommended: rotate via a cron entry — keep 7 daily, 4 weekly, 12 monthly.

### Rollback

```bash
cd /srv/tofas-fen
git log --oneline -5
git checkout <previous-commit>
docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml --profile production up -d --build
```

### Logs

```bash
docker compose logs -f backend frontend nginx
```

Backend writes to a named volume `backend_logs`; tail with:

```bash
docker compose exec backend tail -f /app/logs/combined.log
```

## 8. Secrets rotation

### Rotate `JWT_SECRET` / `JWT_REFRESH_SECRET`

1. Update the value in `.env`.
2. `docker compose ... up -d backend`.
3. All existing tokens are invalidated; users re-login.

### Rotate `ENCRYPTION_KEY`

**Non-trivial.** Encrypted-at-rest fields (TCKN) need a re-encryption migration. Plan:

1. Add a `KEY_ROLLOVER_OLD=<old key>` env var.
2. Run a one-off migration that decrypts each `tckn` with the old key and re-encrypts with the new.
3. Remove `KEY_ROLLOVER_OLD`.

This migration is **not yet implemented** — open an issue before rotating.

### Rotate `MONGO_PASSWORD` / `REDIS_PASSWORD`

1. Update `.env`.
2. Stop services: `docker compose ... stop`.
3. Update the Mongo / Redis user via direct shell (`mongosh` / `redis-cli`).
4. Restart: `docker compose ... up -d`.

## 9. Future migration

K8s manifests in `k8s/` are maintained as the future migration target. When migrating:

- Adopt SealedSecrets / SOPS / external-secrets-operator (I-C2 / I-H10 spec — to be written)
- Mirror the staging namespace's PSA + ResourceQuota + LimitRange into production (N-H6)

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Backend crash-loops with `ENCRYPTION_KEY required` | Missing or empty in `.env` | Set the var; restart |
| nginx 413 on bulk import | Body-size limit | Already raised to 5MB in nginx.conf; check upstream proxies (Cloudflare, etc.) |
| 401 on every API call after a deploy | JWT secret rotated without coordinating | Users need to re-login |
| Login page never finishes loading | `FRONTEND_URL` mismatch with actual host | Match `.env` to the URL the browser uses |
| `Cannot connect to mongo` | Mongo container slow to come up | `depends_on.condition: service_healthy` should handle it; check `docker compose logs mongodb` |

````

- [ ] **Step 2: Validate links**

If `markdown-link-check` is not installed:

```bash
npx --yes markdown-link-check docs/deployment.md
```

Expected: 0 broken external links. (Internal `#section` links may complain — ignore.)

- [ ] **Step 3: Commit**

```bash
git add docs/deployment.md
git commit -m "docs: add Hostinger compose deployment runbook"
```

### Task 5.2: Push, open PR, merge

- [ ] **Step 1: Push**

```bash
git push -u origin docs/deployment-runbook
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "docs: Hostinger compose deployment runbook" --body "$(cat <<'EOF'
## Summary
Adds `docs/deployment.md` documenting the Hostinger VPS compose deployment workflow: prereqs, secret generation, .env setup, TLS, day-1/day-2 ops, secrets rotation, and a troubleshooting table.

## Test plan
- [ ] CI green
- [ ] markdown-link-check clean
- [ ] A fresh reader can stand up the app on a clean VPS following only this doc (manual review)
EOF
)"
```

- [ ] **Step 3: Wait for CI; merge**

```bash
gh pr checks --watch
gh pr merge --squash --delete-branch
git checkout main && git pull
```

---

## Done criteria

- [ ] All 5 PRs merged to `main`
- [ ] CI green on `main`
- [ ] Manual smoke after the password-admin PR: bulk-import → preview → commit → XLSX downloads via Content-Disposition (no base64 in response JSON)
- [ ] Manual smoke after the security PR: login still works; non-auth endpoints don't return `sifre`
- [ ] Manual smoke after the infra PR: `curl -vI https://<host>/<some>.js` shows CSP/HSTS/X-Frame-Options
- [ ] `docs/deployment.md` exists at the documented path
- [ ] `CODE_REVIEW_REPORT_2026-04-29.md` §7.6 Phase 0 list shows 13/15 items resolved (the K8s items I-C2/I-H10 + N-H6 are explicitly deferred)

---

*Plan generated 2026-05-03 from spec at `docs/superpowers/specs/2026-05-03-phase0-password-admin-design.md`. Execute via `superpowers:subagent-driven-development` or `superpowers:executing-plans`.*
