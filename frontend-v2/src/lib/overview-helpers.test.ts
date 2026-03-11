import { describe, it, expect } from "vitest";
import { buildSpendSparkline, buildCountSparkline, estimateTrend } from "./overview-helpers";
import type { Subscription } from "./types";

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub-1",
    name: "Test",
    amountMinor: 1000,
    currency: "USD",
    billingCycle: "monthly",
    nextBillingDate: "2026-04-01",
    category: "entertainment",
    reminderDaysBefore: [],
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("buildSpendSparkline", () => {
  it("returns 7 zeros for empty subscriptions", () => {
    expect(buildSpendSparkline([])).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("returns 7 zeros when all subs are inactive", () => {
    const subs = [makeSub({ isActive: false })];
    expect(buildSpendSparkline(subs)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("returns 7 points for a single active sub", () => {
    const subs = [makeSub({ amountMinor: 1000 })];
    const result = buildSpendSparkline(subs);
    expect(result).toHaveLength(7);
    // All points should equal the same value (only 1 sub)
    expect(new Set(result).size).toBe(1);
    expect(result[0]).toBe(1000);
  });

  it("produces an ascending sparkline as subs are added over time", () => {
    const subs = [
      makeSub({ id: "1", amountMinor: 500, createdAt: "2026-01-01T00:00:00Z" }),
      makeSub({ id: "2", amountMinor: 500, createdAt: "2026-02-01T00:00:00Z" }),
      makeSub({ id: "3", amountMinor: 500, createdAt: "2026-03-01T00:00:00Z" }),
    ];
    const result = buildSpendSparkline(subs);
    expect(result).toHaveLength(7);
    // Should be non-decreasing
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThanOrEqual(result[i - 1]);
    }
    // Last point should include all 3 subs
    expect(result[6]).toBe(1500);
  });

  it("handles different billing cycles", () => {
    const subs = [
      makeSub({ id: "1", amountMinor: 1200, billingCycle: "yearly" }),
    ];
    const result = buildSpendSparkline(subs);
    // yearly: 1200 / 12 = 100 monthly
    expect(result[0]).toBe(100);
  });

  it("handles weekly billing cycle", () => {
    const subs = [
      makeSub({ id: "1", amountMinor: 100, billingCycle: "weekly" }),
    ];
    const result = buildSpendSparkline(subs);
    // weekly: 100 * (52/12) ≈ 433
    expect(result[0]).toBe(Math.round(100 * (52 / 12)));
  });

  it("handles custom_days billing cycle", () => {
    const subs = [
      makeSub({
        id: "1",
        amountMinor: 600,
        billingCycle: "custom_days",
        customIntervalDays: 60,
      }),
    ];
    const result = buildSpendSparkline(subs);
    // custom_days: 600 * (30/60) = 300
    expect(result[0]).toBe(300);
  });
});

describe("buildCountSparkline", () => {
  it("returns 7 zeros for empty subscriptions", () => {
    expect(buildCountSparkline([])).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("returns 7 zeros when all subs are inactive", () => {
    const subs = [makeSub({ isActive: false })];
    expect(buildCountSparkline(subs)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("returns 7 points for active subs", () => {
    const subs = [
      makeSub({ id: "1", createdAt: "2026-01-01T00:00:00Z" }),
      makeSub({ id: "2", createdAt: "2026-02-01T00:00:00Z" }),
      makeSub({ id: "3", createdAt: "2026-03-01T00:00:00Z" }),
    ];
    const result = buildCountSparkline(subs);
    expect(result).toHaveLength(7);
    // Should be non-decreasing
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThanOrEqual(result[i - 1]);
    }
    // Last point should equal total active count
    expect(result[6]).toBe(3);
  });

  it("ignores inactive subs", () => {
    const subs = [
      makeSub({ id: "1", isActive: true }),
      makeSub({ id: "2", isActive: false }),
    ];
    const result = buildCountSparkline(subs);
    expect(result[6]).toBe(1);
  });
});

describe("estimateTrend", () => {
  it("returns null for empty subscriptions", () => {
    expect(estimateTrend([])).toBeNull();
  });

  it("returns null for a single subscription", () => {
    expect(estimateTrend([makeSub()])).toBeNull();
  });

  it("returns null when all subs are inactive", () => {
    const subs = [
      makeSub({ id: "1", isActive: false }),
      makeSub({ id: "2", isActive: false }),
    ];
    expect(estimateTrend(subs)).toBeNull();
  });

  it("returns 0 when older and newer halves have equal cost", () => {
    const subs = [
      makeSub({ id: "1", amountMinor: 1000, createdAt: "2026-01-01T00:00:00Z" }),
      makeSub({ id: "2", amountMinor: 1000, createdAt: "2026-03-01T00:00:00Z" }),
    ];
    expect(estimateTrend(subs)).toBe(0);
  });

  it("returns positive trend when newer subs cost more", () => {
    const subs = [
      makeSub({ id: "1", amountMinor: 500, createdAt: "2026-01-01T00:00:00Z" }),
      makeSub({ id: "2", amountMinor: 1500, createdAt: "2026-03-01T00:00:00Z" }),
    ];
    const trend = estimateTrend(subs);
    expect(trend).not.toBeNull();
    expect(trend!).toBeGreaterThan(0);
  });

  it("returns negative trend when newer subs cost less", () => {
    const subs = [
      makeSub({ id: "1", amountMinor: 2000, createdAt: "2026-01-01T00:00:00Z" }),
      makeSub({ id: "2", amountMinor: 500, createdAt: "2026-03-01T00:00:00Z" }),
    ];
    const trend = estimateTrend(subs);
    expect(trend).not.toBeNull();
    expect(trend!).toBeLessThan(0);
  });

  it("returns null when older half costs zero (all free)", () => {
    const subs = [
      makeSub({ id: "1", amountMinor: 0, createdAt: "2026-01-01T00:00:00Z" }),
      makeSub({ id: "2", amountMinor: 1000, createdAt: "2026-03-01T00:00:00Z" }),
    ];
    expect(estimateTrend(subs)).toBeNull();
  });

  it("handles mixed billing cycles", () => {
    const subs = [
      makeSub({
        id: "1",
        amountMinor: 1200,
        billingCycle: "yearly",
        createdAt: "2026-01-01T00:00:00Z",
      }),
      makeSub({
        id: "2",
        amountMinor: 1000,
        billingCycle: "monthly",
        createdAt: "2026-03-01T00:00:00Z",
      }),
    ];
    const trend = estimateTrend(subs);
    expect(trend).not.toBeNull();
    // yearly 1200 = 100/mo vs monthly 1000 → newer is 900% more
    expect(trend!).toBeGreaterThan(0);
  });
});
