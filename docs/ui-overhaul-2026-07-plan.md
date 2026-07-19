# UI Overhaul — "Soft Modern" Migration Plan (2026-07)

Approved direction: **Soft Modern** — see the live mockup at `docs/ui-mockups/soft-modern.html`
(open in a browser; theme toggle is the ◐ button in the topbar). The mockup is the spec;
when this document and the mockup disagree, the mockup wins.

Replaces the previous "Devlet" direction. The old mockups (`docs/ui-mockups/i-devlet*.html`)
are historical — in particular the old "no radius > 4px" rule no longer applies.

## Design spec (tokens)

Light:

| Token                             | Value                                                        | Use                                        |
| --------------------------------- | ------------------------------------------------------------ | ------------------------------------------ |
| `--paper`                         | `#faf8f4`                                                    | page background (warm off-white)           |
| `--surface`                       | `#ffffff`                                                    | cards, sidebar, topbar                     |
| `--surface-2`                     | `#f4f1ea`                                                    | table headers, hover fills, skeleton bones |
| `--rule`                          | `#e7e2d8`                                                    | hairline borders                           |
| `--ink` / `--ink-2` / `--ink-dim` | `#221f1a` / `#5c564b` / `#918a7c`                            | text hierarchy                             |
| `--accent`                        | `#c8102e` (hover `#a60d26`, tint `#faeaed`)                  | THE one accent                             |
| `--ok` / `--warn` / `--info`      | `#2e7d46` / `#a05e03` / `#1d5f8a` (+ `-tint` fills)          | status chips only                          |
| `--radius` / `--radius-sm`        | `10px` / `8px`                                               | cards / controls                           |
| `--shadow`                        | `0 1px 2px rgba(34,31,26,.05), 0 2px 8px rgba(34,31,26,.04)` | cards                                      |

Dark: paper `#1b1916`, surface `#242119`, surface-2 `#2c2820`, rule `#3a352b`,
ink `#f1ede4`/`#b5aea0`/`#837c6e`, accent `#ea4a5e` (hover `#f06a7b`, tint `#3a2226`),
ok `#5cb87a`, warn `#d99a45`, info `#6aa8cc`, shadow none.

Typography: **Source Sans 3** (body/UI, weights 400/500/600/700) +
**Source Serif 4** (page titles only, 600/700). Self-hosted woff2, **both `latin` and
`latin-ext` subsets** (Turkish ğ ş İ live in latin-ext — shipping only latin is exactly
the "patchy Turkish" bug). Base font-size 14px in dense screens, line-height 1.5.

Rules that stay from the global design constraints: no gradients, no glassmorphism,
no purple, one accent color, flat solid fills.

Signature moves (all visible in the mockup):

- **Light sidebar** — `--surface` bg, follows the theme (the old hardcoded `#0d0d0d`
  black sidebar dies). Active item: `--accent-tint` bg + accent text + `inset 3px 0 0 var(--accent)`.
  Section labels uppercase 10.5px. Sidebar footer: avatar + name + class/No.
- **Topbar** — sticky, `--surface`, breadcrumb + global search (wired to the existing
  CommandPalette, placeholder "… (⌘K)") + theme toggle + notification icon-button with
  red dot + user cell (name + role).
- **Page header** — Source Serif 4 title, one-line context subtitle, right-aligned
  action buttons. Tab bar under it where the page has sub-views.
- **Full-width content** — no `max-width` container. Dense pages use main-column +
  340px right rail (`grid-template-columns: minmax(0,1fr) 340px`).
- **Inputs** — soft filled boxes: `--paper` bg (dark: `--surface-2`), 1px `--rule`
  border, radius 8px, focus = accent border + `0 0 0 3px var(--accent-tint)` ring.
  This REPLACES the devlet border-bottom-only input style everywhere.
