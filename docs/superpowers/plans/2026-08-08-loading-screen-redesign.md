# Loading Screen Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic gray spinner used as the Suspense fallback with a branded loading screen: pulsing school logo + thin indeterminate teal progress bar, same message behavior.

**Architecture:** Single component (`LoadingSpinner` in `client/src/routes/AppRoutes.tsx`) gets new markup (logo `img` + progress bar div, message `p` unchanged). CSS lives in `client/src/styles/theme.css`, replacing the `.loading-spinner` ring rules with `.loading-logo` (pulse keyframes) and `.loading-progress-bar` (indeterminate slide keyframes). No new dependencies, no new files.

**Tech Stack:** React (TSX), plain CSS (existing `theme.css`, CSS custom properties already defined: `--primary-red` = teal `#0f766e`, `--gray-50`, `--ink-2`).

## Global Constraints

- No gradients, no glassmorphism, no purple. Flat background + the one accent color (`--primary-red` teal) already used by the app.
- No pill/rounded-full badges, not applicable here (no status chip in this component), but do not introduce one.
- No em dashes in code/comments/commit messages.
- Keep the existing `slowMessage` prop and `useDelayedFlag(6000)` behavior in `AppRoutes.tsx` untouched.
- Logo asset is `client/public/tofaslogo.png`, natural size 250x298 (portrait), must size by height and let width scale, never stretch to a square.
- Dark mode: rely on existing `--gray-*` / `--primary-red` dark-mode overrides already in `theme.css` (~line 1998+); do not hardcode light-only colors.

---

### Task 1: Redesign LoadingSpinner markup and CSS

**Files:**

- Modify: `client/src/routes/AppRoutes.tsx:18-23` (the `LoadingSpinner` component)
- Modify: `client/src/styles/theme.css:1176-1225` (the `.loading-container` / `.loading-spinner` / `@keyframes spin` block)
- Test: `client/src/routes/__tests__/LoadingSpinner.test.tsx` (new)

**Interfaces:**

- Consumes: nothing new. `LoadingSpinner` keeps its existing signature `({ slowMessage }: { slowMessage?: string } = {})`.
- Produces: same default export usage as before, `<LoadingSpinner />` and `<LoadingSpinner slowMessage={...} />`, used at `AppRoutes.tsx:100` and `AppRoutes.tsx:118`. No other task depends on this one.

- [ ] **Step 1: Write the failing test**

Create `client/src/routes/__tests__/LoadingSpinner.test.tsx`. `LoadingSpinner` is not exported from `AppRoutes.tsx` today, export it as a named export in Step 3, and import it here the same way.

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../AppRoutes';

describe('LoadingSpinner', () => {
  it('renders the branded logo', () => {
    render(<LoadingSpinner />);
    const logo = screen.getByRole('img', { name: /tofaş fen/i });
    expect(logo).toBeInTheDocument();
  });

  it('shows the default message when no slowMessage is given', () => {
    render(<LoadingSpinner />);
    expect(screen.getByText('Yükleniyor...')).toBeInTheDocument();
  });

  it('shows the slow message when provided', () => {
    render(<LoadingSpinner slowMessage="Sunucu uyandırılıyor, bu biraz sürebilir..." />);
    expect(screen.getByText('Sunucu uyandırılıyor, bu biraz sürebilir...')).toBeInTheDocument();
    expect(screen.queryByText('Yükleniyor...')).not.toBeInTheDocument();
  });

  it('renders an indeterminate progress bar', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelector('.loading-progress-bar')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npx vitest run src/routes/__tests__/LoadingSpinner.test.tsx`
Expected: FAIL, `LoadingSpinner` is not an exported member of `../AppRoutes` (or the file doesn't resolve the named export).

- [ ] **Step 3: Update `LoadingSpinner` in `AppRoutes.tsx`**

Replace lines 17-23 (the comment + component) with:

```tsx
// Loading component for Suspense
export const LoadingSpinner = ({ slowMessage }: { slowMessage?: string } = {}) => (
  <div className="loading-container">
    <img src="/tofaslogo.png" alt="Tofaş Fen Lisesi" className="loading-logo" />
    <div className="loading-progress-bar">
      <div className="loading-progress-bar-fill" />
    </div>
    <p>{slowMessage || 'Yükleniyor...'}</p>
  </div>
);
```

- [ ] **Step 4: Replace the CSS block in `theme.css`**

Replace lines 1176-1225 (from `/* Modern Loading Spinner - Centralized */` through the `@keyframes spin` block, keeping `.spinner` at lines 1208-1215 untouched since it's used elsewhere) with:

```css
/* Branded Loading Screen - Centralized */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--gray-50);
}

.loading-container p {
  color: var(--ink-2);
  font-size: 1rem;
  font-weight: 600;
  margin: var(--space-4) 0 0 0;
}

.loading-logo {
  height: 64px;
  width: auto;
  animation: loading-pulse 2s ease-in-out infinite;
}

.loading-progress-bar {
  width: 160px;
  height: 3px;
  margin-top: var(--space-4);
  background: var(--gray-200);
  border-radius: 2px;
  overflow: hidden;
}

.loading-progress-bar-fill {
  height: 100%;
  width: 40%;
  background: var(--primary-red);
  border-radius: 2px;
  animation: loading-progress-slide 1.4s ease-in-out infinite;
}

@keyframes loading-pulse {
  0%,
  100% {
    transform: scale(0.96);
  }

  50% {
    transform: scale(1.04);
  }
}

@keyframes loading-progress-slide {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(350%);
  }
}
```

Note: leave the pre-existing `.loading-container-bar` rule (line 1193-1196 in the old numbering) and the `.spinner` rule (used elsewhere, e.g. inline button spinners) as they are, only the `.loading-spinner` rule and its dedicated `@keyframes spin` are being removed. Before deleting `@keyframes spin`, grep for other `.loading-spinner` or `animation: spin` usages in `client/src`, if any other component references them, keep the keyframes and only remove `.loading-spinner`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd client && npx vitest run src/routes/__tests__/LoadingSpinner.test.tsx`
Expected: PASS (all 4 tests)

