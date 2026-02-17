# Pulseboard Subscription Tracker

Pulseboard is a full-stack subscription tracking app in a monorepo:

- `frontend`: React + Vite + TypeScript
- `backend`: Express + MongoDB + JWT cookie auth

## License

This project is licensed under the MIT License. See `LICENSE`.

## Prerequisites

- Node.js 20+
- npm 10+
- MongoDB instance

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

- Frontend at `http://localhost:5173`
- Backend at `http://localhost:4000`

## Environment Variables

Required:

- `MONGODB_URI`
- `JWT_SECRET`

Optional/defaulted:

- `PORT` (default `4000`)
- `FRONTEND_ORIGIN` (default `http://localhost:5173`, comma-separated list supported, `*` is not allowed)
- `RESEND_API_KEY`
- `RESET_EMAIL_FROM` (default `onboarding@resend.dev`)
- `RESET_EMAIL_FROM_NAME` (default `Pulseboard`)
- `ALLOW_SENDMAIL_FALLBACK` (default `false`)
- `SENDMAIL_PATH` (default `/usr/sbin/sendmail`)

See `.env.example` for a full template.

## Scripts

- `npm run dev`: Run backend and frontend in watch mode
- `npm run test`: Run backend and frontend tests
- `npm run build`: Build backend and frontend

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

## Security

- Do not open public issues containing credentials, tokens, database dumps, or personal data.
- Report vulnerabilities privately following `SECURITY.md`.

## Contributing and Support

- Read `CONTRIBUTING.md` before opening pull requests.
- Community behavior expectations are in `CODE_OF_CONDUCT.md`.
- Support is best-effort and community-driven; no SLA is provided for feature requests or troubleshooting.
