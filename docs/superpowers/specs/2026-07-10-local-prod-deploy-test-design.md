# Local production deploy test

## Goal

Prove the repo's single-box production topology actually deploys and works, end to
end, on a developer machine — then run the Playwright E2E suite against the
running containers rather than against a Vite dev server.

## Topology

The stack from `docker-compose.yml`, brought up with `--profile production` so the
`nginx` service is included:

```
browser ──https://localhost──> nginx :443 ──┬── / ─────> frontend :8080 (static bundle)
                                            ├── /api/ ─> backend :3001
                                            └── /ws ───> backend :3001
                                                          │
                                                          ├── mongodb :27017
                                                          └── redis :6379
```

`docker-compose.prod.yml` is deliberately _not_ used. Its `NODE_ENV: production`
requires a Mongo replica set (`w: majority`, TLS); the base file sets
`NODE_ENV: staging` precisely because this deploy runs a standalone Mongo
container. The base file plus the `production` profile is the single-box path.

## Result

The stack did not work. Nine defects had to be fixed before a single page would
render, and three of them were production bugs rather than local-environment
friction. After the fixes, all five containers come up healthy from a cold
`down -v` / `up --build`, and all six E2E tests pass against `https://localhost`.

## Defects fixed

### The frontend image never received `VITE_API_URL`

`client/Dockerfile` declares `ARG VITE_API_URL`, but neither compose file passed
`build.args`. Both instead set it under `environment:` on the frontend service —
runtime env on an nginx container, which cannot reach a Vite bundle compiled into
the image at build time. The shipped bundle had `import.meta.env.VITE_API_URL`
undefined, and `resolveApiBaseUrl()` in `client/src/utils/api.ts` throws on module
load when `PROD` is set. Any deploy from these files served a white screen.

Fixed by moving both variables to `build.args` and deleting the no-op
`environment:` blocks. Two consequences follow from `api.ts`:

- The values are **origins**, not API prefixes — `API_ENDPOINTS` already carry a
  leading `/api`. Same-origin serving also removes CORS preflight and cross-site
  cookie concerns.
- The base URL **must** be `https://`; `api.ts` rejects plaintext to avoid leaking
  auth cookies. So the frontend container is only usable behind `nginx`. Its
  direct `:3080` port publication cannot serve a working production bundle.

### The production bundle crashed on load (two separate chunking bugs)

`manualChunks` in `client/vite.config.ts` matched packages by bare substring.
`scheduler` — a hard runtime dependency of `react-dom` — matched nothing and fell
into the catch-all `vendor` chunk, which also holds React-importing libraries.
The resulting circular chunk graph left its exports uninitialised:
`Cannot set properties of undefined (setting 'unstable_now')`.

Matching on package name instead exposed a second, deeper problem: package-level
splitting cuts the module graph where it has edges going _both_ ways.
`@sentry-internal/*` landed in `vendor` yet imports `@sentry/core`;
`victory-vendor` landed in `vendor` yet imports `d3-shape`. That produced
`vendor <-> monitoring-vendor`, `vendor <-> chart-vendor` and
`vendor <-> radix-vendor` cycles, and a `const` read across one of them threw
`Cannot access 'Ms' before initialization`. The app never mounted either way.

Reduced to exactly two vendor chunks, chosen so a cycle cannot form:
`react-vendor` (react, react-dom, scheduler, react-is) is a leaf that imports
nothing, and `vendor` only ever points at it. Verified by dumping the emitted
chunk graph — a passing `vite build` does not catch this.

### CSRF rejected every state-changing request

`server/src/middleware/auth.ts:105` builds the CSRF origin allowlist from
`FRONTEND_URL`, but the backend container was only given `CORS_ORIGIN`. Unset,
`FRONTEND_URL` falls back to `http://localhost:5173`, so every POST/PUT/DELETE
from the deployed frontend returned `403 CSRF koruması: Geçersiz origin`. Logins
worked; nothing else did. The app was effectively read-only in any Docker deploy.

`FRONTEND_URL` also feeds the CSP `connect-src` and the password-reset email
links, which would have mailed users a `localhost:5173` URL. Now passed
explicitly to the backend in both compose files.

### Bulk password import could never insert more than one student

`mongo-init.js` created `{ email: 1 }` as `unique` but **not** `sparse`, while
`server/src/models/User.ts:106` declares `unique + sparse`. mongo-init runs before
Mongoose, so the non-sparse index wins. Email is optional on a user, so the second
account created without one collided on `{ email: null }`:
`E11000 duplicate key error ... index: email_1`. Bulk import creates students with
no email address, so it failed at 500 on any real class list.

### A fresh database could not record a single grade

`mongo-init.js` constrained `notes.academicYear` to numeric bson types, but
`Note.academicYear` is `type: String` with a `new Date().getFullYear().toString()`
default. Every write from the Mongoose model failed validation with code 121.
Unnoticed because `mongo-init.js` only runs on first boot of a fresh volume, and
the existing Atlas database never ran it.

### Auth session endpoints shared the login brute-force budget

