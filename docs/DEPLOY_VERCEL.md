# Deploying with Vercel

This guide covers the **managed-hosting path**: frontend on Vercel, backend on a
container host, database and cache as managed services. You do not touch a
server, and the free/hobby tiers are enough to get the whole thing online.

If you would rather self-host the entire stack on your own machine with Docker
Compose or Kubernetes, that is already documented in
[PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) — use that instead. The
two guides are alternatives, not steps in a sequence.

---

## Read this before you start: Vercel cannot host the backend

Vercel runs **serverless functions**. They spin up to answer a request and get
frozen or destroyed right after. That model is fine for the React client, which
is just static files. It is genuinely incompatible with this backend:

| What the server does              | Where                                     | Why serverless breaks it                                         |
| --------------------------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| Runs scheduled cron jobs          | `server/src/services/SchedulerService.ts` | Nothing is running between requests, so the jobs never fire      |
| Holds open WebSocket connections  | `server/src/utils/websocket.ts`           | Connections are long-lived; functions are not                    |
| Writes rotating log files to disk | Winston, `server/logs/`                   | The filesystem is ephemeral and read-only                        |
| Keeps a pooled MongoDB connection | Mongoose                                  | Every cold start opens a new pool; Atlas hits its connection cap |

People do force Express onto Vercel, and the deploy _appears_ to work — routes
answer, login succeeds. Then a week later nobody can work out why the nightly
jobs never ran. Don't. Put the backend on something that stays running.

**The architecture this guide builds:**

```
Browser
  |
  |-- https://okul.example.com ------> Vercel          (React static bundle)
  |                                      |
  '-- https://api.okul.example.com ----> Railway       (Express server, always on)
                                           |
                                           |--> MongoDB Atlas   (database)
                                           '--> Upstash Redis   (cache, sessions, rate limits)
```

Railway is the example throughout because it is the least fiddly. **Render** and
**Fly.io** work identically — all three build the existing `server/Dockerfile`,
so nothing in the repo changes if you pick a different one. Swap the name.

---

## Prerequisites

