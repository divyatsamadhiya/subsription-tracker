# Architecture

## Stack

- Frontend: React + Vite + TypeScript
- State management: Zustand
- Persistence: IndexedDB via Dexie
- PWA: `vite-plugin-pwa`
- Validation: Zod
- Testing: Vitest + React Testing Library + Playwright
- Deployment: static hosting (for example Cloudflare Pages / Netlify / GitHub Pages)

## Canonical V1 Types

```ts
type BillingCycle = "weekly" | "monthly" | "yearly" | "custom_days";

interface Subscription {
  id: string;
  name: string;
  amountMinor: number; // integer minor units (e.g., cents)
  currency: string; // app default in V1
  billingCycle: BillingCycle;
  customIntervalDays?: number;
  nextBillingDate: string; // ISO date
  category: "entertainment" | "productivity" | "utilities" | "health" | "other";
  reminderDaysBefore: number[]; // e.g. [1, 3, 7]
  isActive: boolean;
  notes?: string;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

interface AppSettings {
  defaultCurrency: string; // e.g., USD
  weekStartsOn: 0 | 1; // 0 = Sunday, 1 = Monday
  notificationsEnabled: boolean;
}

interface BackupFileV1 {
  version: "1.0";
  exportedAt: string; // ISO datetime
  settings: AppSettings;
  subscriptions: Subscription[];
}
```

## Data Flow

1. UI event triggers action in Zustand store.
2. Store validates input with Zod where applicable.
3. Persistence layer writes/reads through Dexie (IndexedDB).
4. Selectors compute dashboard totals, projections, and due-soon lists.
5. UI subscribes to selectors and renders current state.

## Reminder Strategy and Web Limitations

- Always support in-app reminders for due-soon and due-today subscriptions.
- Browser notifications are optional and require user permission.
- On the web, exact background-timed reminders are not guaranteed across browsers when the app is not active.
- Provide `.ics` calendar export as a reliability fallback for external reminder systems.

## Deployment Approach

- Build static assets using Vite.
- Deploy to static hosting provider.
- Serve via HTTPS for PWA installability and notifications support.
