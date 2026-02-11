# Decision Log

Format: `Date | Decision | Rationale | Impact`

| Date | Decision | Rationale | Impact |
| --- | --- | --- | --- |
| 2026-02-08 | Build V1 as a Web PWA first. | Fastest zero-login distribution across desktop/mobile browsers. | Single codebase, installable app experience, no app-store dependency for launch. |
| 2026-02-08 | Start with Core MVP scope. | Prioritize essential subscription tracking value before advanced analytics. | Faster time-to-first-release with a stable baseline. |
| 2026-02-08 | Use optional local reminders plus `.ics` fallback. | Web notification behavior varies by browser and active state. | In-app reminders are consistent; calendar export improves reliability. |
| 2026-02-08 | Use manual JSON import/export backup. | Preserves privacy and avoids backend complexity in V1. | Users can recover or move data without login/cloud accounts. |
| 2026-02-08 | Support a single app-wide default currency in V1. | Keeps totals and UX straightforward for initial release. | Defers multi-currency conversion complexity to future versions. |
| 2026-02-08 | No backend and no login in V1. | Product principle was instant start with local-first privacy. | All data stayed on user device; reduced operational overhead. |
| 2026-02-08 | Store planning docs under `docs/plan/`. | Requirement to preserve plan discussions as project artifacts. | Centralized, versioned planning history in-repo. |
| 2026-02-11 | Split monorepo into `frontend`, `backend`, and `shared`. | Required clear separation of concerns and backend ownership boundaries. | Frontend and backend now evolve independently with shared contracts. |
| 2026-02-11 | Adopt Express.js + MongoDB backend. | Needed account-backed persistence and protected API resources. | Data now persists server-side with user-scoped access controls. |
| 2026-02-11 | Add email/password auth with JWT HTTP-only cookie. | Needed practical V1 authentication with low integration overhead. | Session-based protected APIs with secure cookie transport. |
| 2026-02-11 | Use REST APIs under `/api/v1`. | Clear versioned route design and predictable integration surface. | Easier API evolution and frontend client structure. |
| 2026-02-11 | Move to online-first operation and fresh-start cutover. | Migration complexity for local Dexie carryover was out of scope. | No automatic legacy browser data migration path. |
| 2026-02-11 | Keep frontend and backend fully separate with no shared code package. | Requirement was complete app-level separation and independent ownership. | Duplicate contracts are now maintained separately in each app. |
| 2026-02-11 | Refactor backend into route/controller/service layers. | Improve maintainability, testability, and cleaner separation of responsibilities. | Route files are thin and business logic moved into services. |
| 2026-02-11 | Add Winston-based positive and negative path logging. | Need consistent operational visibility across success and error flows. | Request, service, and error paths now emit structured logs. |
