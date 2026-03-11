import { describe, expect, it } from "vitest";
import {
  getGreetingRenewalTip,
  getMostExpensiveSubscription,
  getMostExpensiveSubscriptionTip,
  getPotentialSavingsInsight,
  getSavingsFallbackAmountMinor,
} from "./dashboard-insights";
import { buildSubscription } from "@/test/factories";

describe("getGreetingRenewalTip", () => {
  it("returns the nearest renewal inside seven days", () => {
    const subscriptions = [
      buildSubscription({
        name: "Netflix",
        nextBillingDate: "2026-03-16",
      }),
      buildSubscription({
        name: "YouTube Premium",
        nextBillingDate: "2026-03-13",
      }),
    ];

    expect(getGreetingRenewalTip(subscriptions, "2026-03-11")).toBe(
      "YouTube Premium renews in 2 days"
    );
  });

  it("returns tomorrow wording when applicable", () => {
    const subscriptions = [
      buildSubscription({
        name: "Spotify",
        nextBillingDate: "2026-03-12",
      }),
    ];

    expect(getGreetingRenewalTip(subscriptions, "2026-03-11")).toBe(
      "Spotify renews tomorrow"
    );
  });

  it("returns null when nothing renews within seven days", () => {
    const subscriptions = [
      buildSubscription({
        nextBillingDate: "2026-03-25",
      }),
    ];

    expect(getGreetingRenewalTip(subscriptions, "2026-03-11")).toBeNull();
  });
});

describe("getPotentialSavingsInsight", () => {
  it("returns the strongest overlapping category and its removable plans", () => {
    const subscriptions = [
      buildSubscription({
        name: "Netflix",
        category: "entertainment",
        amountMinor: 1499,
      }),
      buildSubscription({
        name: "Prime Video",
        category: "entertainment",
        amountMinor: 299,
      }),
      buildSubscription({
        name: "Notion",
        category: "productivity",
        amountMinor: 999,
      }),
      buildSubscription({
        name: "Todoist",
        category: "productivity",
        amountMinor: 399,
      }),
    ];

    const insight = getPotentialSavingsInsight(subscriptions);

    expect(insight).not.toBeNull();
    expect(insight?.category).toBe("productivity");
    expect(insight?.amountMinor).toBe(399);
    expect(insight?.candidates.map((subscription) => subscription.name)).toEqual([
      "Todoist",
    ]);
  });

  it("uses monthly equivalents when evaluating overlaps", () => {
    const subscriptions = [
      buildSubscription({
        name: "Gym Annual",
        category: "health",
        billingCycle: "yearly",
        amountMinor: 12000,
      }),
      buildSubscription({
        name: "Yoga App",
        category: "health",
        billingCycle: "monthly",
        amountMinor: 500,
      }),
    ];

    const insight = getPotentialSavingsInsight(subscriptions);

    expect(insight?.amountMinor).toBe(500);
    expect(insight?.candidates[0]?.name).toBe("Yoga App");
  });

  it("returns null when there is no category overlap", () => {
    const subscriptions = [
      buildSubscription({ category: "entertainment" }),
      buildSubscription({ category: "productivity" }),
    ];

    expect(getPotentialSavingsInsight(subscriptions)).toBeNull();
  });
});

describe("getMostExpensiveSubscription", () => {
  it("returns the highest monthly-equivalent active subscription", () => {
    const subscriptions = [
      buildSubscription({
        name: "Annual Suite",
        billingCycle: "yearly",
        amountMinor: 12000,
      }),
      buildSubscription({
        name: "Adobe CC",
        billingCycle: "monthly",
        amountMinor: 5999,
      }),
    ];

    const insight = getMostExpensiveSubscription(subscriptions);

    expect(insight?.subscription.name).toBe("Adobe CC");
    expect(insight?.monthlyEquivalentMinor).toBe(5999);
  });

  it("returns null when there are no active subscriptions", () => {
    const subscriptions = [
      buildSubscription({
        isActive: false,
      }),
    ];

    expect(getMostExpensiveSubscription(subscriptions)).toBeNull();
  });
});

describe("getSavingsFallbackAmountMinor", () => {
  it("returns ten percent of monthly spend as a review target", () => {
    const subscriptions = [
      buildSubscription({ amountMinor: 1000 }),
      buildSubscription({ amountMinor: 2000 }),
    ];

    expect(getSavingsFallbackAmountMinor(subscriptions)).toBe(300);
  });
});

describe("getMostExpensiveSubscriptionTip", () => {
  it("pins urgent renewals only when the most expensive subscription is due soon", () => {
    const subscriptions = [
      buildSubscription({
        name: "YouTube Premium",
        nextBillingDate: "2026-03-12",
        amountMinor: 399,
      }),
      buildSubscription({
        name: "Claude Pro",
        category: "productivity",
        amountMinor: 215000,
        nextBillingDate: "2026-03-12",
      }),
    ];

    expect(
      getMostExpensiveSubscriptionTip(subscriptions, "2026-03-11", 10, "USD")
    ).toEqual({
      label: "Renewal alert",
      message:
        "Claude Pro renews tomorrow. It is your largest monthly cost, so confirm it before the charge hits.",
    });
  });

  it("rotates between relevant non-urgent tips about the same subscription over time", () => {
    const subscriptions = [
      buildSubscription({
        name: "Claude Pro",
        category: "productivity",
        amountMinor: 215000,
        nextBillingDate: "2026-03-28",
      }),
      buildSubscription({
        name: "Notion",
        category: "productivity",
        amountMinor: 1299,
        nextBillingDate: "2026-03-18",
      }),
      buildSubscription({
        name: "YouTube Premium",
        category: "entertainment",
        amountMinor: 399,
        nextBillingDate: "2026-03-13",
      }),
      buildSubscription({
        name: "Spotify",
        category: "entertainment",
        amountMinor: 499,
        nextBillingDate: "2026-03-20",
      }),
    ];

    const morningTip = getMostExpensiveSubscriptionTip(
      subscriptions,
      "2026-03-11",
      9,
      "USD"
    );
    const eveningTip = getMostExpensiveSubscriptionTip(
      subscriptions,
      "2026-03-11",
      18,
      "USD"
    );

    expect(morningTip.label).not.toBe(eveningTip.label);
    expect(morningTip.message).not.toBe(eveningTip.message);
    expect(morningTip.message).toContain("Claude Pro");
    expect(eveningTip.message).toContain("Claude Pro");
  });

  it("can exclude cost watch when that insight is snoozed or dismissed", () => {
    const subscriptions = [
      buildSubscription({
        name: "Claude Pro",
        category: "productivity",
        amountMinor: 215000,
        nextBillingDate: "2026-03-28",
      }),
      buildSubscription({
        name: "Notion",
        category: "productivity",
        amountMinor: 1299,
        nextBillingDate: "2026-03-18",
      }),
    ];

    const tip = getMostExpensiveSubscriptionTip(
      subscriptions,
      "2026-03-11",
      9,
      "USD",
      ["Cost watch"]
    );

    expect(tip.label).not.toBe("Cost watch");
    expect(tip.message).toContain("Claude Pro");
  });

  it("falls back to onboarding guidance when there are no active subscriptions", () => {
    const subscriptions = [
      buildSubscription({
        isActive: false,
      }),
    ];

    expect(
      getMostExpensiveSubscriptionTip(subscriptions, "2026-03-11", 9, "USD")
    ).toEqual({
      label: "Getting started",
      message:
        "Add the services you pay for most often first so the dashboard can surface useful savings and renewal tips.",
    });
  });
});