`nginx.conf` applied `zone=login` (**5 requests per minute**) to the whole
`/api/auth/` prefix. The SPA calls `/api/auth/me` on every mount, so a user who
merely clicked around got 503s and was bounced back to the login page. The
credential endpoints are now listed explicitly (login, verify-2fa, resend-2fa,
forgot-password, reset-password) and keep the strict limit; the rest get the
normal API budget. Express already applies its own `authLimiter` to exactly the
credential routes.

Also set `limit_req_status 429` — throttled clients were being told 503, which
reads as an outage to both retry logic and monitoring.

### Rate limiting was keyed on the proxy's IP

Express was never told to trust the reverse proxy, so `req.ip` resolved to the
nginx container address: every unauthenticated client shared one rate-limit
bucket, meaning a single attacker could lock the whole school out of login.
express-rate-limit also refused to run, logging
`ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` on every request.

Added `app.set('trust proxy', TRUST_PROXY_HOPS)`, defaulting to `0` (no proxy) and
set to `1` in compose. It is deliberately not hardcoded to `true`: each trusted
hop lets a client forge one more `X-Forwarded-For` entry.

### The frontend container was permanently unhealthy

Two independent problems in the `read_only` + `tmpfs` hardening:

- `/var/cache/nginx` and `/tmp` are tmpfs-mounted, which shadows the ownership the
  Dockerfile `chown`ed underneath and remounts them `root:root 0755`. The
  unprivileged `nginx` user (uid 101) then could not `mkdir client_temp`, and the
  container crash-looped. Fixed with `uid=101,gid=101` tmpfs options.
- The healthcheck fetched `http://localhost:8080/health`. nginx binds IPv4 only —
  the entrypoint script that would add an IPv6 listener cannot write to the
  read-only `conf.d` — and `localhost` resolves to `::1` first, which BusyBox
  `wget` does not retry over IPv4. The container was serving traffic fine and
  still reported unhealthy. Pinned to `127.0.0.1` in the Dockerfile and compose.

### nginx could not start at all

`nginx.conf` references `ssl_dhparam /etc/nginx/ssl/dhparam.pem`, which did not
exist. Generated a 2048-bit `dhparam.pem`.

### Port 27017 collided with a host `mongod`

The mongodb service published `27017:27017` unconditionally. Now
`${MONGO_HOST_PORT:-27017}`. The backend is unaffected either way — it reaches
Mongo as `mongodb:27017` over the compose network.

### Playwright had no way to accept the self-signed cert

Added `ignoreHTTPSErrors`, gated on `E2E_IGNORE_HTTPS_ERRORS=true` so it stays off
against real environments, where a cert error is a finding rather than noise.

## Run procedure

Secrets come from the existing gitignored root `.env`. Per-run overrides are passed
as shell env, which takes precedence over `.env` in compose, so no secrets are
copied anywhere.

```
MONGO_HOST_PORT=27018 CORS_ORIGIN=https://localhost FRONTEND_URL=https://localhost \
  docker compose --profile production up -d --build
```

Seed against the published Mongo port. Both overrides are mandatory:
`server/.env` points `MONGODB_URI` at the **live Atlas cluster**, and the seed
calls `User.deleteMany(...)`; `ENCRYPTION_KEY` differs between `server/.env` and
the root `.env` the container reads, so a host-run seed would otherwise write TCKN
fields the backend cannot decrypt.

```
MONGODB_URI='mongodb://admin:<pw>@localhost:27018/tofas-fen?authSource=admin' \
  MONGODB_TLS=false ENCRYPTION_KEY="$ENCRYPTION_KEY" npm run seed
```

E2E against the deployed stack, serially — `nginx.conf` rate-limits login to
5r/m per IP, and six parallel workers exceed that on their own:

```
E2E_BASE_URL=https://localhost E2E_IGNORE_HTTPS_ERRORS=true \
  E2E_API_BASE=https://localhost npx playwright test --workers=1
```

## Verified

1. All five containers healthy from a cold `down -v` / `up --build`.
2. `https://localhost/health` reports `database: true`, `redis: true`.
3. `http://localhost` 301s to https; the app mounts and renders.
4. `admin1 / 123456` logs in and lands on `/admin`.
5. Bulk import of a 444-row class list previews, imports, and downloads credentials.
6. All 6 Playwright E2E tests pass.
7. `npm run type-check` clean; `csrf.test.ts` 22/22; eslint clean on changed files.

## Known issues, not addressed

- `nginx/ssl/key.pem` is committed to the repository. It is a self-signed
  localhost cert so the blast radius is nil, but a private key in git is a bad
  pattern; it should be generated at setup time. `dhparam.pem` is committed
  alongside it for consistency (dhparam is not secret).
- The CSP in `nginx/snippets/security-headers.conf` and `client/nginx.conf` blocks
  the Google Fonts stylesheet that `index.html` requests, so production silently
  falls back to system fonts. Self-hosting the fonts is the right fix.
- `mongo-init.js` indexes `users.role`, but the field is `rol`. The index is dead.
- The client POSTs to `/api/metrics` and `/api/analytics`, which return 404.
