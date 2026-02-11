import { describe, expect, it } from "vitest";
import {
  calculateMonthlyTotalMinor,
  calculateYearlyTotalMinor,
  daysUntil,
  getUpcomingRenewals
} from "./date";
import type { Subscription } from "../types";

const baseSubscription: Subscription = {
  id: "sub_1",
  name: "Pro Plan",
  amountMinor: 1000,
  currency: "USD",
  billingCycle: "monthly",
  nextBillingDate: "2026-02-15",
  category: "productivity",
  reminderDaysBefore: [1, 3, 7],
  isActive: true,
  createdAt: "2026-02-01T10:00:00.000Z",
  updatedAt: "2026-02-01T10:00:00.000Z"
};

describe("date helpers", () => {
  it("computes day delta", () => {
    expect(daysUntil("2026-02-10", "2026-02-08")).toBe(2);
    expect(daysUntil("2026-02-08", "2026-02-08")).toBe(0);
  });

  it("computes monthly and yearly totals across cycles", () => {
    const subs: Subscription[] = [
      baseSubscription,
      {
        ...baseSubscription,
        id: "sub_2",
        billingCycle: "yearly",
        amountMinor: 24000,
        nextBillingDate: "2026-11-01"
      },
      {
        ...baseSubscription,
        id: "sub_3",
        billingCycle: "weekly",
        amountMinor: 500,
        nextBillingDate: "2026-02-09"
      }
    ];

    expect(calculateMonthlyTotalMinor(subs)).toBe(5167);
    expect(calculateYearlyTotalMinor(subs)).toBe(62000);
  });

  it("filters renewals by active status and date range", () => {
    const subs: Subscription[] = [
      baseSubscription,
      {
        ...baseSubscription,
        id: "sub_2",
        name: "Inactive",
        isActive: false,
        nextBillingDate: "2026-02-10"
      },
      {
        ...baseSubscription,
        id: "sub_3",
        name: "Late",
        nextBillingDate: "2026-03-18"
      }
    ];

    const upcoming = getUpcomingRenewals(subs, "2026-02-08", 10);
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].id).toBe("sub_1");
  });
});
