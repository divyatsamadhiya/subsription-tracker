# Architecture

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Express.js + TypeScript
- Database: MongoDB (Mongoose)
- Auth: Email/password + JWT in HTTP-only cookie
- Validation: Independent Zod schemas in both frontend and backend apps
- State management: Zustand (frontend)
- Testing: Vitest
- PWA: `vite-plugin-pwa` (online-first app shell)

## Repository Structure

- `frontend/`: UI application and client-side feature logic
- `backend/`: API server, models, auth middleware, and route handlers

## Canonical V1 Types

```ts
type BillingCycle = "weekly" | "monthly" | "yearly" | "custom_days";

interface Subscription {
  id: string;
  name: string;
  amountMinor: number;
  currency: string;
  billingCycle: BillingCycle;
  customIntervalDays?: number;
  nextBillingDate: string;
  category: "entertainment" | "productivity" | "utilities" | "health" | "other";
  reminderDaysBefore: number[];
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface AppSettings {
  defaultCurrency: string;
  weekStartsOn: 0 | 1;
  notificationsEnabled: boolean;
}

interface BackupFileV1 {
  version: "1.0";
  exportedAt: string;
  settings: AppSettings;
  subscriptions: Subscription[];
}
```

## API Design

Base path: `/api/v1`

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

### Subscriptions

- `GET /subscriptions`
- `POST /subscriptions`
- `PUT /subscriptions/:id`
- `DELETE /subscriptions/:id`

### Settings

- `GET /settings`
- `PATCH /settings`

### Backup

- `GET /backup/export`
- `POST /backup/import`

## Data Flow

1. Frontend authenticates user via `/auth/*` endpoints.
2. Frontend store loads settings and subscriptions from backend APIs.
3. Backend validates request payloads using backend-owned Zod schemas.
4. Backend persists data in MongoDB collections (`users`, `subscriptions`, `settings`).
5. Frontend computes derived dashboard metrics and reminder signals from API-fetched data.

## Security and Data Ownership

- Auth token is stored in an HTTP-only cookie (`pulseboard_token`).
- Every protected request resolves the authenticated user and scopes reads/writes by `userId`.
- User A cannot read or mutate User B records.

## Deployment Approach

- Build backend and frontend independently.
- Serve frontend assets and backend API over HTTPS.
- Configure backend environment for MongoDB and JWT secret.
