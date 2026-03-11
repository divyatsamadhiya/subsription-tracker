import { describe, expect, it } from "vitest";
import { buildCalendarGrid, buildRenewalMap } from "./calendar-grid";
import type { Subscription } from "./types";

describe("buildCalendarGrid", () => {
  it("prepends null entries for the first day-of-week offset", () => {
    // 31 days, starts on Wednesday (dow=3)
    const grid = buildCalendarGrid(31, 3);
    expect(grid.slice(0, 3)).toEqual([null, null, null]);
    expect(grid[3]).toBe(1);
    expect(grid[grid.length - 1]).toBe(31);
    expect(grid.length).toBe(31 + 3);
  });

  it("has no leading nulls when month starts on Sunday", () => {
    const grid = buildCalendarGrid(28, 0);
    expect(grid[0]).toBe(1);
    expect(grid.length).toBe(28);
  });

  it("handles months with 28, 30, and 31 days", () => {
    expect(buildCalendarGrid(28, 0).filter((d) => d !== null).length).toBe(28);
    expect(buildCalendarGrid(30, 0).filter((d) => d !== null).length).toBe(30);
    expect(buildCalendarGrid(31, 0).filter((d) => d !== null).length).toBe(31);
  });
});

describe("buildRenewalMap", () => {
  const makeSub = (id: string, nextBillingDate: string): Subscription => ({
    id,
    name: `Sub ${id}`,
    amountMinor: 1000,
    currency: "USD",
    billingCycle: "monthly",
    nextBillingDate,
    category: "other",
    reminderDaysBefore: [],
    isActive: true,
    createdAt: "2025-01-01",
    updatedAt: "2025-01-01",
  });

  it("groups subscriptions by day for the matching month", () => {
    const subs = [
      makeSub("1", "2025-03-05"),
      makeSub("2", "2025-03-05"),
      makeSub("3", "2025-03-15"),
    ];
    const map = buildRenewalMap(subs, 2025, 3);
    expect(map.get(5)?.length).toBe(2);
    expect(map.get(15)?.length).toBe(1);
    expect(map.get(20)).toBeUndefined();
  });

  it("ignores subscriptions from other months or years", () => {
    const subs = [
      makeSub("1", "2025-04-05"),
      makeSub("2", "2024-03-05"),
    ];
    const map = buildRenewalMap(subs, 2025, 3);
    expect(map.size).toBe(0);
  });

  it("returns empty map for empty input", () => {
    const map = buildRenewalMap([], 2025, 3);
    expect(map.size).toBe(0);
  });
});
