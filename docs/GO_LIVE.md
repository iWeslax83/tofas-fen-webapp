# Go live: from "deployed" to "actually usable"

The site is deployed, but the database is empty — no indexes, no migrations, no
accounts. Nobody can log in yet. This document takes you from that state to a
working sign-in, in order.

Do these steps from your own machine. They are one-off setup tasks that talk to
the production database directly; none of them belong in a deploy pipeline.

**Time:** about 15 minutes.

---

## Before you start

You need the production MongoDB connection string. In Atlas:
**Database → Connect → Drivers**, and copy the `mongodb+srv://...` URI. Replace
`<password>` with your database user's real password, and make sure the database
name is on the end:

```
mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/tofas-fen?retryWrites=true&w=majority
                                                     ^^^^^^^^^ the database name matters
```

Without the database name, Mongo silently uses `test` and you will end up with a
correctly-populated database that the app never reads from.

Set it once for this terminal session:

```bash
cd server
export PROD_URI="mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/tofas-fen?retryWrites=true&w=majority"
```

> **Why pass the URI explicitly on every command below?**
> `server/.env` may already point at the live cluster. Passing `MONGODB_URI=`
> in front of each command means you are always looking at the URI you are
> about to write to, instead of trusting whatever a file happens to contain.

### Atlas network access

Atlas blocks unknown IPs by default. **Network Access → Add IP Address → Add
Current IP Address**, or these commands will hang and then time out with a
server-selection error.

---

## Step 1 — Run the migrations

Migrations create the indexes the app's queries rely on and drop the retired
`hizmetli` role. There are three (`001`, `002`, `003`), they run in order, and
they record what they've done in a `migrations` collection — so re-running is
safe and already-applied migrations are skipped.

```bash
MONGODB_URI="$PROD_URI" npm run migrate:up
```

Expect each migration to be listed as applied. Run it a second time and it
should report there is nothing to do — that's your confirmation it recorded
state correctly.

## Step 2 — Create the indexes

```bash
MONGODB_URI="$PROD_URI" npm run create-indexes
```

Skipping this doesn't break anything on day one — Mongo will happily do full
collection scans over a small dataset. It gets slow, quietly, as real data
arrives. Do it now.

## Step 3 — Create your administrator account

This is the account you'll actually sign in with:

```bash
MONGODB_URI="$PROD_URI" \
ADMIN_ID="admin" \
ADMIN_NAME="Your Full Name" \
ADMIN_PASSWORD="a-long-unique-password" \
npm run create-admin
```

`ADMIN_ID` is what you type into the **Kullanıcı ID** box on the login page —
it is not an email. `ADMIN_EMAIL` is optional.

The password must be at least 12 characters. This account can read every
student's grades and personal data, so treat it like a root password: generate
it in a password manager and store it there. Don't reuse anything.

If you mistype the password, re-run the same command with `ADMIN_RESET=true` to
overwrite it. The script never deletes anything, and it refuses to silently
overwrite an existing user without that flag.

## Step 4 — Allow cross-site cookies

Your frontend (`*.vercel.app`) and API (`*.onrender.com`) are on **different
sites**, so every API call the browser makes is a cross-site request. Browsers
never attach a `SameSite=Strict` cookie to one — the login response's
`Set-Cookie` headers get dropped on the floor, and the next request is a 401.

In the Render dashboard, add:

```
COOKIE_SAMESITE=none
```

and redeploy. Nothing else will work until you do; the symptom in the browser
console is:

> Cookie “accessToken” has been rejected because it is in a cross-site context
> and its “SameSite” is “Lax” or “Strict”.

This is only needed because the two halves live on different domains. Put them
behind one domain later (`app.example.com` + `api.example.com`) and you can
drop back to the safer `strict`.

## Step 5 — Log in

Go to **https://tofas-fen-webapp.vercel.app/login** and sign in with the
`ADMIN_ID` and password from step 3.

If the backend has been idle, the first request takes 30–60 seconds while Render
wakes the instance up. It will look like the login button is hanging. Wait it
out; the second attempt is instant.

## Step 6 — Add real users

Once you're signed in as admin, create teachers and students through the admin
UI, or use the bulk import (Excel) feature for a whole class at once.

---

## Do not run the seed scripts against production

`npm run seed` and `npm run seed:users` create fixed demo accounts —
`admin1`, `teacher1`, `student1` — **whose password is `123456`**. They are for
local development only.

`seed:users` also calls `deleteMany` on every one of those IDs. It won't wipe
your real data, but publicly-known credentials on an internet-facing school
system with real student records is about as bad as it gets. If you ever run
these locally, point them at a local database, never at `$PROD_URI`.

---

## Two things to fix before real users arrive

### The backend falls asleep

Render's free tier stops your instance after 15 minutes of inactivity. Two
consequences, and the second is the one that bites:

1. The first visitor after a quiet period waits 30–60 seconds.
2. **Scheduled jobs do not run.** The server uses `node-cron` for background
   work. A sleeping instance runs no cron. Anything time-based will silently
   not happen, with no error anywhere.

Render's paid tier (~$7/month) is always-on and fixes both. Do this before
anyone depends on the scheduled work.

### The rate limits are set for development

`server/.env.example` ships relaxed limits (`1000` requests). For a login form
on the open internet you want the auth limiter tight. In the Render dashboard:

```
AUTH_RATE_LIMIT_MAX=5
```

Five failed logins per minute per IP. This is the main thing standing between a
public login page and someone brute-forcing an account.

---

## Don't change ENCRYPTION_KEY

Student TCKN (national ID) numbers are encrypted with `ENCRYPTION_KEY` before
being written to the database. Rotating that key does not re-encrypt existing
rows — it makes every previously-stored TCKN permanently unreadable. If you ever
need to rotate it, that's a data migration, not an environment-variable edit.

---

## When something doesn't work

**Login page is completely blank, no error.** `VITE_API_URL` was missing or
wrong when Vercel built the app. It's compiled into the JavaScript bundle at
build time, not read at runtime — so fixing the variable requires a **redeploy**
to take effect. Confirm the value made it in:

```bash
curl -s https://tofas-fen-webapp.vercel.app/assets/*.js | grep -o "onrender.com" | head -1
```

**Login returns a CORS error.** `CORS_ORIGIN` on Render must exactly match the
Vercel URL, including `https://` and with no trailing slash. The server requires
this variable at boot in production and will refuse to start without it.

**Commands here hang, then fail with a server-selection error.** Almost always
Atlas network access (see above) — not a bad password.

**Login says the user doesn't exist.** Check you're pointed at the right
database. Confirm what's actually there:

```bash
MONGODB_URI="$PROD_URI" npx ts-node -e "
import('./src/db').then(async ({ connectDB }) => {
  await connectDB();
  const { User } = await import('./src/models/User');
  console.log(await User.find({}, 'id rol isActive').lean());
  process.exit(0);
});"
```

An empty array means the migrations and admin creation went somewhere else —
re-check the database name on the end of your URI.
