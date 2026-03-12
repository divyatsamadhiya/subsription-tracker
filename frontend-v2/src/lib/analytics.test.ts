import { describe, it, expect } from "vitest";
import {
  buildSpendTrend,
  buildSpendComparisonTrend,
  buildCategorySpend,
  buildCategoryTrend,
  buildRenewalBuckets,
  buildAnalyticsSummary,
  buildRoiData,
  getCategoryChangeMeta,
  getAnalyticsRangeMonths,
  getSubscriptionsForCategoryPoint,
  getMostCancelledCategory,
} from "./analytics";
import { getRoiVerdict } from "./roi-ratings";
import { buildSubscription } from "@/test/factories";

describe("buildSpendTrend", () => {
  it("returns correct number of month points", () => {
    const result = buildSpendTrend([], "2026-03-11", 6);
    expect(result).toHaveLength(6);
  });

  it("returns at least 1 point when monthsAhead is 0", () => {
    const result = buildSpendTrend([], "2026-03-11", 0);
    expect(result).toHaveLength(1);
  });

  it("fills in spend for monthly subscription", () => {
    const subs = [
      buildSubscription({
        billingCycle: "monthly",
        amountMinor: 1000,
        nextBillingDate: "2026-03-15",
        isActive: true,
      }),
    ];
    const result = buildSpendTrend(subs, "2026-03-01", 3);
    // Should charge once in March, once in April, once in May
    expect(result[0].amountMinor).toBe(1000); // Mar
    expect(result[1].amountMinor).toBe(1000); // Apr
    expect(result[2].amountMinor).toBe(1000); // May
  });

  it("excludes inactive subscriptions", () => {
    const subs = [
      buildSubscription({
        billingCycle: "monthly",
        amountMinor: 1000,
        nextBillingDate: "2026-03-15",
        isActive: false,
      }),
    ];
    const result = buildSpendTrend(subs, "2026-03-01", 3);
    expect(result.every((p) => p.amountMinor === 0)).toBe(true);
  });

  it("handles weekly subscriptions (multiple charges per month)", () => {
    const subs = [
      buildSubscription({
        billingCycle: "weekly",
        amountMinor: 100,
        nextBillingDate: "2026-03-01",
        isActive: true,
      }),
    ];
    const result = buildSpendTrend(subs, "2026-03-01", 1);
    // March has ~4-5 weekly charges starting from Mar 1
    expect(result[0].amountMinor).toBeGreaterThanOrEqual(400);
    expect(result[0].amountMinor).toBeLessThanOrEqual(500);
  });

  it("handles yearly subscriptions", () => {
    const subs = [
      buildSubscription({
        billingCycle: "yearly",
        amountMinor: 12000,
        nextBillingDate: "2026-06-01",
        isActive: true,
      }),
    ];
    const result = buildSpendTrend(subs, "2026-03-01", 6);
    // Only charges in June (index 3)
    const chargedMonths = result.filter((p) => p.amountMinor > 0);
    expect(chargedMonths).toHaveLength(1);
    expect(chargedMonths[0].monthKey).toBe("2026-06");
  });

  it("handles custom_days subscriptions", () => {
    const subs = [
      buildSubscription({
        billingCycle: "custom_days",
        customIntervalDays: 14,
        amountMinor: 500,
        nextBillingDate: "2026-03-01",
        isActive: true,
      }),
    ];
    const result = buildSpendTrend(subs, "2026-03-01", 1);
    // Mar 1 + Mar 15 + Mar 29 = 3 charges
    expect(result[0].amountMinor).toBe(1500);
  });

  it("advances past billing dates before the start", () => {
    const subs = [
      buildSubscription({
        billingCycle: "monthly",
        amountMinor: 1000,
        nextBillingDate: "2025-01-15",
        isActive: true,
      }),
    ];
    const result = buildSpendTrend(subs, "2026-03-01", 1);
    // Should have advanced from Jan 2025 to Mar 2026
    expect(result[0].amountMinor).toBe(1000);
  });

  it("rewinds future billing dates to fill historical windows", () => {
    const subs = [
      buildSubscription({
        billingCycle: "monthly",
        amountMinor: 1000,
        nextBillingDate: "2026-03-15",
        isActive: true,
      }),
    ];
    const result = buildSpendTrend(subs, "2025-12-01", 3);
    expect(result.map((point) => point.amountMinor)).toEqual([1000, 1000, 1000]);
  });

  it("has monthLabel and monthKey for each point", () => {
    const result = buildSpendTrend([], "2026-03-01", 3);
    expect(result[0].monthKey).toBe("2026-03");
    expect(result[1].monthKey).toBe("2026-04");
    expect(result[2].monthKey).toBe("2026-05");
    result.forEach((p) => {
      expect(p.monthLabel).toBeTruthy();
    });
  });

  it("sums multiple subscriptions charging in the same month", () => {
    const subs = [
      buildSubscription({
        billingCycle: "monthly",
        amountMinor: 1000,
        nextBillingDate: "2026-03-01",
        isActive: true,
      }),
      buildSubscription({
        billingCycle: "monthly",
        amountMinor: 500,
        nextBillingDate: "2026-03-15",
        isActive: true,
      }),
    ];
    const result = buildSpendTrend(subs, "2026-03-01", 1);
    expect(result[0].amountMinor).toBe(1500);
  });
});

