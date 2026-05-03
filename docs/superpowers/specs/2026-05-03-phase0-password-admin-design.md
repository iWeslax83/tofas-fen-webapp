# Phase 0 + Password Admin Hardening — Design Spec

**Date:** 2026-05-03
**Source review:** [`CODE_REVIEW_REPORT_2026-04-29.md`](../../../CODE_REVIEW_REPORT_2026-04-29.md)
**Scope:** Phase 0 must-fix items §7.6 + cohesive password-admin module hardening (option B from brainstorming)
**Out of scope:** I-C2/I-H10 (K8s SealedSecrets/SOPS), N-H6 (production K8s namespace), all Phase 1+ items
**Deployment target:** Hostinger VPS via Docker Compose (K8s deferred to a later spec)
**Trust posture:** Administrative users are trusted operators. Admin-side mechanisms favor trust + low friction over policing; defense-in-depth is reserved for log/heap hygiene and correctness.

---

## 1. Goals

1. Eliminate the plaintext-credentials-in-JSON exposure path (N-C1) without forcing a download-token UX.
2. Stop the global error handler from logging request bodies in clear (N-C2).
3. Close the residual ReDoS surface left by the partial B-C6 fix (N-H3, N-M8).
4. Make `User.sifre` opt-in to read so casual queries stop returning the bcrypt hash (N-H4).
5. Make password-admin batch state transitions correct under concurrency (N-H2, N-H5).
6. Add minimal DoS protection to admin endpoints without introducing admin friction (N-H1, generous limits).
7. Resolve the password-admin module's smaller correctness/quality items (N-M2, N-M3, N-M6, N-M7, N-L1, N-L4, N-L5).
8. Resolve the frontend UX/dark-mode bugs in the password-admin pages (NF-H3, NF-H4, NF-M2).
9. Fix the three compose/nginx infra bugs that would otherwise either crash prod or silently undo other hardening (N-M9, N-H7, N-M10).
10. Tidy repo hygiene (N-L3, empty `sealed-secret.yaml` stub).
11. Write a short Hostinger compose deployment runbook (`docs/deployment.md`).

## 2. Non-goals

- K8s production secrets management — deferred (own spec).
- K8s production namespace PSA/quota — deferred (not the deployment target).
- Phase 1 items (focus indicators, console→safeLogger sweep, role chunk splits, Radix Dialog/Tabs adoption, nonce-based CSP, base-image digest pinning, env template rename).
- Backwards-compat shims for the few callsites that previously read `User.sifre` incidentally — they'll be migrated explicitly.
- A user-facing email-link reset model for admin-initiated resets. Today's "admin sees plaintext, hands credentials to student" workflow is preserved.

---

## 3. PR Sequence

| #   | Branch                          | Findings                                                                                    | Risk    | Depends on   |
| --- | ------------------------------- | ------------------------------------------------------------------------------------------- | ------- | ------------ |
| 1   | `chore/repo-hygiene`            | N-L3, sealed-secret.yaml stub                                                               | trivial | —            |
| 2   | `fix/security-cross-cutting`    | N-C2, N-H3, N-M8, N-H4                                                                      | medium  | PR #1 merged |
| 3   | `feat/password-admin-hardening` | N-C1, N-H1, N-H2, N-H5, N-M2, N-M3, N-M4, N-M6, N-M7, N-L1, N-L4, N-L5, NF-H3, NF-H4, NF-M2 | high    | PR #2 merged |
| 4   | `fix/infra-compose-nginx`       | N-M9, N-H7, N-M10                                                                           | low     | PR #1 merged |
| 5   | `docs/deployment-runbook`       | `docs/deployment.md`                                                                        | trivial | PR #4 merged |

PRs #2 and #4 can be developed in parallel after #1. PR #3 must wait for #2 (uses `User.findOne` with the password hash; needs `select: '+sifre'`-aware code paths). PR #5 documents the compose env vars introduced in #4.

CI must be green on each PR before opening the next (per project-memory feedback: chained PR failure email storms are operationally painful).

---

## 4. PR #1 — Repo hygiene

### 4.1 Findings addressed

- **N-L3** — `credentials-*.xlsx` not gitignored.
- Empty `k8s/sealed-secret.yaml` stub committed (companion to deferred I-C2).

