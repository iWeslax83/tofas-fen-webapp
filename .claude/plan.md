# Fix Plan: Security Vulnerabilities & Code Quality Issues

## Phase 1: Critical Security Fixes

### 1.1 Remove legacy auth.ts (unauthenticated register, weak reset token)
- **File:** `server/src/routes/auth.ts` — Delete entire file
- **File:** `server/src/index.ts` — Remove the import if it exists (currently not imported, but verify)
- Legacy file has unauthenticated `/register` endpoint and unhashed reset tokens

### 1.2 Remove hardcoded JWT secret fallback in GraphQL
- **File:** `server/src/graphql/server.ts:19`
- Change `process.env.JWT_SECRET || 'your-secret-key'` → throw if not set

### 1.3 Remove unauthenticated test-mail endpoint
- **File:** `server/src/index.ts:474-483`
- Remove the `/api/test-mail` endpoint entirely

### 1.4 Fix mass assignment vulnerability in User PUT route
- **File:** `server/src/routes/User.ts:198-208`
- The `PUT /:userId` route accepts raw `req.body` without filtering sensitive fields
- Add allowlist: only allow `email`, `adSoyad`, `sinif`, `sube`, `oda`, `pansiyon` fields
- The `/update` variant on line 211+ already filters some fields — unify approach

### 1.5 Fix CSRF protection bypass
- **File:** `server/src/middleware/auth.ts:78`
- `origin.includes(process.env.FRONTEND_URL || 'localhost')` — an attacker with origin `evil-localhost.com` passes
- Use strict URL comparison with parsed origin

### 1.6 Protect /status and /metrics endpoints
- **File:** `server/src/index.ts:189-196, 441-451`
- Add auth or restrict to internal networks only (check for NODE_ENV === production)

### 1.7 Protect /uploads static directory
- **File:** `server/src/index.ts:279`
- Add authenticateJWT middleware before static serving

### 1.8 Fix regex injection (ReDoS) in User search
- **File:** `server/src/routes/User.ts:46-49`
- Escape user input before using in `$regex`

## Phase 2: High Priority Fixes

### 2.1 Fix SecureAPI return type mismatch
- **File:** `client/src/utils/api.ts:331-349`
- `get<T>`, `post<T>`, etc. return `apiClient.get()` which returns `AxiosResponse<T>`, not `T`
- Fix: Change return types to `Promise<AxiosResponse<T>>` so callers get correct types
- This eliminates the need for `(response as any).data` patterns across the codebase

### 2.2 Fix retry logic that checks for '4' in error message
- **File:** `client/src/main.tsx:28-32`
- **File:** `client/src/hooks/useReactQuery.ts:106-112`
- Replace `error.message.includes('4')` with proper HTTP status code check
- Create a helper that checks `error.response?.status >= 400 && < 500`

### 2.3 Fix useAuth() creating new object every render
- **File:** `client/src/stores/authStore.ts:361-368`
- Use `useShallow` from zustand (already imported in uiStore.ts) to wrap the selector

### 2.4 Fix useAuthActions() same problem
- **File:** `client/src/stores/authStore.ts:370-382`
- Use `useShallow` wrapper

### 2.5 Unify toast libraries — replace sonner with react-hot-toast
- **Files using sonner (7 files):** SettingsPage, StudentEvciPage, ParentEvciPage, AdminEvciListPage, EvciStatsPage, DersProgramiPage, MealListPage
- Change `import { toast } from 'sonner'` → `import { toast } from 'react-hot-toast'`
- Adjust API differences: sonner's `toast.info()` → `toast()` in react-hot-toast

### 2.6 Remove duplicate route mounting
- **File:** `server/src/index.ts:395-398`
- Remove singular duplicates: keep `/api/users`, remove `/api/user`; keep `/api/homeworks`, remove `/api/homework`
- Actually: check which one is used more. Keep both but document which is canonical.
- Better approach: keep both for backward compat but note in code comment

### 2.7 Fix EvciRequest N+1 migration query
- **File:** `server/src/models/EvciRequest.ts:113-124`
- Replace loop of `updateOne` with `bulkWrite`

## Phase 3: Code Quality & React Improvements

### 3.1 Extract buildUser utility
- Create `client/src/utils/buildUser.ts` with shared `buildUser(userData: any): User` function
- Use it in `authStore.ts` (login, checkAuth, verify2FA) and `ModernDashboard.tsx`

### 3.2 Extract ROLE_LABELS constant
- Create shared constant in `client/src/utils/constants.ts`
- Use in ModernDashboard.tsx and SettingsPage.tsx

### 3.3 Fix ModernDashboard — remove unnecessary userData state
- **File:** `client/src/components/ModernDashboard.tsx`
- `userData` is entirely derived from `authUser` — replace with `useMemo`
- Remove unused `setStats` / fake stats fallback
- Memoize `getRoleButtons` with `useMemo`

### 3.4 Fix NotEkleme — replace useCallback+useEffect with useMemo for average
- **File:** `client/src/pages/Dashboard/NotEkleme.tsx:163-229`
- Replace `calculateAverage` callback + effect + setState with `useMemo`
- Remove unnecessary `supportedFormats` state (make it a constant)
- Remove unnecessary `loading` state

### 3.5 Fix useRenderPerformance — guard for production
- **File:** `client/src/hooks/usePerformance.ts:12-28`
- Add `if (import.meta.env.PROD) return;` early exit

### 3.6 Fix useVirtualization — memoize visibleItems
- **File:** `client/src/hooks/usePerformance.ts:171-198`
- Wrap `visibleItems` in `useMemo`

### 3.7 Remove redundant try-catch in resend2FA
- **File:** `client/src/stores/authStore.ts:310-321`
- Remove try-catch that just rethrows

### 3.8 Fix copyright year
- **File:** `client/src/pages/LoginPage.tsx:403`
- Replace `© 2024` with `© {new Date().getFullYear()}`

### 3.9 Fix visualizer plugin auto-open
- **File:** `client/vite.config.ts:12`
- Change `open: true` to `open: false`

### 3.10 Fix SecureAPI.login duplicate parameters
- **File:** `client/src/utils/api.ts:215`
- Remove unused `_id` and `_sifre` params, keep only `credentials`
- Update caller in `authStore.ts:55`

### 3.11 Remove localStorage token storage (complete httpOnly migration)
- **File:** `client/src/utils/api.ts:248-254` — Remove localStorage writes
- **File:** `client/src/stores/authStore.ts:272-278` — Remove localStorage writes in verify2FA
- Keep the TokenManager for backward reading but stop writing new tokens to localStorage

## Phase 4: Package.json Cleanup

### 4.1 Clean root package.json
- Move `@types/*` to root devDependencies
- Remove duplicated packages (react, react-dom, express, mongoose, etc.) that belong in subprojects
- Keep only workspace-level deps (concurrently, etc.)
