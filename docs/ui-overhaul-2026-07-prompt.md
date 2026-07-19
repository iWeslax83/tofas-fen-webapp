# Prompt — Soft Modern UI Overhaul (paste into a fresh session)

Read `docs/ui-overhaul-2026-07-plan.md` and execute it phase by phase, starting at
Phase 0. Also open `docs/ui-mockups/soft-modern.html` — it is the visual spec and wins
over the plan text on any disagreement.

Rules of engagement:

- One phase at a time: branch off up-to-date `main` with the branch name the plan
  gives, one commit per page/component, open a PR per phase, then WAIT for that PR's
  CI to go green before starting the next phase. Report CI status honestly.
- Never merge PRs — I merge them manually. If a PR sits unmerged and the next phase
  is ready to start, branch the next phase off the previous phase's branch and say so
  in the PR description.
- Follow the per-phase verification checklist in the plan exactly:
  `tsc --noEmit` AND `vite build`, touched vitest files, lint, and Playwright
  screenshots (repo chromium via node script from repo root; accounts
  admin1/teacher1/student1/parent1, password 123456, login rate limit 5/min — reuse
  storageState). Attach before/after screenshots to each PR.
- Read the "Gotchas" section of the plan before touching anything; every item in it
  has already burned a session once. Especially: server/.env MONGODB_URI is the
  production Atlas cluster — never seed/write against it; restart the ts-node dev
  server after pulling; no package-lock churn; stage explicit paths only.
- Design constraints: no gradients, no glassmorphism, no purple, single red accent,
  flat fills. NO spinners anywhere — loadbar + skeleton only. Turkish text must render
  in one typeface: fonts ship latin AND latin-ext subsets, and every visible string is
  Turkish (check ğ ü ş ç ı İ render in screenshots).
- Preserve behavior: role-aware NotlarPage logic, Senkronizasyon server-side
  pagination, CSRF/auth flows, all existing tests' intent. This is a re-skin plus the
  layout/loading changes the plan names — not a logic rewrite.
- No AI attribution in commit messages, Co-Authored-By lines, or PR bodies.
- Interpret ambiguity yourself and note the decision in the PR body; only ask me for
  genuinely hard-to-reverse decisions.
- When I send a screenshot with feedback mid-phase, fix it on the current phase branch
  before opening that phase's PR (or as a follow-up commit if the PR is already open).

Start now: check out `main`, pull, create `feat/soft-modern-foundation`, and begin
Phase 0.