### 4.2 Changes

- Append to `.gitignore`:
  ```
  # Generated credentials exports — never commit
  credentials-*.xlsx
  credentials-*.xls
  ```
- Move existing untracked `credentials-20260421-*.xlsx` and `credentials-atlas-20260422-*.xlsx` from repo root to a new `local-data/` directory (also gitignored). Do **not** delete; they contain plaintext that the user may still need locally.
- Delete `k8s/sealed-secret.yaml` (currently 0 bytes, misleading).
- Add a one-line comment to `k8s/secret.yaml.template` pointing to a future `docs/secrets-management.md` (placeholder; the actual secrets-management spec is deferred).

### 4.3 Verification

- `git status` shows the credentials files moved + still untracked under `local-data/`.
- `git check-ignore credentials-test.xlsx` returns the line.
- CI green.

---

## 5. PR #2 — Security cross-cutting

### 5.1 Findings addressed

- **N-C2** — `errorHandler.ts:48` logs `req.body` verbatim.
- **N-H3** — Unsanitized `$regex` in `Notes.ts:932-936`.
- **N-M8** — Unsanitized `$regex` in `userService.ts:36-38, 223-225`.
- **N-H4** — `User.sifre` lacks `select: false`.

### 5.2 Components

#### 5.2.1 `server/src/utils/redaction.ts` (new)

```ts
const SENSITIVE_KEY_RE =
  /(password|sifre|pw|plaintext|token|secret|api[_-]?key|authorization|cookie)/i;
const REDACTED = '[REDACTED]';

export function redactSensitive<T>(input: T, depth = 0): T {
  /* deep clone, replace matched keys with REDACTED, cap depth=8 */
}
```

- Pure function. Deep-clones; never mutates input.
- Depth cap of 8 to bound cost on pathological inputs.
- Unit tests cover: nested objects, arrays of objects, circular refs (handled via WeakSet), null/undefined, primitives, mixed-case keys.

#### 5.2.2 `errorHandler.ts:48` integration

Wrap the body in `redactSensitive(req.body)` before passing to Winston. Same for `req.query` (could carry a `?token=...`) and a small allowlist of headers (`{ 'content-type', 'user-agent', 'referer', 'x-request-id' }`) instead of `req.headers` wholesale.

#### 5.2.3 `server/src/utils/regex.ts` (new)

```ts
export function escapeRegex(input: string): string {
  /* escape regex metachars */
}

export interface SafeSearchOptions {
  maxLength?: number;
}
export function safeSearchRegex(input: string, opts: SafeSearchOptions = {}): RegExp | null {
  // returns null if input is empty or exceeds maxLength (default 100)
  // returns new RegExp(escapeRegex(trimmed), 'i') otherwise
}
```

- Replaces the inline implementation at `server/src/routes/User.ts:16-18`.
- Unit tests cover: special chars (`.*+?^$\(\)[]{}|`), Turkish chars (must pass through), too-long input, empty input.

#### 5.2.4 `$regex` callsite migration

| Callsite                                               | Action                                                                                                                                                |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `routes/User.ts:16-18, 141-147`                        | Replace local `escapeRegex` with import from `utils/regex.ts`; use `safeSearchRegex`.                                                                 |
| `routes/Notes.ts:932-936`                              | Wrap `q` with `safeSearchRegex({maxLength: 100})`; if null, return empty result set. Apply across `studentId`, `lesson`, `description` `$or` clauses. |
| `modules/users/services/userService.ts:36-38, 223-225` | Same `safeSearchRegex` treatment for `search` parameter.                                                                                              |

#### 5.2.5 `User.sifre` `select: false`

- `server/src/models/User.ts` schema change: `sifre: { type: String, select: false }`.
- Audit every `User.findOne` / `User.find(` / `User.findById` callsite (~30 files identified). For each, classify:
  - **Reads `sifre`** → add `.select('+sifre')`. Expected callsites:
    - `modules/auth/services/authService.ts` — login, password verify, refresh-token paths
    - `modules/auth/controllers/authController.ts` — any direct sifre reads
    - `routes/User.ts:639,728` — password change handlers
    - `routes/Registration.ts` — reset flow (already uses tokens, but bcrypt comparison happens here)
    - `modules/passwordAdmin/passwordAdminService.ts` — reset/regenerate paths
    - `routes/__tests__/auth.test.ts` and `test/models/User.test.ts` — test fixtures
  - **Does not read `sifre`** → unchanged. The hash silently stops appearing in their result objects (the desired behavior).