describe("buildSpendComparisonTrend", () => {
  it("returns 12 months of current spend with previous-period overlays", () => {
    const subs = [
      buildSubscription({
        billingCycle: "monthly",
        amountMinor: 1000,
        nextBillingDate: "2026-03-15",
        isActive: true,
      }),
    ];

    const result = buildSpendComparisonTrend(subs, "2026-03-11", 12);

    expect(result).toHaveLength(12);
    expect(result[0].amountMinor).toBe(1000);
    expect(result[0].previousAmountMinor).toBe(1000);
    expect(result[1].cumulativeAmountMinor).toBe(2000);
  });

  it("includes contributor breakdowns for each current-period month", () => {
    const subs = [
      buildSubscription({
        id: "claude",
        name: "Claude Pro",
        billingCycle: "monthly",
        amountMinor: 1000,
        nextBillingDate: "2026-03-15",
        isActive: true,
      }),
      buildSubscription({
        id: "youtube",
        name: "YouTube Premium",
        billingCycle: "monthly",
        amountMinor: 500,
        nextBillingDate: "2026-03-05",
        isActive: true,
      }),
    ];

    const result = buildSpendComparisonTrend(subs, "2026-03-11", 1);

    expect(result[0].contributors).toEqual([
      { subscriptionId: "claude", name: "Claude Pro", amountMinor: 1000 },
      { subscriptionId: "youtube", name: "YouTube Premium", amountMinor: 500 },
    ]);
  });
});

describe("getAnalyticsRangeMonths", () => {
  const subscriptions = [
    buildSubscription({ createdAt: "2025-01-10T00:00:00Z" }),
    buildSubscription({ createdAt: "2026-02-12T00:00:00Z" }),
  ];

  it("returns fixed month counts for short ranges", () => {
    expect(getAnalyticsRangeMonths(subscriptions, "2026-03-11", "3m")).toBe(3);
    expect(getAnalyticsRangeMonths(subscriptions, "2026-03-11", "6m")).toBe(6);
    expect(getAnalyticsRangeMonths(subscriptions, "2026-03-11", "1y")).toBe(12);
  });

  it("returns the full tracked span for all", () => {
    expect(getAnalyticsRangeMonths(subscriptions, "2026-03-11", "all")).toBe(15);
  });
});

