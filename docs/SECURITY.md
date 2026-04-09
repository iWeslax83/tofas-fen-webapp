# Security Guide

## Recent hardening (2026-Q2 review cycle)

Full report: [`CODE_REVIEW_REPORT.md`](../CODE_REVIEW_REPORT.md) at repo root.

The list below is the short form. Each item references the finding ID in the
review report so you can trace back to the rationale and the fix commit.

### Critical / High — backend

- **B-C1** — `express-async-errors` is imported at the top of `server/src/index.ts`; any async route handler that rejects is routed to the error handler instead of crashing the process.
- **B-C3** — 2FA attempt counter is now strictly monotonic via atomic `$inc`. See `authService.ts`.
- **B-C4** — WAF middleware is async and awaits the Redis block-check; the first request from a distributed-blocked IP is rejected, not the second. Regression-covered by unit tests.
- **B-C5** — `ENCRYPTION_KEY` is **required** in production. The JWT_SECRET fallback is gated to non-production environments only. See `server/src/utils/encryption.ts`.
- **B-C6** — User search endpoint caps query length at 100 chars and applies real pagination.
- **B-H2** — CSRF middleware enforces Origin allowlist (with Referer fallback) on authenticated mutations, plus a double-submit cookie. The server issues a non-httpOnly `csrfToken` cookie on login / refresh / verify-2fa, the client reads it from `document.cookie` and echoes it in `X-CSRF-Token`. Covered by 22 unit tests in `src/test/unit/csrf.test.ts`.
- **B-H3** — bcrypt cost factor is env-aware: 13 in production, 4 in test, 10 in dev.
- **B-H4** — Registration approval no longer emails plaintext passwords. New `POST /api/auth/forgot-password` + `POST /api/auth/reset-password` flow: store only the SHA-256 hash of the reset token, 1h expiry, tokenVersion bump on success. 8 integration tests in `src/test/integration/password-reset.test.ts`.
- **B-H6** — `/graphql` is rate-limited (60/min/IP default) by `graphqlLimiter` mounted before Apollo.
- **B-H7** — Decryption failures of `iv:authTag:ciphertext` values fail-closed (return `''` + log an alert) instead of leaking raw ciphertext downstream.
- **B-M3 / B-M8** — Login's "user not found" branch now runs against a pre-computed real bcrypt hash so the timing path matches a real compare (previously the placeholder was a junk string that short-circuited immediately).
- **B-M5** — Error handler gates stack traces on `NODE_ENV==='development' && EXPOSE_ERROR_DETAILS==='true'`, so a misbuilt image with stale `NODE_ENV=development` still doesn't leak stacks.
- **B-M7** — Response cache keys include `userId:role`, and writers use the exported `buildCacheKey` helper so cross-user leaks via URL collisions are impossible.
- **B-L4** — Rate limiters key on the authenticated user ID (`u:<id>`) when available, falling back to IP. Shared NATs (e.g. the school network) no longer let one student exhaust every other student's quota.

### Critical / High — client

- **F-C1** — `authStore.initialized` flag flips in `checkAuth` finally. `ProtectedRoute` and `RootRedirect` wait for it before making redirect decisions, fixing the flash-of-login-screen on every hard reload.
- **F-C2** — Zustand `persist` middleware removed. Auth state is in-memory only; the full user object is no longer mirrored to `localStorage` (previously an XSS sink). `/api/auth/me` bootstraps state on mount. One-shot cleanup wipes legacy `auth-storage` / `user` keys on every module load.
- **F-H3** — Sentry `beforeSend` scrubbing rewritten with a regex-based key match (catches `tcknHash`, `student_tckn`, `refresh_token`, `sifreHash`, `notesPayload`, etc.), word-boundary matching on narrow tokens (`card`, `iban`), full redaction of `body`/`payload`/`data`/`response`/`request` keys, breadcrumb body scrubbing, and JWT/TCKN pattern stripping from breadcrumb messages.
- **F-H4** — `updateUser` now does recursive deep-merge on nested objects; partial updates don't nuke sibling keys.
- **F-H5** — New `RouteBoundary` component keys `EnhancedErrorBoundary` on `pathname`, so a render crash in one page doesn't nuke the shell — navigating elsewhere remounts the boundary.
- **F-H7** — `resend2FA` reuses an in-flight promise on concurrent calls; double-clicking can't race two requests.
- **F-H8** — Production builds strip `console.*` via esbuild's `drop` option. `safeLogger` helpers also gate on `import.meta.env.DEV`.

