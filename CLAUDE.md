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
docker-compose up -d           # Start MongoDB + Redis locally
```

## Architecture

### Monorepo Structure

- **`client/`** — React 19 + Vite 6 + TypeScript frontend
- **`server/`** — Express 4 + TypeScript + Mongoose backend
- **`shared/`** — Shared TypeScript types/DTOs
- **`docs/`** — Project documentation
- **`k8s/`** — Kubernetes production manifests

Turbo orchestrates cross-package tasks with caching.

### Frontend (`client/`)

- **Routing**: React Router 7.5
- **State**: Zustand stores (`src/stores/`) + React Query (`src/hooks/queries/`)
- **UI**: Tailwind CSS 4 with custom Tofaş brand colors, Radix UI, Headless UI
- **Auth**: `AuthContext` provider + `authStore` (Zustand) + JWT tokens
- **API client**: Axios-based `src/utils/apiService.ts` with endpoint definitions in `src/utils/apiEndpoints.ts`
- **Path alias**: `@/*` → `src/*`
- **Tests**: Vitest (JSDOM) + Playwright for E2E; 70% coverage threshold

### Backend (`server/`)

- **Database**: MongoDB via Mongoose ODM (models in `src/models/`)
- **Caching**: Redis for sessions, rate limiting, and response caching
- **Auth**: JWT access + refresh tokens, bcryptjs password hashing
- **Middleware stack**: Helmet → CORS → rate limiting → WAF → JWT auth → validation → error handler
- **API versioning**: `src/routes/v1/` for versioned endpoints
- **Modular auth**: `src/modules/auth/` (controllers, services, routes, validators)
- **Services**: Business logic in `src/services/` (Performance, Notification, Calendar, Bulk Import, etc.)
- **Logging**: Winston with daily file rotation
- **Tests**: Vitest (Node); 80% coverage threshold; integration/security/performance test suites in `src/test/`

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

## Commit Rules

- Never include your name, "Claude", or any AI attribution in commit messages, Co-Authored-By lines, or contributor lists.

## Pre-commit Hooks

Husky + lint-staged runs Prettier and ESLint on staged `.ts`/`.tsx` files automatically.

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`): secret scanning (Gitleaks), lint, type-check, test, build. Docker multi-stage builds for both client (Nginx) and server (Node). Kubernetes manifests in `k8s/production/`.
