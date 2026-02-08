# Decision Log

Format: `Date | Decision | Rationale | Impact`

| Date | Decision | Rationale | Impact |
| --- | --- | --- | --- |
| 2026-02-08 | Build V1 as a Web PWA first. | Fastest zero-login distribution across desktop/mobile browsers. | Single codebase, installable app experience, no app-store dependency for launch. |
| 2026-02-08 | Start with Core MVP scope. | Prioritize essential subscription tracking value before advanced analytics. | Faster time-to-first-release with a stable baseline. |
| 2026-02-08 | Use optional local reminders plus `.ics` fallback. | Web notification behavior varies by browser and active state. | In-app reminders are consistent; calendar export improves reliability. |
| 2026-02-08 | Use manual JSON import/export backup. | Preserves privacy and avoids backend complexity in V1. | Users can recover or move data without login/cloud accounts. |
| 2026-02-08 | Support a single app-wide default currency in V1. | Keeps totals and UX straightforward for initial release. | Defers multi-currency conversion complexity to future versions. |
| 2026-02-08 | No backend and no login in V1. | Product principle is instant start with local-first privacy. | All data remains on user device; reduced operational overhead. |
| 2026-02-08 | Store planning docs under `docs/plan/`. | Requirement to preserve plan discussions as project artifacts. | Centralized, versioned planning history in-repo. |
