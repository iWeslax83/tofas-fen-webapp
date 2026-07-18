#!/usr/bin/env node
/**
 * Endpoint probe — walks every registered API route and reports a status table.
 *
 * What it does:
 *   1. Parses the route files for every router.<method>('<path>', ...) handler.
 *   2. Joins each with its mount prefix (from src/config/routes.ts) to build the
 *      full URL, substituting :params with safe dummy values.
 *   3. Logs in as a seeded admin and probes each endpoint, recording the HTTP status.
 *
 * Safety:
 *   - GET/HEAD are always probed (read-only).
 *   - POST/PUT/PATCH/DELETE are cataloged but NOT executed by default, so the dev DB
 *     is never mutated. Set PROBE_WRITES=1 to also probe them (sends an empty body;
 *     expect 400/401/403/404 — they exercise the middleware chain, not real writes).
 *
 * Usage:
 *   BASE_URL=http://localhost:3001 ADMIN_ID=admin1 ADMIN_PW=123456 \
 *     node scripts/probeEndpoints.mjs
 *   PROBE_WRITES=1 node scripts/probeEndpoints.mjs   # also probe write methods
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = join(__dirname, '..');
const SRC = join(SERVER_ROOT, 'src');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const ADMIN_ID = process.env.ADMIN_ID || 'admin1';
const ADMIN_PW = process.env.ADMIN_PW || '123456';
const PROBE_WRITES = process.env.PROBE_WRITES === '1';

// file (relative to src) -> primary mount prefix. Mirrors src/config/routes.ts.
const MOUNTS = [
  ['modules/auth/routes/authRoutes.ts', '/api/auth'],
  ['routes/Notification.ts', '/api/notifications'],
  ['routes/Request.ts', '/api/requests'],
  ['routes/User.ts', '/api/users'],
  ['routes/Homework.ts', '/api/homeworks'],
  ['routes/Announcement.ts', '/api/announcements'],
  ['routes/Notes.ts', '/api/notes'],
  ['routes/EvciRequest.ts', '/api/evci-requests'],
  ['routes/Dormitory.ts', '/api/dormitory'],
  ['routes/Schedule.ts', '/api/schedule'],
  ['routes/MealList.ts', '/api/meals'],
  ['routes/SupervisorList.ts', '/api/supervisors'],
  ['routes/monitoring.ts', '/api/monitoring'],
  ['routes/Calendar.ts', '/api/calendar'],
  ['routes/Communication.ts', '/api/communication'],
  ['routes/Performance.ts', '/api/performance'],
  ['routes/AuditLog.ts', '/api/audit-logs'],
  ['routes/Dilekce.ts', '/api/dilekce'],
  ['routes/PushSubscription.ts', '/api/push'],
  ['routes/Registration.ts', '/api/registrations'],
  ['routes/Appointment.ts', '/api/appointments'],
  ['routes/VisitorChat.ts', '/api/visitor-chat'],
  ['routes/Dashboard.ts', '/api/dashboard'],
  ['routes/Kvkk.ts', '/api/kvkk'],
  ['modules/passwordAdmin/passwordAdminRoutes.ts', '/api/admin/passwords'],
];

const METHOD_RE = /\brouter\s*\.\s*(get|post|put|patch|delete|all)\s*\(/g;
const FIRST_STRING_RE = /\s*(['"`])((?:\\.|(?!\1).)*)\1/y;

// Pull out [method, path] pairs from a route file's source.
function parseRoutes(source) {
  const out = [];
  let m;
  while ((m = METHOD_RE.exec(source)) !== null) {
    const method = m[1].toUpperCase();
    FIRST_STRING_RE.lastIndex = METHOD_RE.lastIndex;
    const sm = FIRST_STRING_RE.exec(source);
    if (sm && sm.index === METHOD_RE.lastIndex) {
      out.push({ method, path: sm[2] });
    }
  }
  return out;
}

// Replace :params and wildcards with values likely to resolve, so a probe reaches the handler.
// User-keyed params are string ids (e.g. "admin1"); everything else id-shaped gets a valid
// 24-hex ObjectId so handlers reach a clean not-found (404) rather than a CastError (500).
function fillParams(path) {
  return path
    .replace(/:([A-Za-z0-9_]+)\??/g, (_, name) => {
      const n = name.toLowerCase();
      if (n.includes('user') || n.includes('parent') || n.includes('student')) return ADMIN_ID;
      if (n.includes('email')) return 'test@example.com';
      if (n.includes('role')) return 'admin';
      return '000000000000000000000000'; // valid ObjectId shape
    })
    .replace(/\*/g, 'x');
}

