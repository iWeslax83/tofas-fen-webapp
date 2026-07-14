# Screens with no data behind them

The frontend no longer ships invented data. Where a screen has nothing real to
show, it now says so instead of rendering a plausible-looking fake. This is the
list of what is still missing a source, so it is easy to pick up later.

## Removed, and what replaced it

**Ders programı.** The page used to read `DersProgramlari.json`, a file checked
into the client, and for staff it invented a 9/A…12/B class list. There is a
real API — `GET /api/schedule`, which filters by role on the server — so the
page reads that now. **The timetable collection is empty in production**, so the
page will show "Ders programı bulunamadı" until schedules are entered (admin →
create schedule, or `POST /api/schedule`).

**Hızlı İşlemler.** Three hardcoded shortcuts, already reachable from the
sidebar and Ctrl+K. Replaced by **Son Hareketler**, built server-side per role
from records that already exist (grades, homework, announcements, petitions,
registrations). No records yet → an empty feed, not invented rows.

## Still has no data model at all

These are already handled honestly — the dashboard hides the section rather than
printing a zero that looks like a measurement — but they need a backend before
they can show anything:

| Field                       | Where             | What is missing                                                                           |
| --------------------------- | ----------------- | ----------------------------------------------------------------------------------------- |
| `attendance` (devamsızlık)  | student dashboard | No attendance model. Returns `{ percent: 0, last30Days: [] }` and the UI hides the panel. |
| `nextExam` (sıradaki sınav) | student dashboard | No exam model. Returns `null`.                                                            |
| `nextClass`                 | student dashboard | Returns `null`; today's timetable is served instead, from the real schedule.              |

## Seed users are intentionally kept

`admin1`, `teacher1`, `student1`, `parent1` (and their numbered siblings) are
created by `src/seed/testUsers.ts` for local development. They are **not** mock
UI data and were left alone.

Note that `npm run seed:users` does nothing on its own: `testUsers.ts` only
exports `createTestUsers()` — it never connects to a database or calls it. Seed
locally by importing that function from a script that connects first, and always
pass a local `MONGODB_URI` explicitly, because `server/.env` points at the
production cluster and the function begins with a `deleteMany`.