describe("buildCategorySpend", () => {
  it("returns empty array for no subscriptions", () => {
    expect(buildCategorySpend([], "2026-03-11")).toEqual([]);
  });

  it("returns empty array for only inactive subscriptions", () => {
    const subs = [
      buildSubscription({ isActive: false, category: "entertainment" }),
    ];
    expect(buildCategorySpend(subs, "2026-03-11")).toEqual([]);
  });

  it("groups by category with monthly equivalents", () => {
    const subs = [
      buildSubscription({
        category: "entertainment",
        billingCycle: "monthly",
        amountMinor: 1000,
        isActive: true,
      }),
      buildSubscription({
        category: "entertainment",
        billingCycle: "monthly",
        amountMinor: 500,
        isActive: true,
      }),
      buildSubscription({
        category: "productivity",
        billingCycle: "monthly",
        amountMinor: 2000,
        isActive: true,
      }),
    ];
    const result = buildCategorySpend(subs, "2026-03-11");
    expect(result).toHaveLength(2);
    // Sorted by amount descending
    expect(result[0].category).toBe("productivity");
    expect(result[0].amountMinor).toBe(2000);
    expect(result[1].category).toBe("entertainment");
    expect(result[1].amountMinor).toBe(1500);
  });

  it("calculates share as fraction of total", () => {
    const subs = [
      buildSubscription({
        category: "entertainment",
        billingCycle: "monthly",
        amountMinor: 3000,
        isActive: true,
      }),
      buildSubscription({
        category: "productivity",
        billingCycle: "monthly",
        amountMinor: 1000,
        isActive: true,
      }),
    ];
    const result = buildCategorySpend(subs, "2026-03-11");
    expect(result[0].share).toBeCloseTo(0.75, 2);
    expect(result[1].share).toBeCloseTo(0.25, 2);
  });

  it("sorts by amount descending", () => {
    const subs = [
      buildSubscription({
        category: "health",
        billingCycle: "monthly",
        amountMinor: 100,
        isActive: true,
      }),
      buildSubscription({
        category: "utilities",
        billingCycle: "monthly",
        amountMinor: 5000,
        isActive: true,
      }),
      buildSubscription({
        category: "other",
        billingCycle: "monthly",
        amountMinor: 2000,
        isActive: true,
      }),
    ];
    const result = buildCategorySpend(subs, "2026-03-11");
    expect(result[0].category).toBe("utilities");
    expect(result[1].category).toBe("other");
    expect(result).toHaveLength(2);
  });

  it("handles yearly billing cycle conversion", () => {
    const subs = [
      buildSubscription({
        category: "entertainment",
        billingCycle: "yearly",
        amountMinor: 12000,
        isActive: true,
      }),
    ];
    const result = buildCategorySpend(subs, "2026-03-11");
    expect(result).toHaveLength(1);
    expect(result[0].amountMinor).toBe(1000); // 12000 / 12
  });

  it("calculates month-over-month change per category", () => {
    const subs = [
      buildSubscription({
        category: "productivity",
        billingCycle: "monthly",
        amountMinor: 1200,
        createdAt: "2026-03-01T00:00:00Z",
        isActive: true,
      }),
      buildSubscription({
        category: "productivity",
        billingCycle: "monthly",
        amountMinor: 1000,
        createdAt: "2026-02-01T00:00:00Z",
        isActive: true,
      }),
    ];

    const result = buildCategorySpend(subs, "2026-03-11");
    expect(result[0].momChangePercent).toBeCloseTo(120, 1);
  });

  it("rolls small categories into the other bucket", () => {
    const subs = [
      buildSubscription({ category: "productivity", amountMinor: 3000, isActive: true }),
      buildSubscription({ category: "entertainment", amountMinor: 2500, isActive: true }),
      buildSubscription({ category: "utilities", amountMinor: 2200, isActive: true }),
      buildSubscription({ category: "health", amountMinor: 200, isActive: true }),
      buildSubscription({ category: "other", amountMinor: 150, isActive: true }),
    ];

    const result = buildCategorySpend(subs, "2026-03-11");
    const otherPoint = result.find((point) => point.category === "other");

    expect(otherPoint).toBeTruthy();
    expect(otherPoint?.sourceCategories).toEqual(expect.arrayContaining(["health", "other"]));
    expect(otherPoint?.amountMinor).toBe(350);
  });
});