### Critical / High — infrastructure

- **I-C1** — Every k8s Deployment has `securityContext` (runAsNonRoot, readOnlyRootFilesystem, drop ALL capabilities, seccomp RuntimeDefault) plus writable `emptyDir` mounts for `/tmp`, `/var/cache/nginx`, `/var/run`, `/app/logs`.
- **I-C3** — `k8s/network-policy.yaml` enforces default-deny + explicit allows (DNS, ingress-nginx + cert-manager → frontend :8080, frontend + ingress-nginx + monitoring → backend :3001, backend → mongo/redis/https/smtp). cert-manager and monitoring allows added after the code-reviewer flagged the original ruleset would break ACME challenges and Prometheus scraping.
- **I-C4** — CSP in `nginx/nginx.conf` dropped `unsafe-eval` and added `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`. `unsafe-inline` is retained temporarily for script/style (Vite module preload scripts) with a documented migration path to nonces.
- **I-C5** — `client/Dockerfile` runs fully as the unprivileged nginx user on port 8080. Writable dirs chown'd, PID moved to `/tmp/nginx.pid`, `user nginx;` directive dropped.
- **I-C6** — `.dockerignore` files added for both `client/` and `server/` (excludes `.env`, `node_modules`, `.git`, `coverage`, `logs`, tests, editor files).
- **I-C11** — Grafana admin password fail-closed via `${GRAFANA_ADMIN_PASSWORD:?…}`.
- **I-C12** — Redis healthcheck uses `REDISCLI_AUTH` env var; no password on argv / `docker inspect`.
- **I-H1 / I-H2** — Backend resources bumped 256Mi/250m → 512Mi/500m request, 1Gi/1 CPU limit. HPA memory target 80% → 60%.
- **I-H5** — nginx SSL hardened: `ssl_session_timeout 5m`, `ssl_session_tickets off`, `ssl_dhparam`, OCSP stapling + `ssl_stapling_verify`.
- **I-H11** — `mongo-init.js` creates a dedicated `tofas_app` user with `readWrite` on the `tofas-fen` db only, sourced from `MONGO_APP_PASSWORD`. Idempotent.
- **I-H13 / I-H14 / I-H15** — `scripts/deploy.sh` uses `set -euo pipefail`, checks `mongodump` exit code and refuses empty backups, requires typed `"yes"` confirmation (or `FORCE=1`) before `mongorestore`.
- **I-H16** — `docker-compose.yml` backend and frontend run with `read_only: true` + tmpfs mounts + `security_opt: no-new-privileges`.
- **I-H17** — `.github/dependabot.yml` tracks GitHub Actions, npm (root + workspaces), and Docker base images with weekly updates. The right long-term answer to action-tag supply-chain risk.
- **I-H18** — `k8s/pdb.yaml` enforces `minAvailable: 1` per Deployment.
- **I-H19** — Namespace `ResourceQuota` + `LimitRange` + Pod Security "restricted" enforce label.
- **I-L1** — `mongo-init.js` attaches `$jsonSchema` validators to users/notes/homeworks/evci_requests with `validationLevel: moderate` + `validationAction: error`. Final safety net below the Mongoose layer.

### CI/CD

- **I-C8** — Trivy image scans (client + server) run between build and push. HIGH/CRITICAL fixable CVEs block the push; SARIF uploaded to the GitHub Security tab.
- **I-H7** — Workflow-level `permissions: { contents: read }` with per-job widening only where needed (`packages: write`, `security-events: write`).
- **I-H8** — `npm audit` tightened to `--omit=dev --audit-level=high`. Snyk runs as a hard gate when `SNYK_TOKEN` is set.
- **I-H9** — Dead OWASP ZAP step removed (was scanning a never-started localhost:3001).
- **I-M4** — Coverage gate rewritten from `bc -l` (unreliable on GH runners) to portable `node -e`.
- **I-M5** — buildx cache `mode=max` → `mode=min`.
- **I-M6** — TruffleHog added alongside Gitleaks in `ci.yml`.
- **I-M8 / I-M9** — `monitoring/alerts.yml` fixed: `DatabaseConnectionIssues` now references `db_queries_total{status="error"}` (the label-based series that actually exists) instead of the non-existent `db_query_errors_total` counter.

