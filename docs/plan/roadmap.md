# Roadmap

## Phase 1: Monorepo Restructure

### Deliverables

- Split repository into `frontend` and `backend` workspaces.
- Update root scripts for single-command dev/build/test orchestration.
- Move existing Vite app into `frontend` package.

### Exit Criteria

- New folder structure is in place.
- Root scripts run workspace commands successfully.

## Phase 2: Independent Contracts

### Deliverables

- Keep frontend and backend contracts fully independent.
- Add backend request/response schema validation.
- Add frontend request parsing and validation for API responses.

### Exit Criteria

- Frontend and backend compile independently.
- API contracts remain stable and documented.

## Phase 3: Backend Foundation

### Deliverables

- Implement Express app bootstrap and middleware stack.
- Configure MongoDB connection and data models.
- Add auth utilities (bcrypt + JWT cookie handling).

### Exit Criteria

- Backend starts with valid env vars.
- Health and auth endpoints respond as expected.

## Phase 4: Protected Domain APIs

### Deliverables

- Implement protected subscriptions/settings/backup routes.
- Enforce per-user data scoping across queries/mutations.
- Add request validation and centralized error handling.

### Exit Criteria

- Unauthorized access returns 401.
- CRUD/settings/backup routes function for authenticated users.

## Phase 5: Frontend Data Layer Migration

### Deliverables

- Replace Dexie store persistence with API client calls.
- Add login/register UI gate before dashboard views.
- Keep existing dashboard, reminders, and export UX flows.

### Exit Criteria

- Authenticated users can complete all core flows.
- App behavior remains stable with backend data source.

## Phase 6: Documentation and Validation

### Deliverables

- Rewrite architecture and scope docs for backend model.
- Add decision log entries for architecture pivot.
- Validate workspace tests/build commands.

### Exit Criteria

- Documentation reflects current implementation.
- Test command is green.
- Build command is green once backend dependencies are installed.