describe("buildCategoryTrend", () => {
  it("returns correct number of month points", () => {
    const result = buildCategoryTrend([], "2026-03-11", 6);
    expect(result).toHaveLength(6);
    expect(result[0].monthKey).toBe("2026-03");
    expect(result[5].monthKey).toBe("2026-08");
  });

  it("returns all category keys with zero values for no subscriptions", () => {
    const result = buildCategoryTrend([], "2026-03-11", 1);
    expect(result[0].entertainment).toBe(0);
    expect(result[0].productivity).toBe(0);
    expect(result[0].utilities).toBe(0);
    expect(result[0].health).toBe(0);
    expect(result[0].other).toBe(0);
  });

  it("breaks down monthly spend by category", () => {
    const subs = [
      buildSubscription({
        category: "entertainment",
        billingCycle: "monthly",
        amountMinor: 1000,
        isActive: true,
      }),
      buildSubscription({
        category: "productivity",
        billingCycle: "monthly",
        amountMinor: 2000,
        isActive: true,
      }),
    ];
    const result = buildCategoryTrend(subs, "2026-03-11", 1);
    expect(result[0].entertainment).toBe(10); // 1000 minor / 100
    expect(result[0].productivity).toBe(20); // 2000 minor / 100
    expect(result[0].health).toBe(0);
  });

  it("excludes subscriptions not yet created", () => {
    const subs = [
      buildSubscription({
        category: "health",
        billingCycle: "monthly",
        amountMinor: 500,
        isActive: true,
        createdAt: "2026-06-01T00:00:00Z",
      }),
    ];
    const result = buildCategoryTrend(subs, "2026-03-11", 6);
    // Not yet created in March through May
    expect(result[0].health).toBe(0);
    expect(result[1].health).toBe(0);
    expect(result[2].health).toBe(0);
    // Active from June onward
    expect(result[3].health).toBe(5);
  });

  it("converts yearly billing to monthly equivalent", () => {
    const subs = [
      buildSubscription({
        category: "utilities",
        billingCycle: "yearly",
        amountMinor: 12000,
        isActive: true,
      }),
    ];
    const result = buildCategoryTrend(subs, "2026-03-11", 1);
    expect(result[0].utilities).toBe(10); // 12000 / 12 = 1000 minor → 10 display
  });
});

describe("getCategoryChangeMeta", () => {
  it("formats positive month-over-month changes compactly", () => {
    expect(getCategoryChangeMeta(12.4)).toEqual({
      label: "+12% MoM",
      tone: "positive",
    });
  });

  it("returns neutral labels for flat or new categories", () => {
    expect(getCategoryChangeMeta(0.2)).toEqual({
      label: "Flat",
      tone: "neutral",
    });
    expect(getCategoryChangeMeta(null)).toEqual({
      label: "New",
      tone: "neutral",
    });
  });

  it("formats negative month-over-month changes compactly", () => {
    expect(getCategoryChangeMeta(-18.7)).toEqual({
      label: "-19% MoM",
      tone: "negative",
    });
  });
});

describe("getSubscriptionsForCategoryPoint", () => {
  it("returns active subscriptions matching the selected category sources", () => {
    const subscriptions = [
      buildSubscription({
        id: "claude",
        name: "Claude Pro",
        category: "productivity",
        amountMinor: 2200,
        isActive: true,
      }),
      buildSubscription({
        id: "notion",
        name: "Notion",
        category: "productivity",
        amountMinor: 400,
        isActive: true,
      }),
      buildSubscription({
        id: "youtube",
        name: "YouTube Premium",
        category: "entertainment",
        amountMinor: 300,
        isActive: true,
      }),
      buildSubscription({
        id: "old-linkedin",
        name: "LinkedIn Premium",
        category: "productivity",
        amountMinor: 900,
        isActive: false,
      }),
    ];

    const result = getSubscriptionsForCategoryPoint(subscriptions, {
      category: "productivity",
      amountMinor: 2600,
      share: 0.5,
      momChangePercent: 10,
      sourceCategories: ["productivity"],
    });

    expect(result.map((subscription) => subscription.id)).toEqual(["claude", "notion"]);
  });

  it("supports rolled-up other buckets through source categories", () => {
    const subscriptions = [
      buildSubscription({
        id: "fit",
        name: "Fitbod",
        category: "health",
        amountMinor: 500,
        isActive: true,
      }),
      buildSubscription({
        id: "misc",
        name: "Domain renewal",
        category: "other",
        amountMinor: 250,
        isActive: true,
      }),
      buildSubscription({
        id: "claude",
        name: "Claude Pro",
        category: "productivity",
        amountMinor: 2200,
        isActive: true,
      }),
    ];

    const result = getSubscriptionsForCategoryPoint(subscriptions, {
      category: "other",
      amountMinor: 750,
      share: 0.1,
      momChangePercent: null,
      sourceCategories: ["health", "other"],
    });

    expect(result.map((subscription) => subscription.id)).toEqual(["fit", "misc"]);
  });
});

