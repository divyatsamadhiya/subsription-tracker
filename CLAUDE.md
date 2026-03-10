# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pulseboard — a subscription tracker with user-facing frontend, admin console, and Express backend. Monorepo with three packages: `frontend/`, `admin-frontend/`, `backend/`.

## Commands

### Root (monorepo)
```bash
npm run dev          # Run all three packages in watch mode
npm run test         # Run all tests (backend → frontend → admin-frontend)
npm run build        # Build all (includes tsc -b full type-check)
```

### Backend
```bash
npm run dev -w backend              # Dev server with tsx watch
npm run test -w backend             # Run backend tests
npm run db:migrate -w backend       # Prisma migrate dev
npm run db:generate -w backend      # Prisma generate
npm run db:studio -w backend        # Prisma Studio GUI
```

### Frontend
```bash
npm run dev -w frontend             # Vite dev server (localhost:5173)
npm run test -w frontend            # Run frontend tests
npm run test:watch -w frontend      # Vitest watch mode
```

### Running a single test file
```bash
cd backend && npx vitest run src/services/authService.test.ts
cd frontend && npx vitest run src/App.test.tsx
```

## Architecture

### Backend (`backend/`)
- **Runtime**: Node.js + Express, TypeScript (strict)
- **Database**: PostgreSQL via Prisma ORM (`backend/prisma/schema.prisma`)
- **Auth**: JWT in HTTP-only SameSite=lax cookies. Token signed with `jwtSecret + sessionSalt` (salt randomizes on server restart). 7-day expiry. Session invalidation via `sessionVersion` increment. Account lockout after 5 failed login attempts (15-min cooldown). Password reset uses 8-char hex tokens (32-bit entropy) with timing-safe comparison.
- **Middleware**: `requireAuth`, `optionalAuth`, `requireAdmin` in `src/middleware/auth.ts`
- **Config**: `src/config.ts` — env parsing with test-environment fallbacks; JWT secret validation rejects weak/placeholder secrets at startup (min 32 chars)
- **Services**: `authService` (register/login/password-reset), `adminService` (user management + audit logging)
- **Routes**: `/api/v1/auth`, `/api/v1/subscriptions`, `/api/v1/settings`, `/api/v1/profile`, `/api/v1/backup`, `/api/v1/admin`
- **Tests**: Vitest (node env), Prisma mocked via `src/test/mockPrisma.ts`

### Frontend (`frontend/`)
- **Stack**: React 18, MUI v7 (Material Design 3 theme), Vite, TypeScript (strict)
- **Charts**: `@mui/x-charts` v8 — API differs from v6/v7 (e.g., hide legend with `slots={{ legend: () => null }}`, not `slotProps.legend.hidden`)
- **State**: Zustand (`useAppStore`)
- **API client**: `src/lib/api.ts` — typed fetch wrapper, `credentials: "include"` for cookies, responses validated with Zod
- **Validation**: Zod schemas in `src/lib/schemas.ts`
- **Formatting utilities**: `src/lib/format.ts` — `formatCurrencyMinor`, `formatIsoDate`, `billingCycleLabel`, `categoryLabel`, `formatRelativeDue`
- **Tests**: Vitest (jsdom env), `src/test/setup.ts` provides matchMedia + ResizeObserver polyfills
- **PWA**: vite-plugin-pwa with workbox service worker

### Admin Frontend (`admin-frontend/`)
- Same stack as frontend, runs on localhost:5174

### Dev Servers
- Frontend: `http://localhost:5173` (proxies `/api` → backend)
- Admin: `http://localhost:5174`
- Backend: `http://localhost:4000`

## Domain Models (Prisma)

- **User**: UUID id, email (unique), passwordHash, role (user/admin), sessionVersion, profile fields, soft-delete support, failedLoginAttempts, lockedUntil (account lockout)
- **Settings**: Per-user preferences (currency, week start, notifications, theme)
- **Subscription**: Tracked subscriptions with amountMinor (cents), billingCycle, category, reminderDaysBefore
- **AdminAuditLog**: Tracks admin actions with metadata

## Environment Variables

Required: `DATABASE_URL` (PostgreSQL connection string), `JWT_SECRET`
Optional: `PORT` (default 4000), `FRONTEND_ORIGIN` (comma-separated allowed origins), `RESEND_API_KEY`, `RESET_EMAIL_FROM`, `ALLOW_SENDMAIL_FALLBACK`
See `.env.example` for full list.

## CI Pipeline (`.github/workflows/ci.yml`)

Triggers on push to `master`/`develop`/`codex/**` and PRs to `master`/`develop`.
Steps: `npm ci` → `npm run test` → `npm run build`

**Critical**: Vitest uses esbuild (no type-check), so TypeScript errors only surface during `npm run build` (which runs `tsc -b`). Always run both test and build before considering work done.

## Security

- **Rate Limiting**: Auth endpoints (8 req/15 min), admin writes (30/min), admin reads (60/min), backup endpoints (10 per 15 min)
- **Helmet**: Explicit CSP (default-src 'self', no inline scripts, frame-ancestors 'none'), strict referrer-policy, HSTS in production (1 year, includeSubDomains, preload)
- **Password Complexity**: Registration and password reset require uppercase + lowercase + digit
- **Account Lockout**: 5 failed login attempts triggers 15-minute lockout
- **JWT Secret Validation**: Rejects known placeholder secrets and secrets shorter than 32 characters at startup

## Key Conventions

- Amounts stored in minor units (cents) — use `formatCurrencyMinor` for display
- Dates are ISO strings — use `formatIsoDate` for display
- When changing UI copy/headings, grep test files for old strings and update them
- Theme `shape.borderRadius` is 14 (single source of truth — no per-component overrides)
- Fonts: Space Grotesk (headings), Plus Jakarta Sans (body)
- CORS: `FRONTEND_ORIGIN` must be explicit origins, no wildcards (credentials mode)
