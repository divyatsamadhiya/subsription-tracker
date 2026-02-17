# Contributing

Thanks for contributing to Pulseboard.

## Prerequisites

- Node.js 20+
- npm 10+
- MongoDB

## Local Setup

1. Install dependencies:
   - `npm install`
2. Create local env file:
   - `cp .env.example .env`
3. Start the app:
   - `npm run dev`

## Development Workflow

1. Create a feature branch from `master`.
2. Keep changes scoped and reviewable.
3. Run checks locally before opening a PR:
   - `npm run test`
   - `npm run build`
4. Open a pull request targeting `master`.

## Pull Request Expectations

- Include a clear problem statement and summary of changes.
- Include test updates for behavior changes.
- Keep security-sensitive details out of public discussions.

## Security

If you discover a vulnerability, do not open a public issue. Follow `SECURITY.md`.