describe("buildRenewalBuckets", () => {
  it("returns 4 buckets", () => {
    const result = buildRenewalBuckets([], "2026-03-11");
    expect(result).toHaveLength(4);
    expect(result[0].bucketKey).toBe("0-7");
    expect(result[0].bucketLabel).toBe("0-7 days");
    expect(result[1].bucketLabel).toBe("8-14 days");
    expect(result[2].bucketLabel).toBe("15-21 days");
    expect(result[3].bucketLabel).toBe("22-30 days");
  });

  it("all counts are 0 for empty subscriptions", () => {
    const result = buildRenewalBuckets([], "2026-03-11");
    expect(result.every((b) => b.count === 0)).toBe(true);
  });

  it("puts subscription due in 3 days in 0-7 bucket", () => {
    const subs = [
      buildSubscription({
        id: "youtube",
        name: "YouTube Premium",
        nextBillingDate: "2026-03-14",
        amountMinor: 29900,
        isActive: true,
      }),
    ];
    const result = buildRenewalBuckets(subs, "2026-03-11");
    expect(result[0].count).toBe(1);
    expect(result[0].amountMinor).toBe(29900);
    expect(result[0].subscriptions).toEqual([
      {
        subscriptionId: "youtube",
        name: "YouTube Premium",
        amountMinor: 29900,
        nextBillingDate: "2026-03-14",
      },
    ]);
    expect(result[1].count).toBe(0);
  });

  it("puts subscription due in 10 days in 8-14 bucket", () => {
    const subs = [
      buildSubscription({ nextBillingDate: "2026-03-21", isActive: true }),
    ];
    const result = buildRenewalBuckets(subs, "2026-03-11");
    expect(result[1].count).toBe(1);
  });

  it("puts subscription due in 18 days in 15-21 bucket", () => {
    const subs = [
      buildSubscription({ nextBillingDate: "2026-03-29", isActive: true }),
    ];
    const result = buildRenewalBuckets(subs, "2026-03-11");
    expect(result[2].count).toBe(1);
  });

  it("puts subscription due in 25 days in 22-30 bucket", () => {
    const subs = [
      buildSubscription({ nextBillingDate: "2026-04-05", isActive: true }),
    ];
    const result = buildRenewalBuckets(subs, "2026-03-11");
    expect(result[3].count).toBe(1);
  });

  it("excludes subscriptions past due (negative delta)", () => {
    const subs = [
      buildSubscription({ nextBillingDate: "2026-03-01", isActive: true }),
    ];
    const result = buildRenewalBuckets(subs, "2026-03-11");
    expect(result.every((b) => b.count === 0)).toBe(true);
  });

  it("excludes subscriptions beyond 30 days", () => {
    const subs = [
      buildSubscription({ nextBillingDate: "2026-05-01", isActive: true }),
    ];
    const result = buildRenewalBuckets(subs, "2026-03-11");
    expect(result.every((b) => b.count === 0)).toBe(true);
  });

  it("excludes inactive subscriptions", () => {
    const subs = [
      buildSubscription({ nextBillingDate: "2026-03-14", isActive: false }),
    ];
    const result = buildRenewalBuckets(subs, "2026-03-11");
    expect(result.every((b) => b.count === 0)).toBe(true);
  });

  it("includes subscription due today in 0-7 bucket", () => {
    const subs = [
      buildSubscription({ nextBillingDate: "2026-03-11", isActive: true }),
    ];
    const result = buildRenewalBuckets(subs, "2026-03-11");
    expect(result[0].count).toBe(1);
  });

  it("includes subscription at boundary day 7 in 0-7 bucket", () => {
    const subs = [
      buildSubscription({ nextBillingDate: "2026-03-18", isActive: true }),
    ];
    const result = buildRenewalBuckets(subs, "2026-03-11");
    expect(result[0].count).toBe(1);
  });

  it("puts day 8 in 8-14 bucket", () => {
    const subs = [
      buildSubscription({ nextBillingDate: "2026-03-19", isActive: true }),
    ];
    const result = buildRenewalBuckets(subs, "2026-03-11");
    expect(result[1].count).toBe(1);
  });

  it("aggregates renewal amount and sorts subscriptions by upcoming date inside a bucket", () => {
    const subs = [
      buildSubscription({
        id: "claude",
        name: "Claude Pro",
        nextBillingDate: "2026-03-16",
        amountMinor: 21400,
        isActive: true,
      }),
      buildSubscription({
        id: "youtube",
        name: "YouTube Premium",
        nextBillingDate: "2026-03-13",
        amountMinor: 29900,
        isActive: true,
      }),
    ];

    const result = buildRenewalBuckets(subs, "2026-03-11");

    expect(result[0].amountMinor).toBe(51300);
    expect(result[0].subscriptions.map((subscription) => subscription.subscriptionId)).toEqual([
      "youtube",
      "claude",
    ]);
  });
});