- Audit method: `grep -rn 'User\.\(findOne\|findById\|find(\)' server/src --include='*.ts'` → for each hit, inspect the response usage. Document each touched file in the PR description.

### 5.3 Verification

- New unit tests pass (redaction + regex utilities).
- Existing test suite passes (`npm run test:server`).
- Manual smoke (developer):
  1. POST `/api/auth/login` with bad password → 401, logs show `password: '[REDACTED]'`.
  2. POST `/api/auth/login` with good password → 200, login works (callsite #1 audit succeeded).
  3. PUT `/api/users/<id>/password` (change own password) → 200 (callsite audit succeeded).
  4. POST `/api/admin/passwords/reset/<userId>` → 200 (callsite audit succeeded).
  5. GET `/api/notes?q=.*` and `/api/notes?q=$(seq 1 200 | tr -d '\n')` → both return safe results, no ReDoS, no crash.
  6. Pull a random non-auth User read (e.g., `/api/homeworks/<id>` → response includes student name) → response does **not** include `sifre` field.
- Any 401 in normal usage post-merge = missed `select: '+sifre'` → bisect via the audit list.

---

## 6. PR #3 — Password admin hardening

### 6.1 Findings addressed

CRITICAL: N-C1
HIGH: N-H1, N-H2, N-H5
MEDIUM: N-M2, N-M3, N-M4 (resolved via N-C1), N-M6, N-M7
LOW: N-L1, N-L4, N-L5
Frontend: NF-H3, NF-H4, NF-M2
**Dropped from this PR (per "trust admins" course correction):** NF-H1 (modal-cleanup hook). The `PasswordRevealModal` stays as today.

### 6.2 N-C1 — Stop putting plaintext / XLSX in JSON

**Per-user reset/generate** (`POST /api/admin/passwords/reset/:userId`, `POST /api/admin/passwords/generate/:userId`):

- Continue to return `{ password, userId }` in JSON. Admins are trusted; the modal stays.
- N-C1's "JSON-leakage" risk is acknowledged and accepted for this single-password case: the modal already requires an interactive admin click and the data is short-lived in the heap.

**Bulk import** (`POST /api/admin/passwords/bulk-import/commit`):

- **Stop** returning `credentialsFileBase64` inside the JSON envelope.
- New endpoint `GET /api/admin/passwords/bulk-import/:batchId/credentials.xlsx`:
  - Returns the XLSX as a binary stream with `Content-Disposition: attachment; filename="credentials-<batchId>.xlsx"` and `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
  - Authorized for admin role only.
  - Available for the lifetime of the batch (until activated/cancelled). After activation, the XLSX is regenerated on-demand from stored hashes? **No** — the plaintext is gone after activation. Available only for `pending` batches.
  - For `regenerate` flow: same endpoint serves the regenerated XLSX while batch is in `regeneration_partial` or until admin re-activates.
- The commit response becomes `{ batchId, status, downloadUrl }`. Frontend immediately follows `downloadUrl`.
- **Storage:** the XLSX buffer lives in the existing batch document (Mongo), in a new field `credentialsXlsx: Buffer`. Cleared (`$unset`) when the batch transitions to `activated` or `cancelled` (via the same atomic `findOneAndUpdate` from N-H2).
- **Trade-off vs Redis token approach:** Mongo-backed buffer is simpler (no new Redis schema, leverages existing batch lifecycle), survives server restart, and the admin-trust posture means we don't need single-use guarantees. Cost: the buffer sits in Mongo until activation. Acceptable.

### 6.3 N-H1 — Mild rate limits (DoS protection only, not admin-policing)

Apply to `passwordAdminRoutes.ts`:

```ts
const generalLimiter = rateLimit({ windowMs: 60_000, max: 100 });
const importLimiter = rateLimit({ windowMs: 60_000, max: 20 });
```

- General limiter on the whole router.
- `importLimiter` additionally on `/bulk-import/preview` and `/bulk-import/commit`.
- No limiter on `/bulk-import/:batchId/credentials.xlsx` — admin may legitimately re-download.
- These limits are intentionally generous: a normal admin won't hit them; an automated attack on a stolen session can't blast through 10k accounts in 30s.

### 6.4 N-H2 — Atomic batch state transitions

Replace `loadPendingBatchOrThrow → save()` triplets in `passwordAdminService.ts:203-228, 287-296` with:

```ts
const updated = await PasswordImportBatch.findOneAndUpdate(
  { batchId, status: 'pending' },
  { $set: { status: 'activated', activatedAt: new Date() }, $unset: { credentialsXlsx: '' } },
  { new: true },
);
if (!updated) throw new ConflictError('Batch is not pending or has already been processed');
```

Same pattern for `cancelBatch` (sets `status: 'cancelled'`, unsets `credentialsXlsx`).

### 6.5 N-H5 — Transactional regenerate

Convert `Promise.all(updateOne)` at `passwordAdminService.ts:247-257` to a Mongoose session + `User.bulkWrite(ops, { ordered: true, session })`. On any failure:

- Abort the transaction; original hashes preserved.
- Mark the batch `regeneration_failed` with the failed user IDs in the batch doc.
- Surface the failures to the admin in the response (`{ status: 'partial' | 'failed', failures: [...] }`) instead of returning a misleading XLSX.

If MongoDB deployment doesn't support transactions (single-node Mongo, common in dev), fall back to detecting and reporting failures from `bulkWrite` results without rollback — acknowledged trade-off, documented in code comment.

### 6.6 N-M2..M7, N-L1, N-L4, N-L5 — Quality fixes

| ID   | Change                                                                                                                                                                                                                                                                                               |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N-M2 | `classListParser.ts`: cap parsed rows at 500. If exceeded, throw `RowLimitError` with message `"En fazla 500 öğrenci içe aktarılabilir; ${count} satır bulundu."`                                                                                                                                    |
| N-M3 | `passwordAdminService.ts`: convert plaintext-password `Map` to a local that's `clear()`-ed immediately after the XLSX buffer is built, before any awaits. Add a comment explaining the lifetime requirement.                                                                                         |
| N-M4 | Resolved by N-C1 (no base64 in JSON anymore).                                                                                                                                                                                                                                                        |
| N-M6 | Refactor `passwordAdminController.ts` handlers to use `asyncHandler` from `middleware/errorHandler.ts`; drop the manual try/catches except where `handleServiceError` provides domain-specific mapping (preserve that, but wrap in `asyncHandler` so unhandled throws still hit the global handler). |
| N-M7 | Add `fileFilter: (_req, file, cb) => /\.(xlsx?)$/i.test(file.originalname) ? cb(null, true) : cb(new Error('XLS/XLSX only'))` to the multer config in `passwordAdminRoutes.ts:23`.                                                                                                                   |
| N-L1 | `handleServiceError` to `logger.error({ err, ctx, adminId })` before mapping to HTTP status.                                                                                                                                                                                                         |
| N-L4 | `PasswordAuditLog` schema: `schema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 3600 })` (1-year retention; KVKK-defensible). Document in code comment.                                                                                                                                  |
| N-L5 | Add `// fixture only — not a real password` comments above the test passwords.                                                                                                                                                                                                                       |

