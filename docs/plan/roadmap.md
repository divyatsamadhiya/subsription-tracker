# Roadmap

## Phase 1: Project Setup and Foundations

### Deliverables

- Initialize React + Vite + TypeScript project.
- Configure linting, formatting, and test tools.
- Set up base PWA configuration and app shell.
- Define initial folder/module structure.

### Exit Criteria

- Project boots locally.
- CI-ready commands exist for lint/test/build.
- PWA baseline is functional.

## Phase 2: Domain and Storage Layer

### Deliverables

- Implement domain types and date/cycle utilities.
- Set up Dexie schema and IndexedDB adapters.
- Implement settings storage and seed defaults.

### Exit Criteria

- Subscriptions and settings can be stored/retrieved locally.
- Core calculations (next due, cycle handling) pass unit tests.

## Phase 3: Subscription CRUD

### Deliverables

- Build create/edit/delete flows with form validation.
- Add list/detail views with category and status indicators.
- Handle error and empty states.

### Exit Criteria

- Full CRUD works with persistence across refresh.
- Validation prevents invalid records.

## Phase 4: Dashboard and Renewals

### Deliverables

- Monthly and yearly total cards.
- Upcoming renewals for 7/30 day windows.
- Active subscription count and basic filters/sorting.

### Exit Criteria

- Totals match stored data.
- Renewals list is accurate and chronologically ordered.

## Phase 5: Reminders

### Deliverables

- In-app due and due-soon alerts.
- Browser notification permission and dispatch (active app context).
- `.ics` export for external calendar reminders.

### Exit Criteria

- Reminder preferences are applied per subscription.
- Notification behavior is documented with known web constraints.

## Phase 6: Backup and Restore

### Deliverables

- JSON export with versioned schema (`BackupFileV1`).
- JSON import with Zod validation and safe replace flow.

### Exit Criteria

- Export/import round-trip restores full app state.
- Invalid backup files fail with clear user errors.

## Phase 7: Polish and Release

### Deliverables

- Accessibility and responsive UI pass.
- Offline behavior validation after first load.
- Deployment docs and production build verification.

### Exit Criteria

- Core acceptance scenarios pass (unit + e2e).
- App is deployable on static hosting with HTTPS.