describe("buildAnalyticsSummary", () => {
  it("returns zero summary for empty subscriptions", () => {
    const result = buildAnalyticsSummary([], "2026-03-11");
    expect(result.monthlyBaselineMinor).toBe(0);
    expect(result.projectedSixMonthMinor).toBe(0);
    expect(result.activeCount).toBe(0);
    expect(result.renewalCount30Days).toBe(0);
    expect(result.averageMonthlySpendMinor).toBe(0);
    expect(result.highestSpendMonth).toBeNull();
    expect(result.mostCancelledCategory).toBeNull();
    expect(result.currentTwelveMonthMinor).toBe(0);
    expect(result.previousTwelveMonthMinor).toBe(0);
    expect(result.yoyGrowthPercent).toBeNull();
  });

  it("counts active subscriptions", () => {
    const subs = [
      buildSubscription({ isActive: true }),
      buildSubscription({ isActive: true }),
      buildSubscription({ isActive: false }),
    ];
    const result = buildAnalyticsSummary(subs, "2026-03-11");
    expect(result.activeCount).toBe(2);
  });

  it("computes monthly baseline from active subs", () => {
    const subs = [
      buildSubscription({
        billingCycle: "monthly",
        amountMinor: 1000,
        isActive: true,
      }),
      buildSubscription({
        billingCycle: "monthly",
        amountMinor: 500,
        isActive: true,
      }),
    ];
    const result = buildAnalyticsSummary(subs, "2026-03-11");
    expect(result.monthlyBaselineMinor).toBe(1500);
  });

  it("counts renewals within 30 days", () => {
    const subs = [
      buildSubscription({
        nextBillingDate: "2026-03-15",
        isActive: true,
      }),
      buildSubscription({
        nextBillingDate: "2026-05-01",
        isActive: true,
      }),
    ];
    const result = buildAnalyticsSummary(subs, "2026-03-11");
    expect(result.renewalCount30Days).toBe(1);
  });

  it("projected six month is sum of spend trend", () => {
    const subs = [
      buildSubscription({
        billingCycle: "monthly",
        amountMinor: 1000,
        nextBillingDate: "2026-03-15",
        isActive: true,
      }),
    ];
    const result = buildAnalyticsSummary(subs, "2026-03-01");
    expect(result.projectedSixMonthMinor).toBe(6000);
  });

  it("derives average month, highest month, and growth from the 12 month view", () => {
    const subs = [
      buildSubscription({
        billingCycle: "monthly",
        amountMinor: 1000,
        nextBillingDate: "2026-03-15",
        isActive: true,
      }),
    ];
    const result = buildAnalyticsSummary(subs, "2026-03-11");

    expect(result.averageMonthlySpendMinor).toBe(1000);
    expect(result.highestSpendMonth?.amountMinor).toBe(1000);
    expect(result.currentTwelveMonthMinor).toBe(12000);
    expect(result.previousTwelveMonthMinor).toBe(12000);
    expect(result.yoyGrowthPercent).toBe(0);
  });

  it("finds the most cancelled category from inactive subscriptions", () => {
    const subs = [
      buildSubscription({ category: "utilities", isActive: false }),
      buildSubscription({ category: "utilities", isActive: false }),
      buildSubscription({ category: "health", isActive: false }),
      buildSubscription({ category: "entertainment", isActive: true }),
    ];

    expect(getMostCancelledCategory(subs)).toEqual({
      category: "utilities",
      count: 2,
    });
    expect(buildAnalyticsSummary(subs, "2026-03-11").mostCancelledCategory).toEqual({
      category: "utilities",
      count: 2,
    });
  });
});