### 6.7 Frontend changes

- `pages/Dashboard/PasswordManagement/UsersTab.tsx`: no logic change for per-user reveal (admin-trust). No NF-H1 cleanup hook.
- `pages/Dashboard/PasswordManagement/PasswordRevealModal.tsx`:
  - **NF-M2**: after copy-to-clipboard, set a 60-second timer; on expiry, call `navigator.clipboard.writeText('')` and show a small "panodan temizlendi" indicator. Cancellable if modal closes earlier.
- `pages/Dashboard/PasswordManagement/BulkImportTab.tsx`:
  - **NF-H4**: add `onError: (err) => toast.error(err.message ?? 'Beklenmeyen hata')` to both `previewMut.mutate` and `commitMut.mutate`.
  - On successful commit, follow `downloadUrl` (window.location, or `<a href download ref>` triggered programmatically).
- **NF-H3** — replace raw Tailwind colors with Devlet tokens across these 6 files:
  - `PasswordManagementPage.tsx:11`
  - `UsersTab.tsx:129,143`
  - `BulkImportTab.tsx:55`
  - `AuditLogTab.tsx:45`
  - `ResetReasonModal.tsx:66`
  - `PasswordRevealModal.tsx:48`
  - Mapping: `bg-red-600` → `bg-[var(--state)]`, `text-green-700` → `text-[var(--ok)]` (or whatever the Devlet token is — verify by reading `client/src/styles/tokens.css`), `bg-gray-50` → `bg-[var(--surface)]`, etc.
