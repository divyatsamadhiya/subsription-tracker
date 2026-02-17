# Pulseboard Subscription Tracker

Pulseboard is now a full-stack monorepo with a separated React frontend and Express.js backend.

## Architecture

- `frontend`: React + Vite + TypeScript app
- `backend`: Express.js + MongoDB + JWT cookie auth

## Prerequisites

- Node.js 20+
- npm 10+
- MongoDB instance

## Environment

Create `.env`

Required values:

- `MONGODB_URI`
- `JWT_SECRET`
- `PORT` (default `4000`)
- `FRONTEND_ORIGIN` (default `http://localhost:5173`, comma-separated list supported, `*` is not allowed)

Optional for password reset email delivery:

- `RESEND_API_KEY` (recommended; reset emails are sent with Resend API)
- `RESET_EMAIL_FROM` (default `onboarding@resend.dev`)
- `RESET_EMAIL_FROM_NAME` (default `Pulseboard`)
- `ALLOW_SENDMAIL_FALLBACK` (default `false`; set `true` only if your host MTA is configured)
- `SENDMAIL_PATH` (default `/usr/sbin/sendmail`; used only when `ALLOW_SENDMAIL_FALLBACK=true`)

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

This starts:

- Frontend on `http://localhost:5173`
- Backend API on `http://localhost:4000`

## Build and Test

```bash
npm run test
npm run build
```

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

## Notes

- `POST /auth/register` requires `email`, `password`, `fullName`, and `country`.
- Auth uses HTTP-only JWT cookies (`pulseboard_token`) with a 7-day expiry.
- Authenticated write requests are origin-checked against `FRONTEND_ORIGIN`.
- All subscription/settings/backup data is user-scoped on the backend.
- Auth responses include profile data plus `profileComplete` for onboarding prompts.
- The app is online-first now. PWA shell remains installable, but data operations require backend access.
- This migration is a fresh-start cutover: no automatic browser Dexie migration path is included.