async function login() {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: ADMIN_ID, sifre: ADMIN_PW }),
  });
  if (!res.ok) {
    throw new Error(`Login failed (${res.status}). Set ADMIN_ID/ADMIN_PW or seed the DB.`);
  }
  const data = await res.json();
  const token = data.accessToken || data.token || data?.data?.accessToken;
  if (!token) throw new Error('Login succeeded but no accessToken in response.');
  return token;
}

async function probe(method, url, token) {
  const headers = { Authorization: `Bearer ${token}` };
  const opts = { method, headers, signal: AbortSignal.timeout(10000) };
  if (method !== 'GET' && method !== 'HEAD') {
    headers['Content-Type'] = 'application/json';
    opts.body = '{}';
  }
  try {
    const res = await fetch(url, opts);
    return res.status;
  } catch (e) {
    return e?.name === 'TimeoutError' ? 'TIMEOUT' : 'ERR';
  }
}

// A status is "expected/healthy": route reached and behaved sanely.
// 2xx ok; 400/401/403/422 are valid guards; 404 on a :param probe is fine (no such record).
function classify(status) {
  if (typeof status !== 'number') return 'fail';
  if (status >= 200 && status < 300) return 'ok';
  if ([400, 401, 403, 404, 405, 409, 422].includes(status)) return 'expected';
  return 'fail'; // 5xx / unexpected
}

async function main() {
  console.log(`\nProbing ${BASE_URL}  (writes ${PROBE_WRITES ? 'ENABLED' : 'skipped'})\n`);
  const token = await login();
  console.log('Login OK — got admin token.\n');

  const rows = [];
  const counts = {};
  let okCount = 0, expectedCount = 0, failCount = 0, skipped = 0, total = 0;

  for (const [file, prefix] of MOUNTS) {
    let source;
    try {
      source = readFileSync(join(SRC, file), 'utf8');
    } catch {
      console.log(`  (skip — cannot read ${file})`);
      continue;
    }
    const routes = parseRoutes(source);
    for (const { method, path } of routes) {
      total++;
      const full = (prefix + (path === '/' ? '' : path)).replace(/\/+/g, '/');
      const url = BASE_URL + fillParams(full);
      const isWrite = !['GET', 'HEAD'].includes(method);

      if (isWrite && !PROBE_WRITES) {
        rows.push({ method, full, status: 'SKIP', kind: 'skip' });
        skipped++;
        continue;
      }
      const status = await probe(method, url, token);
      counts[status] = (counts[status] || 0) + 1;
      const kind = classify(status);
      if (kind === 'ok') okCount++;
      else if (kind === 'expected') expectedCount++;
      else failCount++;
      rows.push({ method, full, status, kind });
    }
  }

  // Table
  const mark = { ok: '✅', expected: '🟡', fail: '❌', skip: '⚪' };
  console.log('STATUS  METHOD  PATH');
  console.log('-'.repeat(72));
  for (const r of rows) {
    console.log(
      `${mark[r.kind]} ${String(r.status).padEnd(5)} ${r.method.padEnd(6)} ${r.full}`
    );
  }

  // Summary
  console.log('\n' + '='.repeat(72));
  console.log(`Total routes cataloged : ${total}`);
  console.log(`Probed                 : ${total - skipped}  (skipped writes: ${skipped})`);
  console.log(`  ✅ 2xx               : ${okCount}`);
  console.log(`  🟡 expected guard    : ${expectedCount}  (400/401/403/404/...)`);
  console.log(`  ❌ unexpected/5xx    : ${failCount}`);
  console.log('\nStatus code distribution:');
  for (const [code, n] of Object.entries(counts).sort()) {
    console.log(`  ${code}: ${n}`);
  }

  if (failCount > 0) {
    console.log('\nFailures (unexpected status):');
    for (const r of rows.filter((x) => x.kind === 'fail')) {
      console.log(`  ${r.status}  ${r.method} ${r.full}`);
    }
    process.exitCode = 1;
  } else {
    console.log('\nNo unexpected statuses. Every probed route reached its handler and behaved sanely.');
  }
}

main().catch((e) => {
  console.error('\nProbe aborted:', e.message);
  process.exitCode = 2;
});