- API client (`client/src/utils/apiEndpoints.ts` or wherever the password-admin endpoints live): add the new `bulk-import/:batchId/credentials.xlsx` endpoint. Drop any handling of `credentialsFileBase64`.

### 6.8 Verification

- `npm run test:server` passes (extended `passwordAdminService.test.ts` and `passwordAdminController.test.ts`).
- New tests:
  - `bulk-import/commit` returns `downloadUrl`, no `credentialsFileBase64`.
  - `GET .../credentials.xlsx` returns binary with correct MIME and Content-Disposition.
  - Concurrent `activate` calls — only one succeeds, the other gets `ConflictError`.
  - `regenerate` partial-failure path returns `{ status: 'partial', failures }` and does not corrupt user hashes.
  - Multer rejects `.txt` upload with the right error.
  - Row-cap error fires at 501 rows.
  - Audit log document gets the TTL index (`db.password_audit_logs.getIndexes()`).
- `npm run test:client` passes (extended `BulkImportTab.test.tsx`).
- Manual smoke (developer):
  1. Bulk-import → preview → commit → XLSX downloads correctly, no JSON envelope plaintext.
  2. Per-user reset → modal still shows plaintext (admin-trust preserved).
  3. Copy password → wait 60s → clipboard cleared, indicator shown.
  4. Toggle dark mode → password admin pages render in correct dark colors.
  5. Submit malformed bulk-import file → toast appears with error.
- CI green.

---

## 7. PR #4 — Compose + nginx infra

### 7.1 Findings addressed

- **N-M9** — `docker-compose.prod.yml` missing `ENCRYPTION_KEY`.
- **N-H7** — nginx `add_header` inheritance silently drops CSP/HSTS on JS files.
- **N-M10** — `client_max_body_size` mismatch with multer 5MB limit.

### 7.2 Changes

#### 7.2.1 `docker-compose.prod.yml`

Audit the backend `environment:` block for completeness vs the base `docker-compose.yml`. Compose merges `environment:` blocks **wholesale**, not key-wise — every var the base file defines that the override omits is dropped. At minimum:

- Add `ENCRYPTION_KEY: ${ENCRYPTION_KEY:?ENCRYPTION_KEY is required for production}`.
- Re-include any other base-file env var that the override silently lost (sweep + diff).
- Document the fail-loud `:?` syntax in code comments.

#### 7.2.2 `nginx/nginx.conf` and `client/nginx.conf` — header inheritance

For both files' static-asset `location ~* \.(js|css|woff2?|...)` blocks, repeat the security headers alongside the existing `Cache-Control` directives:

```nginx
location ~* \.(js|css|woff2?|jpe?g|png|gif|svg|ico)$ {
    expires 1y;
    add_header Cache-Control "public, immutable" always;

    # Repeat security headers — nginx add_header inheritance discards parent block's directives.
    add_header Content-Security-Policy "<same as parent>" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "<same as parent>" always;

    # Also: NF-H/N-M12 readiness — CORS for fonts (preload uses crossorigin)
    add_header Access-Control-Allow-Origin "*" always;
}
```

Don't introduce the `headers-more` module — keeps the official nginx image working out of the box.

#### 7.2.3 `nginx/nginx.conf` — body size

In the `/api/` `location` block (around line 131), add:

```nginx
client_max_body_size 5m;
```

To match multer's 5 MB cap. Without this, nginx rejects 5 MB XLS uploads with 413 before they reach Express.

