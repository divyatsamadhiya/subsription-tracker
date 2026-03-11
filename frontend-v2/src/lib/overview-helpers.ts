import type { Subscription } from "./types";

const monthlyCost = (s: Subscription): number => {
  switch (s.billingCycle) {
    case "weekly":
      return s.amountMinor * (52 / 12);
    case "monthly":
      return s.amountMinor;
    case "yearly":
      return s.amountMinor / 12;
    case "custom_days":
      return s.amountMinor * (30 / (s.customIntervalDays ?? 30));
    default:
      return 0;
  }
};

/**
 * Build a 7-point sparkline by simulating cumulative monthly cost
 * as subscriptions were added over time (sorted by createdAt).
 */
export function buildSpendSparkline(subscriptions: Subscription[]): number[] {
  const active = subscriptions.filter((s) => s.isActive);
  if (active.length === 0) return [0, 0, 0, 0, 0, 0, 0];

  const sorted = [...active].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );

  const points = 7;
  const result: number[] = [];
  for (let i = 0; i < points; i++) {
    const cutoff = Math.ceil(((i + 1) / points) * sorted.length);
    const slice = sorted.slice(0, cutoff);
    const total = slice.reduce((sum, s) => sum + monthlyCost(s), 0);
    result.push(Math.round(total));
  }
  return result;
}

/**
 * Build a 7-point sparkline for active subscription count growth.
 */
export function buildCountSparkline(subscriptions: Subscription[]): number[] {
  const active = subscriptions.filter((s) => s.isActive);
  if (active.length === 0) return [0, 0, 0, 0, 0, 0, 0];

  const sorted = [...active].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );

  const points = 7;
  return Array.from({ length: points }, (_, i) =>
    Math.ceil(((i + 1) / points) * sorted.length)
  );
}

/**
 * Estimate a trend % based on recently-added subs vs older ones.
 * Returns null if not enough data to show a meaningful trend.
 */
export function estimateTrend(subscriptions: Subscription[]): number | null {
  const active = subscriptions.filter((s) => s.isActive);
  if (active.length < 2) return null;

  const sorted = [...active].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );

  const mid = Math.floor(sorted.length / 2);
  const olderCost = sorted
    .slice(0, mid)
    .reduce((sum, s) => sum + monthlyCost(s), 0);
  const newerCost = sorted
    .slice(mid)
    .reduce((sum, s) => sum + monthlyCost(s), 0);

  if (olderCost === 0) return null;
  return Math.round(((newerCost - olderCost) / olderCost) * 100);
}
