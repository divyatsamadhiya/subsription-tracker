# MVP Scope

## In Scope (Current V1)

1. User registration, login, logout, and session bootstrap (`/auth/*`).
2. Account-scoped subscription CRUD via Express API.
3. Monthly and yearly spending projections in frontend dashboard.
4. Upcoming renewals view for 7-day and 30-day windows.
5. Optional browser reminders while app is active.
6. `.ics` export per subscription.
7. Account-scoped settings persistence (`/settings`).
8. Backend backup export/import (`BackupFileV1`).
9. Monorepo separation into independent `frontend` and `backend` apps.

## Out of Scope (Current V1)

1. OAuth or social login providers.
2. Password reset/MFA.
3. Cloud multi-device merge conflict tooling.
4. Payment or bank integrations.
5. Premium billing tiers.
6. Multi-currency conversion.

## Migration Scope Decisions

- Fresh-start cutover from local Dexie to backend storage.
- No automatic local IndexedDB migration path.
- Online-first data operations.

## V1 Feature Checklist

- [x] Auth endpoints and protected session flow
- [x] Subscription CRUD via backend API
- [x] Spending totals and renewals tracking
- [x] Reminder center and `.ics` export
- [x] Backup import/export via backend
- [x] Monorepo frontend/backend app split