describe("getRoiVerdict", () => {
  it("returns poor for low ratings (1-2)", () => {
    expect(getRoiVerdict(1)).toBe("poor");
    expect(getRoiVerdict(2)).toBe("poor");
  });

  it("returns fair for medium rating (3)", () => {
    expect(getRoiVerdict(3)).toBe("fair");
  });

  it("returns good for high ratings (4-5)", () => {
    expect(getRoiVerdict(4)).toBe("good");
    expect(getRoiVerdict(5)).toBe("good");
  });
});

describe("buildRoiData", () => {
  it("returns empty for no active subscriptions", () => {
    const subs = [buildSubscription({ isActive: false })];
    const result = buildRoiData(subs, {});
    expect(result.items).toHaveLength(0);
    expect(result.totalCount).toBe(0);
    expect(result.ratedCount).toBe(0);
  });

  it("lists active subscriptions with null verdict when unrated", () => {
    const subs = [
      buildSubscription({ id: "a", name: "Netflix", amountMinor: 1500, isActive: true }),
    ];
    const result = buildRoiData(subs, {});
    expect(result.items).toHaveLength(1);
    expect(result.items[0].rating).toBeNull();
    expect(result.items[0].verdict).toBeNull();
    expect(result.ratedCount).toBe(0);
    expect(result.totalCount).toBe(1);
  });

  it("computes verdict based on rating", () => {
    const subs = [
      buildSubscription({
        id: "a",
        billingCycle: "monthly",
        amountMinor: 2000,
        isActive: true,
      }),
      buildSubscription({
        id: "b",
        billingCycle: "monthly",
        amountMinor: 500,
        isActive: true,
      }),
    ];
    const ratings = { a: 1 as const, b: 5 as const };
    const result = buildRoiData(subs, ratings);

    expect(result.ratedCount).toBe(2);
    const itemA = result.items.find((i) => i.subscriptionId === "a")!;
    const itemB = result.items.find((i) => i.subscriptionId === "b")!;

    expect(itemA.verdict).toBe("poor"); // rating 1
    expect(itemB.verdict).toBe("good"); // rating 5
  });

  it("sums underused monthly spend from poor and fair verdicts", () => {
    const subs = [
      buildSubscription({ id: "a", billingCycle: "monthly", amountMinor: 3000, isActive: true }),
      buildSubscription({ id: "b", billingCycle: "monthly", amountMinor: 1000, isActive: true }),
      buildSubscription({ id: "c", billingCycle: "monthly", amountMinor: 500, isActive: true }),
    ];
    // a: poor (rating 1), b: poor (rating 2), c: good (rating 5)
    const ratings = { a: 1 as const, b: 2 as const, c: 5 as const };
    const result = buildRoiData(subs, ratings);

    expect(result.underusedMonthlyMinor).toBe(4000);
  });

  it("sorts poor verdicts first, then by monthly cost descending", () => {
    const subs = [
      buildSubscription({ id: "cheap-good", billingCycle: "monthly", amountMinor: 100, isActive: true }),
      buildSubscription({ id: "expensive-poor", billingCycle: "monthly", amountMinor: 5000, isActive: true }),
      buildSubscription({ id: "mid-fair", billingCycle: "monthly", amountMinor: 2000, isActive: true }),
    ];
    const ratings = {
      "cheap-good": 5 as const,
      "expensive-poor": 1 as const,
      "mid-fair": 3 as const,
    };
    const result = buildRoiData(subs, ratings);

    expect(result.items[0].subscriptionId).toBe("expensive-poor");
  });

  it("handles yearly billing cycle conversion", () => {
    const subs = [
      buildSubscription({
        id: "a",
        billingCycle: "yearly",
        amountMinor: 12000,
        isActive: true,
      }),
    ];
    const result = buildRoiData(subs, {});
    expect(result.items[0].monthlyMinor).toBe(1000);
  });
});