- The repo pushed to GitHub (all four services deploy from the repo)
- Accounts: [Vercel](https://vercel.com), [Railway](https://railway.app),
  [MongoDB Atlas](https://mongodb.com/atlas), [Upstash](https://upstash.com)
- Node 20+ locally, for generating secrets

Order matters. Database and cache first, because the backend needs their URLs.
Backend next, because the frontend needs its URL. Frontend last.

---

## Step 1 — MongoDB Atlas

1. Create a **free M0 cluster**. Any region near your users; for Turkey,
   Frankfurt (`eu-central-1`) is the usual pick.
2. **Database Access** → Add New Database User. Use a generated password and
   save it — Atlas will not show it again.
3. **Network Access** → Add IP Address. Railway does not publish a fixed egress
   IP on its lower tiers, so `0.0.0.0/0` (allow from anywhere) is the practical
   choice. This is safe _only because_ the database user has a strong password
   and TLS is on — but understand you are relying entirely on those.
4. **Connect** → Drivers → copy the connection string. It looks like:

   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/tofas-fen?retryWrites=true&w=majority
   ```

   Substitute the real password and put `tofas-fen` as the database name.

> **The error that will waste your afternoon.** If the backend cannot reach
> Atlas, Mongoose very often reports it as an IP-allowlist problem when the real
> cause is TLS. `mongodb+srv://` URIs require TLS, and it defaults on. Before you
> go re-checking Network Access for the third time, confirm the TLS option
> instead. See `MONGODB_TLS` in `server/.env.example`.

---

## Step 2 — Upstash Redis

The server uses Redis for sessions, response caching, and rate limiting. It is
not optional — rate limiting sits in front of the login route.

1. Create a database. Pick the **same region as the backend**; a cache you have
   to cross an ocean to reach is worse than no cache.
2. Copy the connection string from the Redis tab (**not** the REST API URL —
   this app speaks the Redis protocol, not Upstash's HTTP API).

   ```
   rediss://default:PASSWORD@your-db.upstash.io:6379
   ```

   Note `rediss://` with two S's — that is TLS, and it is what you want.

The server accepts either a single `REDIS_URL` or the split
`REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`/`REDIS_TLS` variables. With Upstash,
`REDIS_URL` is one variable instead of four. Use it.

---

## Step 3 — Generate the secrets

Run these locally. Every value must be unique to your deployment — never reuse
anything from `.env.example`, and never commit the results.

```bash
# JWT_SECRET and JWT_REFRESH_SECRET -- run twice, use DIFFERENT values.
# Reusing one value for both means a stolen refresh token is also a valid
# access token, which defeats the point of having two.
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# ENCRYPTION_KEY -- must be exactly 64 hex chars (32 bytes). The length is
# enforced; the server will not boot with a wrong-length key.
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# VAPID keys for web push -- emits both halves of a matched pair.
# Regenerating these later silently invalidates every existing push
# subscription, so generate once and keep them.
npx web-push generate-vapid-keys
```

There is also `npm run generate-secrets` at the repo root, which produces the
full set in one go.

---

## Step 4 — Deploy the backend to Railway

1. **New Project** → Deploy from GitHub repo → select this repo.
2. **Settings → Root Directory**: `server`

   This is the step people miss. Without it Railway builds from the repo root,
   finds the monorepo `package.json`, and produces something that is not your
   API.

3. Railway will detect `server/Dockerfile` and use it. The image exposes `3001`
   and ships a `HEALTHCHECK` already, so there is nothing to configure.

4. **Variables** → add the following. This is the complete list the server needs
   in production; anything in `server/.env.example` not listed here can keep its
   default.

   | Variable                    | Value                                                    |
   | --------------------------- | -------------------------------------------------------- |
   | `NODE_ENV`                  | `production`                                             |
   | `PORT`                      | `3001`                                                   |
   | `MONGODB_URI`               | the Atlas string from Step 1                             |
   | `REDIS_URL`                 | the Upstash string from Step 2                           |
   | `JWT_SECRET`                | generated, 128 hex chars                                 |
   | `JWT_REFRESH_SECRET`        | generated, **different** from above                      |
   | `ENCRYPTION_KEY`            | generated, exactly 64 hex chars                          |
   | `VAPID_PUBLIC_KEY`          | from `web-push`                                          |
   | `VAPID_PRIVATE_KEY`         | from `web-push`                                          |
   | `FRONTEND_URL`              | your Vercel URL — **fill in after Step 5**               |
   | `CORS_ORIGIN`               | same as `FRONTEND_URL`                                   |
   | `SMTP_HOST`                 | e.g. `smtp.gmail.com`, or your provider's                |
   | `SMTP_PORT`                 | `587`                                                    |
   | `SMTP_USER`                 | the sending address                                      |
   | `SMTP_PASS`                 | app password — **not** your account password (see below) |
   | `SMTP_FROM`                 | the address mail should appear to come from              |
   | `BCRYPT_ROUNDS`             | `12`                                                     |
   | `AUTH_RATE_LIMIT_WINDOW_MS` | `60000`                                                  |
   | `AUTH_RATE_LIMIT_MAX`       | `5`                                                      |
   | `RATE_LIMIT_WINDOW_MS`      | `60000`                                                  |
   | `RATE_LIMIT_MAX_REQUESTS`   | `100`                                                    |
   | `SENTRY_DSN`                | optional                                                 |

   > **Do not copy the rate limits out of `.env.example`.** Those are set to
   > `1000` for local development. Shipping that to production means you have
   > effectively no brute-force protection on the login endpoint. The values in
   > the table above are the production ones.

   > **`SMTP_PASS` for Gmail is an App Password**, not your Google password.
   > Google Account → Security → 2-Step Verification → App passwords. The option
   > does not appear until 2FA is switched on. For real volume, use a
   > transactional provider (Resend, Postmark, SendGrid) — Gmail will throttle
   > you.

5. **Settings → Networking → Generate Domain.** You get something like
   `tofas-api.up.railway.app`. Save it; the frontend needs it next.

6. Confirm it is alive:

   ```bash
   curl https://tofas-api.up.railway.app/health
   ```

   If this does not return successfully, stop here. A frontend pointed at a dead
   API is just a slower way to discover the same problem.

---

## Step 5 — Deploy the frontend to Vercel

The client is a Vite SPA. Two things need to be right, and both of them are
things Vercel will not warn you about.

### 5a. Add `vercel.json`

React Router handles routing in the browser, but Vercel does not know that. A
visitor who loads `/login` directly — or refreshes on any page — asks Vercel for
a file at that path, which does not exist, and gets a 404. Every route except
`/` appears broken.

This repo now ships a `vercel.json` at the root that rewrites all paths to
`index.html` so the SPA can route them. You do not need to create it; just be
aware that removing it breaks every deep link.

### 5b. Import the project

1. **Add New → Project** → import the GitHub repo.
2. Set the build settings explicitly. This is an npm-workspaces monorepo, so the
   defaults are wrong:

   | Setting          | Value                    |
   | ---------------- | ------------------------ |
   | Framework Preset | Vite                     |
   | Root Directory   | _leave as the repo root_ |
   | Build Command    | `npm run build:client`   |
   | Output Directory | `client/dist`            |
   | Install Command  | `npm install`            |

   Keep Root Directory at the repo root: `build:client` runs through **Turbo**,
   which is installed in the root `node_modules`. Point Vercel at `client/` and
   the install skips the root, Turbo is not there, and the build command fails.

3. **Environment Variables** — add these for **Production, Preview, and
   Development**:

   | Variable          | Value                                                                   |
   | ----------------- | ----------------------------------------------------------------------- |
   | `VITE_API_URL`    | `https://tofas-api.up.railway.app` (from Step 4, **no trailing slash**) |
   | `VITE_SENTRY_DSN` | optional                                                                |

   > **This is the one that produces a blank page.** `VITE_API_URL` is inlined
   > into the bundle at _build_ time, not read at run time. If it is missing, the
   > production build throws on boot and renders **nothing** — no error message,
   > no fallback UI, just white. There is no clue in the browser except a console
   > error. If you ever see a blank deploy, check this variable first.
   >
   > The same property means **changing it later requires a redeploy.** Editing
   > the variable in Vercel's dashboard does nothing to the already-built bundle
   > until you trigger a new build.

4. Deploy. You get `your-project.vercel.app`.

---

## Step 6 — Close the CORS loop

The backend refuses browser requests from origins it does not know, so it has to
be told the frontend's real URL. You could not do this in Step 4 because the URL
did not exist yet.

Go back to **Railway → Variables** and set both to your Vercel URL:

```
FRONTEND_URL=https://your-project.vercel.app
CORS_ORIGIN=https://your-project.vercel.app
```

No trailing slash. Railway redeploys automatically.

If you are using a custom domain (Step 8), use the custom domain here, not the
`.vercel.app` one.

---

## Step 7 — Prepare the database

Run these **once**, against production, from your machine. Substitute your real
Atlas URI.

```bash
cd server

# Indexes. Skipping this does not break anything visibly -- it just makes every
# query slow, and it stays slow, and nobody remembers why.
MONGODB_URI="mongodb+srv://..." npm run create-indexes

# Migrations.
MONGODB_URI="mongodb+srv://..." npm run migrate:up
```

> ### Do not run `npm run seed` against production.
>
> The seed script calls `deleteMany`. It exists to reset a _development_
> database to a known state. Pointed at production it will delete your real data,
> and there is no confirmation prompt.
>
> The specific way people get hurt: `server/.env` on a machine that has been used
> for real work often already contains the **production** `MONGODB_URI`. So
> running a bare `npm run seed` — with no arguments, looking completely harmless
> — wipes the live database. If you must seed, pass an explicit override:
>
> ```bash
> MONGODB_URI="mongodb://localhost:27017/tofas-fen" ENCRYPTION_KEY="..." npm run seed
> ```

---

## Step 8 — Custom domain (optional)

**Frontend:** Vercel → Project → Settings → Domains → add `okul.example.com`.
Vercel gives you a CNAME to add at your DNS provider. TLS is automatic.

**Backend:** Railway → Settings → Networking → Custom Domain → add
`api.okul.example.com`. Also a CNAME. Also automatic TLS.

Then **go back to Step 6** and update `FRONTEND_URL` / `CORS_ORIGIN` to the
custom domain, and update `VITE_API_URL` in Vercel to the custom API domain —
**and redeploy the frontend**, because that value is baked in at build time.

Forgetting the redeploy here is the single most common way this setup appears
broken after a domain change.

---

## Step 9 — Verify it actually works

Not "the deploy went green" — actually works:

```bash
# 1. API is up
curl https://api.okul.example.com/health

# 2. CORS is configured for the real frontend origin. If Access-Control-Allow-Origin
#    is missing from the response, the browser will block every request and the
#    app will look completely dead with only a console error to show for it.
curl -I -H "Origin: https://okul.example.com" \
     https://api.okul.example.com/health | grep -i access-control
```

3. Open the site. **The login page should show the campus video**, then settle
   onto a still frame. If you get a white page instead, that is `VITE_API_URL` —
   see Step 5b.
4. Log in. A successful login proves the whole chain at once: the browser reached
   the API, CORS passed, the API reached Atlas, bcrypt verified, JWT signed, and
   Redis accepted the session.
5. Hard-refresh on `/login`. If you get a 404, `vercel.json` is missing or wrong.

---

## Troubleshooting

**Blank white page, no error UI.** `VITE_API_URL` was not set at build time.
Set it in Vercel and **redeploy** — editing the variable alone does not fix the
already-built bundle.

**404 on refresh, or on any URL except `/`.** Missing SPA rewrite. See `vercel.json`.

**Every API call fails; console says CORS.** `CORS_ORIGIN` on Railway does not
exactly match the browser's origin. It is an exact string match: `https://` vs
`http://`, a trailing slash, or `www.` all count as different origins.

**Login returns 429 after a few tries.** Working as intended —
`AUTH_RATE_LIMIT_MAX=5` per minute. It also means **E2E tests must run with
`--workers=1`**, or the parallel workers rate-limit each other and you will spend
an hour debugging a test failure that is really just your own rate limiter.

**MongoDB times out, error mentions IP allowlist.** Check TLS before you touch
Network Access. See the note in Step 1.

**Backend cold-starts or sleeps.** Free tiers idle out. Railway's hobby plan does
not sleep; Render's free tier does (roughly 15 minutes idle → ~30s first
request). If the first login of the morning takes 30 seconds, that is why —
upgrade the plan, do not go hunting in the code.

---

## What this costs

| Service       | Free tier                 | When you outgrow it                       |
| ------------- | ------------------------- | ----------------------------------------- |
| Vercel        | Generous for a static SPA | Effectively never, at school scale        |
| Railway       | ~$5/mo credit             | Paid almost immediately; it is always-on  |
| MongoDB Atlas | M0, 512 MB                | ~$9/mo (M2) when storage runs out         |
| Upstash       | 10k commands/day          | Cheap; caching plus rate limiting adds up |

Realistically about **$5–15/month**. The backend is the only piece that must be
always-on, and it is the only one you will reliably pay for.

---

## See also

- [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) — self-hosted Docker
  Compose and Kubernetes, the alternative to this guide
- [SSL_SETUP.md](./SSL_SETUP.md) — certificates when self-hosting (Vercel and
  Railway both handle TLS for you, so you can skip it on this path)
- [SECURITY.md](./SECURITY.md) — hardening checklist
- `server/.env.example` — every backend variable, annotated
- `client/.env.example` — the two frontend variables and the build-time trap
