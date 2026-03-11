# Pulseboard Subscription Tracker

Pulseboard is a full-stack subscription tracking app in a monorepo:

- `frontend-v2`: Next.js 16 + React 19 + Tailwind CSS + shadcn/ui + TypeScript (primary frontend)
- `frontend`: React 18 + MUI v7 + Vite + TypeScript (legacy frontend)
- `admin-frontend`: React + Vite + TypeScript (admin console)
- `backend`: Express + PostgreSQL (Prisma ORM) + JWT cookie auth

## License

This project is licensed under the MIT License. See `LICENSE`.

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 14+

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create local environment configuration:

```bash
cp .env.example .env
```

3. Update `.env` values for your local environment.

4. Start development servers:

```bash
npm run dev
```

This starts:

- Frontend (v2) at `http://localhost:3000`
- Legacy frontend at `http://localhost:5173`
- Admin frontend at `http://localhost:5174`
- Backend at `http://localhost:4000`

## Environment Variables

Required:

- `DATABASE_URL` (PostgreSQL connection string, e.g. `postgresql://user@localhost:5432/pulseboard`)
- `JWT_SECRET`

Optional/defaulted:

- `PORT` (default `4000`)
- `FRONTEND_ORIGIN` (default `http://localhost:5173,http://localhost:5174,http://localhost:3000`, comma-separated list supported, `*` is not allowed)
- `RESEND_API_KEY`
- `RESET_EMAIL_FROM` (default `onboarding@resend.dev`)
- `RESET_EMAIL_FROM_NAME` (default `Pulseboard`)
- `ALLOW_SENDMAIL_FALLBACK` (default `false`)
- `SENDMAIL_PATH` (default `/usr/sbin/sendmail`)

See `.env.example` for a full template.

## Scripts

- `npm run dev`: Run backend, frontend, and admin frontend in watch mode
- `npm run test`: Run backend, frontend, and admin frontend tests
- `npm run build`: Build backend, frontend, and admin frontend
- `npm run admin:grant -w backend -- --email=<user@example.com>`: Grant admin role
- `npm run admin:revoke -w backend -- --email=<user@example.com>`: Revoke admin role
- `npm run admin:purge-deleted -w backend -- --days=30`: Purge soft-deleted users older than retention

## Frontend v2 Features

The new frontend (`frontend-v2/`) is a ground-up rewrite using Next.js 16, React 19, and Tailwind CSS with shadcn/ui (Base UI) components:

### Dashboard Overview
- Personalized greeting with time-of-day awareness
- KPI cards with animated sparklines and trend indicators
- Upcoming renewals with list and calendar views, quick edit/pause actions with text labels
- Category spending donut chart with click-to-drill-down

### Subscription Management
- Searchable dropdown for subscription names (70+ built-in suggestions with auto-category)
- Calendar date picker for billing dates (react-day-picker)
- Active subscriptions shown by default
- Bulk select, pause, delete actions
- Pin and drag-to-reorder subscriptions
- CSV export

### Analytics
- Recharts-powered spending breakdown by category
- Renewal distribution chart
- Monthly spend trends

### Auth Pages
- Animated floating brand cards on showcase panel
- Dark mode toggle with smooth rotation animation
- Animated count-up statistics
- Show/hide password toggle on all password fields

### Layout
- Collapsible sidebar with navigation and renewal alerts bell
- Monthly spend stats card in sidebar
- User dropdown menu with profile, settings, and sign out
- Mobile-responsive header with drawer navigation

## API Surface

Base URL: `http://localhost:4000/api/v1`

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /profile`
- `PATCH /profile`
- `GET /subscriptions`
- `POST /subscriptions`
- `PUT /subscriptions/:id`
- `DELETE /subscriptions/:id`
- `GET /settings`
- `PATCH /settings`
- `GET /backup/export`
- `POST /backup/import`
- `GET /admin/session`
- `GET /admin/users`
- `GET /admin/users/:userId`
- `POST /admin/users/:userId/delete`
- `POST /admin/users/:userId/restore`
- `POST /admin/users/:userId/force-logout`
- `GET /admin/analytics/overview`

## Security

- Do not open public issues containing credentials, tokens, database dumps, or personal data.
- Report vulnerabilities privately following `SECURITY.md`.

## Contributing and Support

- Read `CONTRIBUTING.md` before opening pull requests.
- Community behavior expectations are in `CODE_OF_CONDUCT.md`.
- Support is best-effort and community-driven; no SLA is provided for feature requests or troubleshooting.