- [ ] **Step 6: Verify the client still builds**

Run: `cd client && npm run build`
Expected: build succeeds with no TypeScript or bundling errors (per project memory, `tsc` passing alone isn't enough, the Vite/Rollup build must succeed too).

- [ ] **Step 7: Visual check in the running app**

Run: `cd client && npm run dev`, open the app, navigate to a lazy-loaded route (e.g. log in and go to a dashboard sub-page) to trigger the Suspense fallback. Confirm:

- Logo appears centered, pulses gently, is not stretched (portrait aspect ratio preserved)
- Progress bar slides smoothly, teal colored, no gray spinner ring visible
- Message text unchanged (`Yükleniyor...`)
- Toggle OS/browser dark mode and re-check contrast (background/text/bar still readable)

- [ ] **Step 8: Commit**

```bash
git add client/src/routes/AppRoutes.tsx client/src/styles/theme.css client/src/routes/__tests__/LoadingSpinner.test.tsx
git commit -m "feat(client): markalı yükleme ekranı - logo nabzı ve ilerleme çubuğu"
```

---

## Self-Review Notes

- Spec coverage: logo pulse ✓ (Step 3/4), progress bar ✓ (Step 3/4), message behavior preserved ✓ (Step 3, no change to prop logic), background/layout preserved ✓ (Step 4 keeps `.loading-container` as-is), dark mode via existing tokens ✓ (uses `var(--gray-50)`, `var(--primary-red)`, `var(--ink-2)`, `var(--gray-200)`, no hardcoded colors).
- Placeholder scan: none, all code blocks are complete and exact.
- Type consistency: single task, no cross-task signatures beyond the existing `{ slowMessage?: string }` prop, unchanged.

## Deviations from Plan (post-implementation, found in review)

- `.loading-logo` as written in Step 4 collided with an unrelated `.loading-logo` class in `client/src/components/ModernDashboard.css` (leaking through a CSS `@import` chain), and a first fix attempt (scoping to `.loading-container .loading-logo`) still left `margin-bottom` leaking non-deterministically. Final fix: renamed to a unique class name that cannot collide with anything else in the stylesheet, no scoping needed.
- `--primary-red` (the plan's chosen teal token) turns gray (`#9CA3AF`) under this codebase's existing dark-mode overrides, silently losing the brand accent exactly where the redesign was meant to show it. Switched the progress-bar fill to `--accent` (crimson, `#c8102e` light / `#ea4a5e` dark), which stays chromatic in both themes.
- Step 4's literal replacement range also initially dropped the pre-existing `.loading-container-bar` rule that `ProtectedRoute.tsx` and `ModernDashboard.tsx` depend on; it was restored in a follow-up commit.