- **Tables** — uppercase 11.5px header row on `--surface-2`, 10px/18px cell padding,
  hover fill, tabular-nums for numeric cells, right-aligned numeric columns,
  two-line cells (main + `cell-sub`), toolbar row (search + filter selects + export),
  footer with "1–6 / 42 kayıt" + numbered pager.
- **Loading** — NO spinners. Thin 3px sliding accent loadbar + opacity-pulse skeleton
  rows (no gradient shimmer).
- **Chips** — pill, 12px/600, tint bg + colored text (`chip-ok/warn/info/accent/neutral`).

## Phasing

Each phase: branch off up-to-date `main`, one commit per page/component, own PR,
wait for CI green before the next phase starts. Never merge PRs — the user merges.

### Phase 0 — Foundation (branch `feat/soft-modern-foundation`)

Everything else inherits from this. No page rewrites here beyond the layout shell.

1. **Fonts**: download Source Sans 3 (400/500/600/700) + Source Serif 4 (600/700)
   woff2, latin + latin-ext, into `client/public/fonts/`. Rewrite
   `client/src/styles/fonts.css` (`@font-face` with the same unicode-range pattern the
   Plex faces use today). Update the `<link rel="preload">` tags in `client/index.html`.
   Keep the Plex files on disk until Phase 6 cleanup.
2. **Tokens**: rewrite the values in `client/src/styles/tokens.css` and the token block
   of `client/src/styles/theme.css` to the spec above (light + dark). Add the new
   tokens that don't exist yet (`--accent-tint`, `--ok-tint`, `--warn-tint`, `--info`,
   `--info-tint`, `--shadow`). Map old names (`--state` etc.) to the new values rather
   than deleting them — pages still referencing old names must not break mid-migration.
3. **Layout shell**: rewrite `ModernDashboardLayout.tsx` + its CSS to the mockup —
   light sidebar (structure, active state, footer user block), sticky topbar (breadcrumb,
   CommandPalette-wired search, theme toggle, notifications, user cell), full-width
   content area (kill any max-width). 32 pages use this layout: this one change moves
   the whole app the furthest.
4. **UI primitives** (`client/src/components/ui/`): restyle Button, Input, Select,
   Card, Chip, Tabs, Dialog, DatePicker, DataTable + DataTableToolbar +
   DataTablePagination + Table, FilePickerButton to the spec. Kill the border-bottom
   input style inside these components.
5. **Loading kit**: rework `SkeletonComponents.tsx` to the loadbar + pulse-bone pattern;
   add a `LoadBar` export. Replace the spinner in `ProtectedRoute.tsx`, `Button.tsx`
   (loading state), `ModernDashboard.tsx`.
6. Verify: `cd client && npx tsc --noEmit && npx vite build`, run the ui component
   vitest files, lint, Playwright screenshots of login + dashboard with each role.

Expect visual fallout on unmigrated pages (they inherit new tokens with old layouts) —
acceptable; phases 1–5 clean them up.

### Phase 1 — Entry pages (branch `feat/soft-modern-entry`)

- `LoginPage.tsx` (+ `VideoBackdrop` interplay — keep the poster/video fix intact)
- `RegistrationFormPage.tsx`
- `NotFoundPage.tsx`
- `HelpPage.tsx` (re-skin of the recent rewrite; structure stays)

### Phase 2 — Core daily pages (branch `feat/soft-modern-core`)

- `ModernDashboard.tsx` (dashboard home: stat cards w/ icon tiles, chart card,
  right rail = Bugünkü Program + Duyurular, per mockup)
- `NotlarPage.tsx` (keep the new role-aware logic; table to spec)
- `DersProgramiPage.tsx`
- `OdevlerPage.tsx`
- `PerformancePage.tsx` (Recharts restyle: accent + surface-2 bars, no gradients)
- `DuyurularPage.tsx`

### Phase 3 — Communication & calendar (branch `feat/soft-modern-comms`)

