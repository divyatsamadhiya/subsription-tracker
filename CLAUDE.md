# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pulseboard — a subscription tracker with user-facing frontend, admin console, and Express backend. Monorepo with four packages: `frontend-v2/` (primary), `frontend/` (legacy), `admin-frontend/`, `backend/`.

## Commands

### Root (monorepo)
```bash
npm run dev          # Run all packages in watch mode
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

### Frontend (legacy)
```bash
npm run dev -w frontend             # Vite dev server (localhost:5173)
npm run test -w frontend            # Run frontend tests
npm run test:watch -w frontend      # Vitest watch mode
```

### Frontend v2
```bash
npm run dev -w frontend-v2          # Next.js dev server (localhost:3000)
npm run build -w frontend-v2        # Next.js production build (includes tsc)
npm run test -w frontend-v2         # Run frontend-v2 tests (Vitest)
```

### Running a single test file
```bash
cd backend && npx vitest run src/services/authService.test.ts
cd frontend && npx vitest run src/App.test.tsx
cd frontend-v2 && npx vitest run src/lib/calendar-grid.test.ts
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

### Frontend v2 (`frontend-v2/`) — Primary
- **Stack**: Next.js 16, React 19, Tailwind CSS, shadcn/ui (Base UI primitives), TypeScript (strict)
- **Charts**: Recharts v3 — BarChart, PieChart with custom cells and tooltips
- **Calendar**: react-day-picker v9 with Tailwind-compatible classNames
- **Animations**: motion/react (Framer Motion) for page transitions, staggered lists, interactive elements
- **State**: React context (`DashboardProvider`) wrapping all dashboard pages
- **API client**: `src/lib/api.ts` — typed fetch wrapper, `credentials: "include"` for cookies
- **UI components**: `src/components/ui/` — shadcn/ui components (Button, Card, Sheet, Popover, Calendar, Select, Tabs, etc.)
- **Layout**: Collapsible sidebar (`sidebar.tsx`) with nav, stats card, user menu; renewal alerts bell in sidebar header; mobile drawer header
- **Subscription form**: Searchable dropdown for names (70+ suggestions in `lib/suggestions.ts`), calendar date picker via Popover + Calendar
- **Shared utilities**: `lib/category-colors.ts` (CATEGORY_HEX), `lib/subscription-utils.ts` (toSubscriptionInput), `lib/sparkline-paths.ts`, `lib/calendar-grid.ts`
- **Tests**: Vitest with tests for pure logic (sparkline paths, calendar grid, brand colors, overview helpers)
- **Fonts**: System fonts (SF Pro / Helvetica Neue stack) for headings and body via CSS variables

### Frontend (`frontend/`) — Legacy
- **Stack**: React 18, MUI v7 (Material Design 3 theme), Vite, TypeScript (strict)
- **Charts**: `@mui/x-charts` v8 — API differs from v6/v7 (e.g., hide legend with `slots={{ legend: () => null }}`, not `slotProps.legend.hidden`)
- **State**: Zustand (`useAppStore`)
- **API client**: `src/lib/api.ts` — typed fetch wrapper, `credentials: "include"` for cookies, responses validated with Zod
- **Validation**: Zod schemas in `src/lib/schemas.ts`
- **Formatting utilities**: `src/lib/format.ts` — `formatCurrencyMinor`, `formatIsoDate`, `billingCycleLabel`, `categoryLabel`, `formatRelativeDue`
- **Tests**: Vitest (jsdom env), `src/test/setup.ts` provides matchMedia + ResizeObserver polyfills
- **PWA**: vite-plugin-pwa with workbox service worker

### Admin Frontend (`admin-frontend/`)
- Same stack as legacy frontend, runs on localhost:5174

### Dev Servers
- Frontend v2: `http://localhost:3000` (Next.js)
- Legacy Frontend: `http://localhost:5173` (Vite, proxies `/api` → backend)
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
- Frontend v2 uses Tailwind CSS with CSS variables for theming (oklch color space)
- Legacy frontend uses MUI theme with `shape.borderRadius` of 14
- Fonts: System font stack (SF Pro / Helvetica Neue) for frontend-v2; Space Grotesk + Plus Jakarta Sans for legacy frontend
- CORS: `FRONTEND_ORIGIN` must be explicit origins, no wildcards (credentials mode)
- Shared constants (CATEGORY_HEX, toSubscriptionInput) live in `lib/` — do not duplicate across pages
