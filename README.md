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
- `POST /auth/logout`
- `GET /auth/me`
- `GET /subscriptions`
- `POST /subscriptions`
- `PUT /subscriptions/:id`
- `DELETE /subscriptions/:id`
- `GET /settings`
- `PATCH /settings`
- `GET /backup/export`
- `POST /backup/import`

## Notes

- Auth uses HTTP-only JWT cookies (`pulseboard_token`) with a 7-day expiry.
- Authenticated write requests are origin-checked against `FRONTEND_ORIGIN`.
- All subscription/settings/backup data is user-scoped on the backend.
- The app is online-first now. PWA shell remains installable, but data operations require backend access.
- This migration is a fresh-start cutover: no automatic browser Dexie migration path is included.
