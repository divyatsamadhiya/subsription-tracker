# Changelog

All notable changes to this project will be documented in this file.

## v0.3.0 - 2026-02-28

### Changed

- Migrated backend database from MongoDB (Mongoose) to PostgreSQL (Prisma ORM).
- Replaced all Mongoose model files with a Prisma schema defining 3 models, 3 enums, cascade deletes, and compound indexes.
- Migrated all 5 service files to Prisma query API with type-safe queries and P2025 error handling.
- Updated all backend test files with centralized Prisma mock helper.
- Replaced `MONGODB_URI` environment variable with `DATABASE_URL` (PostgreSQL connection string).

### Added

- Prisma schema (`backend/prisma/schema.prisma`) with PostgreSQL enums and initial migration.
- Prisma client singleton (`backend/src/prisma.ts`) with `@prisma/adapter-pg` driver adapter.
- One-time data migration script (`backend/scripts/migrate-mongo-to-pg.ts`) for MongoDB to PostgreSQL transfer.
- Centralized test mock helper (`backend/src/test/mockPrisma.ts`).
- Database management scripts: `db:generate`, `db:migrate`, `db:push`, `db:studio`.

### Removed

- Mongoose ORM dependency and all Mongoose model files (`User.ts`, `Settings.ts`, `Subscription.ts`).
- MongoDB dependency (`mongodb` driver removed after data migration).

### Fixed

- Resolved all 14 npm audit vulnerabilities (8 moderate, 6 high) via direct updates and npm overrides.

## v0.2.0 - 2026-02-17

### Added

- Full-stack monorepo architecture with:
  - React + Vite frontend (`frontend`)
  - Express + MongoDB backend (`backend`)
- Public open-source readiness assets:
  - MIT `LICENSE`
  - `.env.example`
  - `CONTRIBUTING.md`
  - `CODE_OF_CONDUCT.md`
  - `SECURITY.md` reporting workflow
- GitHub automation:
  - CI workflow for test/build
  - Dependabot configuration for npm and GitHub Actions

### Changed

- README rewritten for public setup, contribution, security, and support expectations.
- `master` branch promoted to include latest `develop` code and open-source hardening updates.