### 7.3 Verification

- `nginx -t` against the config in CI (add a CI step if not present, or run locally and document).
- `docker compose --env-file .env.example -f docker-compose.yml -f docker-compose.prod.yml config` succeeds with `ENCRYPTION_KEY` in `.env.example`.
- Without `ENCRYPTION_KEY` set, `docker compose ... config` fails with the documented error.
- Manual: `curl -v https://<host>/some-bundle.js` shows CSP/HSTS/X-Frame-Options headers.
- Manual: bulk-import a 4 MB XLS → succeeds. Bulk-import a 6 MB XLS → 413.

---

## 8. PR #5 — `docs/deployment.md`

A short Hostinger VPS + Docker Compose runbook (~1 page):

1. **Prereqs:** Hostinger VPS, Docker Engine + compose plugin, domain pointing to VPS, TLS cert (Let's Encrypt via certbot or nginx-side ACME).
2. **Initial setup:**
   - Clone repo to `/srv/tofas-fen`.
   - Generate secrets via `npm run generate-secrets` (existing script). Record values in a password manager.
   - Create `/srv/tofas-fen/.env` with the generated secrets + Hostinger-specific values (DB host, SMTP creds, FRONTEND_URL).
   - `chmod 600 .env`; `chown root:docker .env`.
3. **Required env vars** — table listing every variable, source, example, and which service consumes it. Highlight `ENCRYPTION_KEY` (required, fail-closed).
4. **First deploy:**
   - `docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env up -d`.
   - Verify: `docker compose ps`, `docker compose logs backend`.
5. **Day-2:**
   - Update: `git pull && docker compose ... pull && docker compose ... up -d`.
   - Backup: `docker compose exec mongo mongodump --archive=/backup/...`.
   - Rollback: pin previous image digests in compose, redeploy.
6. **Secrets rotation:** how to rotate `ENCRYPTION_KEY` (data re-encryption needed — note this and link to a future migration spec; out of scope for this round).
7. **Pointer:** link to the deferred K8s + SealedSecrets spec for future migration.

### 8.1 Verification

- A fresh reader can stand up the app on a clean VPS following only this doc.
- All env vars referenced in the doc exist in compose files.
- `markdown-link-check` clean.

---

## 9. Risks & open questions

- **`User.sifre` migration completeness (PR #2):** the audit is greppable, but a missed `.select('+sifre')` causes silent 401s in production. Mitigation: explicit checklist in the PR description listing every touched callsite + the post-merge smoke list.
- **Mongo transactions for N-H5:** require a replica set. Hostinger compose may run a single-node Mongo. Documented fallback: report failures without rollback. Re-evaluate when transactions are available.
- **Nginx config drift (PR #4):** the security-header block must stay in sync between parent and child `location` blocks. Mitigation: a single shared `include /etc/nginx/snippets/security-headers.conf;` directive.
- **NF-H3 token mapping:** the exact CSS variable names (`--state`, `--ok`, `--surface`, `--ink`, `--paper`) must be verified against `client/src/styles/tokens.css` before the search-and-replace. If tokens are missing, add them in a small precursor commit (still within PR #3) rather than scope-creep into PR #2.
- **CI noise concern (project-memory feedback):** the 5-PR sequence is partially mitigation — small PRs surface CI flakes early. If PR #1 alone produces noise, halt and investigate before opening #2.

## 10. Done criteria

For each PR:

- All listed findings closed by file:line.
- All listed verification steps pass.
- CI green on the branch.
- PR description lists which review IDs the PR closes (e.g., `Closes: N-C2, N-H3, N-M8, N-H4`).

For the whole effort:

- A re-run of the §7.6 Phase 0 checklist shows 13/15 items resolved (the 2 K8s items, I-C2/I-H10 + N-H6, are explicitly deferred and noted in the deferred-spec backlog).
- The password-admin module's still-present M/L items are zero.
- `docker compose -f ... -f docker-compose.prod.yml config` validates.
- `docs/deployment.md` exists and a fresh reader can deploy from it.

---

_Author: brainstorming session 2026-05-03. Source review at `CODE_REVIEW_REPORT_2026-04-29.md`. Implementation plan to follow via `superpowers:writing-plans`._
