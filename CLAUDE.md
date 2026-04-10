# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tofaş Fen Lisesi (High School) Information Management System — a full-stack monorepo with npm workspaces. Turkish-language school platform managing grades, homework, schedules, communication, dormitory, and administrative workflows.

## Common Commands

```bash
# Development
npm run dev                    # Start both client (port 5173) and server (port 3001)
npm run dev:client             # Frontend only
npm run dev:server             # Backend only

# Building
npm run build                  # Build both packages via Turbo
npm run build:client           # Frontend only
npm run build:server           # Backend only

# Testing
npm run test                   # All tests
npm run test:client            # Frontend tests (Vitest)
npm run test:server            # Backend tests (Vitest)
npm run test:e2e               # Playwright E2E tests (client)
npm run test:integration       # Backend integration tests
npm run test:coverage          # Coverage reports

# Run a single test file
cd client && npx vitest run src/path/to/file.test.ts
cd server && npx vitest run src/path/to/file.test.ts

# Linting & Formatting
npm run lint                   # ESLint across all packages
npm run lint:fix               # Auto-fix lint issues
npm run format                 # Prettier format all files
npm run type-check             # TypeScript type checking

# Database
npm run seed                   # Seed database with test data
npm run seed:users             # Seed users only
docker-compose up -d           # Start MongoDB + Redis locally

# Database management
cd server && npm run create-indexes   # Create MongoDB indexes
cd server && npm run migrate          # Run database migrations
cd server && npm run migrate:up       # Apply pending migrations
cd server && npm run migrate:down     # Rollback last migration

# Utilities
npm run generate-secrets       # Generate production secrets
cd server && npm run generate:openapi # Generate OpenAPI spec
```

## Architecture

### Monorepo Structure

- **`client/`** — React 19 + Vite 6 + TypeScript frontend
- **`server/`** — Express 4 + TypeScript + Mongoose backend
- **`shared/`** — Shared TypeScript types/DTOs (User, API, Homework, Note, Announcement)
- **`docs/`** — Project documentation
- **`k8s/`** — Kubernetes production manifests

Turbo orchestrates cross-package tasks with caching. Non-cached tasks: `dev`, `lint:fix`. Cached tasks: `build`, `lint`, `type-check`, `test`.

### Frontend (`client/`)

- **Routing**: React Router 7.5
- **State**: Zustand stores (`src/stores/`) + TanStack Query v5 (`src/hooks/queries/`)
- **UI**: Tailwind CSS 4 with custom Tofaş brand colors, Radix UI, Headless UI
- **Charts**: Recharts for data visualization
- **Animations**: Framer Motion
- **Auth**: `AuthContext` provider + `authStore` (Zustand) + JWT tokens
- **API client**: Axios-based `src/utils/apiService.ts` with endpoint definitions in `src/utils/apiEndpoints.ts`
- **Monitoring**: Sentry (`@sentry/react`) + OpenTelemetry for tracing/metrics
- **Path alias**: `@/*` → `src/*`
- **Tests**: Vitest (JSDOM) + Playwright for E2E; 70% coverage threshold
- **Ports**: 5173 (dev via Vite), 3000 (production via Nginx in Docker)

### Backend (`server/`)

- **Database**: MongoDB via Mongoose ODM (models in `src/models/`)
- **GraphQL**: Apollo Server Express with DataLoader, complexity/depth limiting
- **Caching**: Redis for sessions, rate limiting, and response caching
- **Auth**: JWT access + refresh tokens, bcryptjs password hashing
- **Middleware stack**: Helmet → CORS → rate limiting → WAF → CAPTCHA → JWT auth → API versioning → audit logging → cache → validation → error handler
- **API versioning**: `src/routes/v1/` for versioned endpoints
- **Modular auth**: `src/modules/auth/` (controllers, services, routes, validators)
- **Services**: Business logic in `src/services/` (Performance, Notification, Calendar, Bulk Import, Backup, Scheduler, SecurityAlert, Push Notification, etc.)
- **Exports**: ExcelJS for spreadsheets, PDFKit for PDF generation, Sharp for image processing
- **Push notifications**: web-push with VAPID keys
- **Email**: Nodemailer
- **Cron**: node-cron for scheduled tasks
- **WebSocket**: ws library
- **Logging**: Winston with daily file rotation
- **Tests**: Vitest (Node); 80% coverage threshold; organized in `src/test/` as `unit/`, `integration/`, `security/`, `performance/`, `models/`, `modules/`, `routes/`

### User Roles

Five roles with role-based access control: Student (öğrenci), Teacher (öğretmen), Parent (veli), Administrator (yönetici), Staff (hizmetli). Access enforced via `auth.ts` middleware and `ownershipCheck`/`parentChildAccess` middleware.

### Key Domain Modules

Notes (grades), Performance, Homework, Communication, EvciRequest (leave requests), Calendar, Announcements, Notifications, Appointments, Dilekce (petitions), MealList, SupervisorList, Dormitory.

## Environment Setup

Backend requires `server/.env` (copy from `server/.env.example`). Key variables:

- `MONGODB_URI` (default: `mongodb://localhost:27017/tofas-fen`)
- `REDIS_HOST`/`REDIS_PORT`
- `JWT_SECRET`/`JWT_REFRESH_SECRET`
- `FRONTEND_URL` (CORS origin, default: `http://localhost:5173`)
- `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` (push notifications)
- `SMTP_*` vars (email via Nodemailer)
- `SENTRY_DSN` (error tracking)
- `ENCRYPTION_KEY` (data encryption)

## Commit Rules

- Never include your name, "Claude", or any AI attribution in commit messages, Co-Authored-By lines, or contributor lists.

## Pre-commit Hooks

Husky + lint-staged runs Prettier and ESLint on staged `.ts`/`.tsx` files automatically. Also formats `.json`, `.md`, `.yml`, `.yaml` files with Prettier.

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`): secret scanning (Gitleaks), OpenAPI contract validation, lint, type-check, test, build. Docker multi-stage builds for both client (Nginx) and server (Node). Kubernetes manifests in `k8s/production/`.