- `CommunicationPage.tsx` + `communication/` tabs (Messages, Emails, Contacts, ChatRooms)
- `CalendarPage.tsx` + `calendar/` views (Month, Week, Day, Agenda, EventModal, Settings)
- `VisitorChatPage.tsx`, `VisitorAppointmentPage.tsx`, `AdminAppointmentsPage.tsx`

### Phase 4 — Admin tooling (branch `feat/soft-modern-admin`)

- `SenkronizasyonPage.tsx` (keep new server-side pagination)
- `ParentChildManagement.tsx` + `parent-child/` (lists, modals) + `BulkLinkSection.tsx`
- `PasswordManagement/` (page + 6 tab/modal files)
- `AddUserModal.tsx`, `EditUserModal.tsx`, `AdminRegistrationsPage.tsx`

### Phase 5 — Forms & operational lists (branch `feat/soft-modern-ops`)

- Evci: `StudentEvciPage.tsx`, `ParentEvciPage.tsx`, `AdminEvciListPage.tsx`, `EvciStatsPage.tsx`
- Dilekçe: `DilekcePage.tsx`, `AdminDilekceListPage.tsx`
- `MealListPage.tsx`, `SupervisorListPage.tsx`, `NotEkleme.tsx`
- `SettingsPage.tsx` (delete `SettingsPage.css`, rebuild on primitives — it's a known
  legacy-styled laggard, as are iletisim/sifre-yonetimi already covered above)

### Phase 6 — Cleanup & final sweep (branch `feat/soft-modern-cleanup`)

- Delete IBM Plex woff2 files + any dead `@font-face`.
- Delete/empty now-unused CSS: `welcome-badges-override.css`, leftovers in `App.css`,
  `index.css` legacy blocks, `ModernDashboard.css`, per-component CSS that got absorbed
  (`Table.css`, `Tabs.css`, `Select.css`, `Dialog.css`, `DatePicker.css`,
  `SettingsPage.css`, `BackButton.css`, `EmailVerificationBanner.css`,
  `EnhancedErrorBoundary.css`, `GradeTrendChart.css`) — verify each is unreferenced first.
- Grep sweep: no `#0d0d0d`, no leftover `border-b`-only inputs, no `animate-spin`,
  no `IBM Plex` references, no hardcoded grays outside tokens.
- Full visual pass: Playwright screenshots of every route for all 4 roles, light + dark.
- Full test suite + `vite build`.

## Per-phase verification checklist

1. `cd client && npx tsc --noEmit && npx vite build` (tsc alone is NOT enough —
   moduleResolution=bundler accepts specifiers Rollup rejects)
2. `cd client && npx vitest run <files touched>` — update snapshots/assertions that
   encode old styling; keep behavioral tests green
3. `npm run lint`
4. Visual check: Playwright (drive the repo's chromium from a node script run from the
   repo root — the MCP browser and /opt/google/chrome are broken). Mock accounts
   `admin1` / `teacher1` / `student1` / `parent1`, password `123456`. Login rate limit
   is 5/min — reuse storageState between screenshots instead of re-logging in.
5. PR with before/after screenshots, wait for CI green (dependency-review is the hard
   security gate; npm audit is advisory).

## Gotchas (learned the hard way)

- The server dev process (`ts-node --transpile-only`) has NO watch mode — restart it
  after pulling main or client API testing hits stale code. Vite HMR is fine.
- `server/.env` `MONGODB_URI` points at the PRODUCTION Atlas cluster. Never seed or
  write against it; use a local mongod + `TEST_MONGODB_URI` for server tests.
- Sandbox `npm install` rewrites half of package-lock.json → dependency-review CI
  flags pre-existing vulns as new. Don't commit lockfile churn.
- `server/` has its own package-lock.json for Docker builds — irrelevant to this
  client-only work; don't touch it.
- Background agents must stage explicit paths (`git add <files>`), never `git commit -a`.
- No AI attribution in commits, ever.
