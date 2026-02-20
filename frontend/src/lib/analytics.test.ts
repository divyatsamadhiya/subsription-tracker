import { describe, expect, it } from "vitest";
import {
  buildAnalyticsSummary,
  buildCategorySpend,
  buildRenewalBuckets,
  buildSpendTrend
} from "./analytics";
import type { Subscription } from "../types";

const makeSubscription = (overrides?: Partial<Subscription>): Subscription => ({
  id: "sub_1",
  name: "Base",
  amountMinor: 1000,
  currency: "USD",
  billingCycle: "monthly",
  nextBillingDate: "2026-02-15",
  category: "productivity",
  reminderDaysBefore: [1, 3, 7],
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides
});

describe("analytics helpers", () => {
  it("builds mixed-cycle spend trend forecast", () => {
    const subscriptions: Subscription[] = [
      makeSubscription({ id: "monthly", amountMinor: 1000, nextBillingDate: "2026-02-15" }),
      makeSubscription({
        id: "weekly",
        amountMinor: 500,
        billingCycle: "weekly",
        nextBillingDate: "2026-02-11"
      }),
      makeSubscription({
        id: "yearly",
        amountMinor: 12000,
        billingCycle: "yearly",
        nextBillingDate: "2026-04-01"
      }),
      makeSubscription({
        id: "custom",
        amountMinor: 300,
        billingCycle: "custom_days",
        customIntervalDays: 10,
        nextBillingDate: "2026-02-10"
      })
    ];

    const trend = buildSpendTrend(subscriptions, { fromIsoDate: "2026-02-10", monthsAhead: 6 });
    expect(trend.map((point) => point.monthKey)).toEqual([
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07"
    ]);
    expect(trend.map((point) => point.amountMinor)).toEqual([3100, 3900, 16400, 4200, 3900, 4400]);
  });

  it("builds category spend totals and shares", () => {
    const subscriptions: Subscription[] = [
      makeSubscription({
        id: "productivity_monthly",
        amountMinor: 1000,
        category: "productivity",
        billingCycle: "monthly"
      }),
      makeSubscription({
        id: "productivity_yearly",
        amountMinor: 12000,
        category: "productivity",
        billingCycle: "yearly"
      }),
      makeSubscription({
        id: "utilities_weekly",
        amountMinor: 500,
        category: "utilities",
        billingCycle: "weekly"
      }),
      makeSubscription({
        id: "health_custom",
        amountMinor: 300,
        category: "health",
        billingCycle: "custom_days",
        customIntervalDays: 10
      })
    ];

    const categories = buildCategorySpend(subscriptions);
    expect(categories.map((point) => [point.category, point.amountMinor])).toEqual([
      ["utilities", 2167],
      ["productivity", 2000],
      ["health", 900]
    ]);
    expect(categories.reduce((sum, point) => sum + point.share, 0)).toBeCloseTo(1, 8);
  });

  it("builds fixed renewal buckets in 30-day window", () => {
    const subscriptions: Subscription[] = [
      makeSubscription({ id: "b0", nextBillingDate: "2026-02-10" }),
      makeSubscription({ id: "b1", nextBillingDate: "2026-02-18" }),
      makeSubscription({ id: "b2", nextBillingDate: "2026-02-25" }),
      makeSubscription({ id: "b3", nextBillingDate: "2026-03-11" }),
      makeSubscription({ id: "inactive", nextBillingDate: "2026-02-12", isActive: false }),
      makeSubscription({ id: "outside", nextBillingDate: "2026-03-20" })
    ];

    const buckets = buildRenewalBuckets(subscriptions, { fromIsoDate: "2026-02-10", daysAhead: 30 });
    expect(buckets).toEqual([
      { bucketLabel: "0-7 days", count: 1 },
      { bucketLabel: "8-14 days", count: 1 },
      { bucketLabel: "15-21 days", count: 1 },
      { bucketLabel: "22-30 days", count: 1 }
    ]);
  });

  it("returns empty analytics for empty and inactive-only sets", () => {
    expect(buildSpendTrend([], { fromIsoDate: "2026-02-10", monthsAhead: 2 })).toEqual([
      { monthLabel: "Feb 2026", monthKey: "2026-02", amountMinor: 0 },
      { monthLabel: "Mar 2026", monthKey: "2026-03", amountMinor: 0 }
    ]);
    expect(buildCategorySpend([])).toEqual([]);
    expect(buildRenewalBuckets([], { fromIsoDate: "2026-02-10", daysAhead: 30 })).toEqual([
      { bucketLabel: "0-7 days", count: 0 },
      { bucketLabel: "8-14 days", count: 0 },
      { bucketLabel: "15-21 days", count: 0 },
      { bucketLabel: "22-30 days", count: 0 }
    ]);

    const inactiveOnly = [makeSubscription({ id: "inactive", isActive: false })];
    const summary = buildAnalyticsSummary(inactiveOnly, "2026-02-10");
    expect(summary).toEqual({
      monthlyBaselineMinor: 0,
      projectedSixMonthMinor: 0,
      activeCount: 0,
      renewalCount30Days: 0
    });
  });
});