### Test coverage added

- `src/test/unit/waf.test.ts` — +2 tests for the Redis-blocked branch (regression guard for B-C4).
- `src/test/unit/csrf.test.ts` — 22 new tests pinning the B-H2 semantic surface.
- `src/test/integration/password-reset.test.ts` — 8 new tests for the B-H4 flow.
- Total: **+38 tests**, plus +35 tests unblocked by the vitest IPv4 config fix.

## 🔐 Secret Management

### Important: Never Commit Secrets to Git

**CRITICAL SECURITY RULE:** Never commit files containing secrets, passwords, API keys, or sensitive information to Git.

### Files That Must NOT Be Committed

The following files are automatically ignored by `.gitignore`:

- `env.production` - Production environment variables with secrets
- `server/.env` - Server environment variables
- `client/.env` - Client environment variables
- `k8s/secret.yaml` - Kubernetes secrets
- `k8s/production/secrets.yaml` - Production Kubernetes secrets
- `sealed-secret.yaml` - Sealed secrets
- Any file matching `*.secret`, `*.secrets`, `*secret*.yaml`

### Template Files

Use template files for reference:

- `env.production.template` - Template for production environment variables
- `k8s/secret.yaml.template` - Template for Kubernetes secrets
- `server/env.example` - Example server environment variables

### Generating Secrets

Use the provided script to generate secure secrets:

```bash
node scripts/generate-secrets.js
```

This generates:

- `JWT_SECRET` (64 hex characters)
- `JWT_REFRESH_SECRET` (64 hex characters)
- `SESSION_SECRET` (64 hex characters)
- `MONGO_PASSWORD` (base64 encoded)
- `REDIS_PASSWORD` (optional, 32 hex characters)

### Setting Up Secrets

1. **Copy template files:**

   ```bash
   cp env.production.template env.production
   cp k8s/secret.yaml.template k8s/secret.yaml
   ```

2. **Generate secrets:**

   ```bash
   node scripts/generate-secrets.js
   ```

3. **Fill in the values:**
   - Copy generated secrets to `env.production`
   - For Kubernetes secrets, base64 encode values:
     ```bash
     echo -n "your-secret" | base64
     ```

4. **Verify .gitignore:**
   ```bash
   git status
   # Should NOT show env.production or secret.yaml
   ```

### If Secrets Were Accidentally Committed

If secrets were committed to Git, follow these steps:

1. **Remove from Git tracking (keeps local file):**

   ```bash
   git rm --cached env.production
   git rm --cached k8s/secret.yaml
   git commit -m "Remove secret files from Git"
   ```

2. **Clean Git history (removes from all commits):**

   ```bash
   # Linux/Mac
   ./scripts/clean-git-history.sh

   # Windows PowerShell
   .\scripts\clean-git-history.ps1
   ```

3. **Force push (if needed):**

   ```bash
   git push --force --all
   ```

4. **⚠️ IMPORTANT:** After cleaning history:
   - All team members must re-clone the repository, OR
   - Run: `git fetch origin && git reset --hard origin/main`
   - Rotate all exposed secrets immediately!

### Secret Storage Best Practices

1. **Local Development:**
   - Use `.env` files (already in `.gitignore`)
   - Never commit these files

2. **Production:**
   - Use environment variables
   - Use secret management services:
     - AWS Secrets Manager
     - HashiCorp Vault
     - Azure Key Vault
     - Google Secret Manager
   - Use Kubernetes Secrets (encrypted at rest)

3. **CI/CD:**
   - Store secrets in CI/CD platform's secret store
   - Never hardcode secrets in pipeline files

### Security Checklist

Before committing code:

- [ ] No `.env` files in commit
- [ ] No `secret.yaml` files with real secrets
- [ ] No hardcoded passwords or API keys
- [ ] No secrets in code comments
- [ ] `.gitignore` is up to date
- [ ] Template files are used for reference

### Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** create a public GitHub issue
2. Email: weslax83@gmail.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact

### Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [Kubernetes Secrets Best Practices](https://kubernetes.io/docs/concepts/configuration/secret/)
