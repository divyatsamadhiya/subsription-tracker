# Pulseboard Subscription Tracker

A local-first subscription tracker built from the project planning docs in `docs/plan/`.

## What is implemented

- Subscription CRUD with validation
- Monthly and yearly spending projections
- Upcoming renewals for 7-day and 30-day windows
- Reminder center with optional browser notifications
- `.ics` export per subscription for external calendar reminders
- JSON backup export/import (`BackupFileV1`)
- Responsive, installable PWA shell with offline caching

## Stack

- React + Vite + TypeScript
- Zustand state store
- Dexie (IndexedDB persistence)
- Zod validation
- Vitest test runner
- `vite-plugin-pwa`

## Run locally

```bash
npm install
npm run dev
```

## Build and test

```bash
npm run test
npm run build
```

## Notes

- Data is stored in IndexedDB (`pulseboard-db`) and never leaves the device.
- Browser notifications require permission and are reliable only when the app is active.
- Use JSON export/import for manual backup and migration.
