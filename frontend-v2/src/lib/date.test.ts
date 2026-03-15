import { describe, it, expect } from "vitest";
import {
  nowIsoDate,
  daysUntil,
  calculateMonthlyTotalMinor,
  calculateYearlyTotalMinor,
  getUpcomingRenewals,
  nextRenewalDate,
} from "./date";
import { buildSubscription } from "@/test/factories";

describe("nowIsoDate", () => {
  it("returns a YYYY-MM-DD string", () => {
    const result = nowIsoDate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("matches the user's local date", () => {
    const result = nowIsoDate();
    const d = new Date();
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(result).toBe(expected);
  });
});

describe("daysUntil", () => {
  it("returns 0 for same date", () => {
    expect(daysUntil("2026-03-15", "2026-03-15")).toBe(0);
  });

  it("returns positive for future date", () => {
    expect(daysUntil("2026-03-20", "2026-03-15")).toBe(5);
  });

  it("returns negative for past date", () => {
    expect(daysUntil("2026-03-10", "2026-03-15")).toBe(-5);
  });

  it("handles month boundaries", () => {
    expect(daysUntil("2026-04-01", "2026-03-31")).toBe(1);
  });

  it("handles year boundaries", () => {
    expect(daysUntil("2027-01-01", "2026-12-31")).toBe(1);
  });

  it("handles leap year", () => {
    // 2028 is a leap year
    expect(daysUntil("2028-03-01", "2028-02-28")).toBe(2);
  });

  it("handles non-leap year", () => {
    // 2027 is not a leap year
    expect(daysUntil("2027-03-01", "2027-02-28")).toBe(1);
  });

  it("handles large gaps", () => {
    expect(daysUntil("2027-03-11", "2026-03-11")).toBe(365);
  });
});

describe("calculateMonthlyTotalMinor", () => {
  it("returns 0 for empty subscriptions", () => {
    expect(calculateMonthlyTotalMinor([])).toBe(0);
  });

  it("returns 0 when all subscriptions are inactive", () => {
    const subs = [
      buildSubscription({ isActive: false, amountMinor: 1000 }),
    ];
    expect(calculateMonthlyTotalMinor(subs)).toBe(0);
  });

  it("returns amount for monthly subscription", () => {
    const subs = [
      buildSubscription({ billingCycle: "monthly", amountMinor: 1000 }),
    ];
    expect(calculateMonthlyTotalMinor(subs)).toBe(1000);
  });

  it("converts weekly to monthly (× 52/12)", () => {
    const subs = [
      buildSubscription({ billingCycle: "weekly", amountMinor: 1200 }),
    ];
    const expected = Math.round(1200 * (52 / 12));
    expect(calculateMonthlyTotalMinor(subs)).toBe(expected);
  });

  it("converts yearly to monthly (÷ 12)", () => {
    const subs = [
      buildSubscription({ billingCycle: "yearly", amountMinor: 12000 }),
    ];
    expect(calculateMonthlyTotalMinor(subs)).toBe(1000);
  });

  it("converts custom_days to monthly", () => {
    const subs = [
      buildSubscription({
        billingCycle: "custom_days",
        customIntervalDays: 15,
        amountMinor: 500,
      }),
    ];
    const expected = Math.round(500 * (30 / 15));
    expect(calculateMonthlyTotalMinor(subs)).toBe(expected);
  });

  it("defaults custom_days interval to 30", () => {
    const subs = [
      buildSubscription({
        billingCycle: "custom_days",
        amountMinor: 900,
      }),
    ];
    // 30/30 = 1, so same as amount
    expect(calculateMonthlyTotalMinor(subs)).toBe(900);
  });

  it("sums multiple active subscriptions", () => {
    const subs = [
      buildSubscription({ billingCycle: "monthly", amountMinor: 1000 }),
      buildSubscription({ billingCycle: "monthly", amountMinor: 500 }),
      buildSubscription({ billingCycle: "monthly", amountMinor: 200, isActive: false }),
    ];
    expect(calculateMonthlyTotalMinor(subs)).toBe(1500);
  });
});

describe("calculateYearlyTotalMinor", () => {
  it("returns 0 for empty subscriptions", () => {
    expect(calculateYearlyTotalMinor([])).toBe(0);
  });

  it("multiplies monthly equivalent by 12", () => {
    const subs = [
      buildSubscription({ billingCycle: "monthly", amountMinor: 1000 }),
    ];
    expect(calculateYearlyTotalMinor(subs)).toBe(12000);
  });

  it("returns yearly amount directly", () => {
    const subs = [
      buildSubscription({ billingCycle: "yearly", amountMinor: 6000 }),
    ];
    expect(calculateYearlyTotalMinor(subs)).toBe(6000);
  });

  it("filters out inactive subscriptions", () => {
    const subs = [
      buildSubscription({ billingCycle: "monthly", amountMinor: 1000, isActive: true }),
      buildSubscription({ billingCycle: "monthly", amountMinor: 2000, isActive: false }),
    ];
    expect(calculateYearlyTotalMinor(subs)).toBe(12000);
  });
});

describe("nextRenewalDate", () => {
  it("returns nextBillingDate if already in the future", () => {
    const sub = buildSubscription({ nextBillingDate: "2026-04-01", billingCycle: "monthly" });
    expect(nextRenewalDate(sub, "2026-03-11")).toBe("2026-04-01");
  });

  it("advances monthly past-due date forward", () => {
    const sub = buildSubscription({ nextBillingDate: "2026-02-15", billingCycle: "monthly" });
    expect(nextRenewalDate(sub, "2026-03-11")).toBe("2026-03-15");
  });

  it("advances weekly past-due date forward", () => {
    const sub = buildSubscription({ nextBillingDate: "2026-03-01", billingCycle: "weekly" });
    // 2026-03-01 + 7 = 03-08, + 7 = 03-15 (>= 03-11)
    expect(nextRenewalDate(sub, "2026-03-11")).toBe("2026-03-15");
  });

  it("advances yearly past-due date forward", () => {
    const sub = buildSubscription({ nextBillingDate: "2025-06-15", billingCycle: "yearly" });
    expect(nextRenewalDate(sub, "2026-03-11")).toBe("2026-06-15");
  });

  it("advances custom_days past-due date forward", () => {
    const sub = buildSubscription({ nextBillingDate: "2026-03-01", billingCycle: "custom_days", customIntervalDays: 14 });
    // 2026-03-01 + 14 = 2026-03-15 (>= 03-11)
    expect(nextRenewalDate(sub, "2026-03-11")).toBe("2026-03-15");
  });

  it("returns same date if nextBillingDate equals fromIsoDate", () => {
    const sub = buildSubscription({ nextBillingDate: "2026-03-11", billingCycle: "monthly" });
    expect(nextRenewalDate(sub, "2026-03-11")).toBe("2026-03-11");
  });
});

describe("getUpcomingRenewals", () => {
  it("returns empty for no subscriptions", () => {
    expect(getUpcomingRenewals([], "2026-03-11", 30)).toEqual([]);
  });

  it("includes subscriptions within window", () => {
    const subs = [
      buildSubscription({ nextBillingDate: "2026-03-15", isActive: true }),
    ];
    const result = getUpcomingRenewals(subs, "2026-03-11", 30);
    expect(result).toHaveLength(1);
  });

  it("excludes subscriptions outside window", () => {
    const subs = [
      buildSubscription({ nextBillingDate: "2026-05-01", isActive: true }),
    ];
    const result = getUpcomingRenewals(subs, "2026-03-11", 30);
    expect(result).toHaveLength(0);
  });

  it("excludes inactive subscriptions", () => {
    const subs = [
      buildSubscription({ nextBillingDate: "2026-03-15", isActive: false }),
    ];
    const result = getUpcomingRenewals(subs, "2026-03-11", 30);
    expect(result).toHaveLength(0);
  });

  it("includes subscriptions due today (delta = 0)", () => {
    const subs = [
      buildSubscription({ nextBillingDate: "2026-03-11", isActive: true }),
    ];
    const result = getUpcomingRenewals(subs, "2026-03-11", 30);
    expect(result).toHaveLength(1);
  });

  it("includes subscriptions at exact window boundary", () => {
    const subs = [
      buildSubscription({ nextBillingDate: "2026-04-10", isActive: true }),
    ];
    const result = getUpcomingRenewals(subs, "2026-03-11", 30);
    expect(result).toHaveLength(1);
  });

  it("advances past-due monthly subscriptions into window", () => {
    const subs = [
      buildSubscription({ nextBillingDate: "2026-03-01", billingCycle: "monthly", isActive: true }),
    ];
    // nextBillingDate 2026-03-01 is before 2026-03-11, so it advances to 2026-04-01 (within 30 days)
    const result = getUpcomingRenewals(subs, "2026-03-11", 30);
    expect(result).toHaveLength(1);
    expect(result[0].nextBillingDate).toBe("2026-04-01");
  });

  it("excludes past-due subscriptions whose advanced date exceeds window", () => {
    const subs = [
      buildSubscription({ nextBillingDate: "2025-06-01", billingCycle: "yearly", isActive: true }),
    ];
    // nextBillingDate 2025-06-01 yearly → advances to 2026-06-01 which is 82 days from 2026-03-11
    const result = getUpcomingRenewals(subs, "2026-03-11", 30);
    expect(result).toHaveLength(0);
  });

  it("sorts by nextBillingDate ascending", () => {
    const subs = [
      buildSubscription({ name: "Later", nextBillingDate: "2026-03-20", isActive: true }),
      buildSubscription({ name: "Sooner", nextBillingDate: "2026-03-12", isActive: true }),
    ];
    const result = getUpcomingRenewals(subs, "2026-03-11", 30);
    expect(result[0].name).toBe("Sooner");
    expect(result[1].name).toBe("Later");
  });

  it("handles zero window", () => {
    const subs = [
      buildSubscription({ nextBillingDate: "2026-03-11", isActive: true }),
      buildSubscription({ nextBillingDate: "2026-03-12", isActive: true }),
    ];
    const result = getUpcomingRenewals(subs, "2026-03-11", 0);
    expect(result).toHaveLength(1);
    expect(result[0].nextBillingDate).toBe("2026-03-11");
  });
});
