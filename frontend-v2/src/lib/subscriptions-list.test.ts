import { describe, expect, it } from "vitest";
import {
  buildSubscriptionsCsv,
  filterSubscriptions,
  formatRenewalDistance,
  getEffectiveRenewalDate,
  getRenewalDistance,
  matchesSubscriptionSearch,
  monthlyEquivalentMinor,
  normalizePinnedSubscriptionOrder,
  reorderPinnedSubscriptions,
  sortSubscriptions,
  summarizeSubscriptionTotals,
  togglePinnedSubscription,
} from "./subscriptions-list";
import { buildSubscription } from "@/test/factories";

describe("monthlyEquivalentMinor", () => {
  it("normalizes yearly subscriptions to monthly", () => {
    expect(
      monthlyEquivalentMinor(
        buildSubscription({
          billingCycle: "yearly",
          amountMinor: 5828_00,
        })
      )
    ).toBe(48567);
  });

  it("returns the raw amount for monthly subscriptions", () => {
    expect(
      monthlyEquivalentMinor(
        buildSubscription({
          billingCycle: "monthly",
          amountMinor: 1299_00,
        })
      )
    ).toBe(129900);
  });
});

describe("formatRenewalDistance", () => {
  it("omits overdue states and formats upcoming renewals consistently", () => {
    expect(formatRenewalDistance(-2)).toBeNull();
    expect(formatRenewalDistance(0)).toBe("Renews today");
    expect(formatRenewalDistance(1)).toBe("Renews tomorrow");
    expect(formatRenewalDistance(9)).toBe("Renews in 9 days");
  });
});

describe("getRenewalDistance", () => {
  it("computes renewal distance text from a subscription", () => {
    const subscription = buildSubscription({
      nextBillingDate: "2026-03-13",
    });

    expect(getRenewalDistance(subscription, "2026-03-11")).toBe(
      "Renews in 2 days"
    );
  });

  it("returns null for past billing dates", () => {
    const subscription = buildSubscription({
      nextBillingDate: "2026-03-01",
    });

    expect(getRenewalDistance(subscription, "2026-03-11")).toBe(
      "Renews in 21 days"
    );
  });
});

describe("subscription filtering", () => {
  const subscriptions = [
    buildSubscription({
      id: "claude",
      name: "Claude Pro",
      category: "productivity",
      amountMinor: 2150_00,
      billingCycle: "monthly",
    }),
    buildSubscription({
      id: "youtube",
      name: "YouTube Premium",
      category: "entertainment",
      amountMinor: 299_00,
      billingCycle: "monthly",
    }),
    buildSubscription({
      id: "1password",
      name: "1Password",
      category: "productivity",
      amountMinor: 5828_00,
      billingCycle: "yearly",
    }),
  ];

  it("matches search queries against name, category, and amount", () => {
    expect(matchesSubscriptionSearch(subscriptions[0], "claude")).toBe(true);
    expect(matchesSubscriptionSearch(subscriptions[0], "productivity")).toBe(true);
    expect(matchesSubscriptionSearch(subscriptions[1], "299")).toBe(true);
    expect(matchesSubscriptionSearch(subscriptions[2], "485.67")).toBe(true);
    expect(matchesSubscriptionSearch(subscriptions[1], "health")).toBe(false);
  });

  it("filters subscriptions by search query and monthly amount threshold", () => {
    expect(
      filterSubscriptions(subscriptions, {
        searchQuery: "productivity",
        minMonthlyAmountMinor: 500_00,
      }).map((subscription) => subscription.name)
    ).toEqual(["Claude Pro"]);

    expect(
      filterSubscriptions(subscriptions, {
        minMonthlyAmountMinor: 300_00,
      }).map((subscription) => subscription.name)
    ).toEqual(["Claude Pro", "1Password"]);
  });
});

describe("getEffectiveRenewalDate", () => {
  it("advances recently deducted monthly subscriptions to the next cycle", () => {
    const subscription = buildSubscription({
      billingCycle: "monthly",
      nextBillingDate: "2026-03-01",
    });

    expect(getEffectiveRenewalDate(subscription, "2026-03-11")).toBe("2026-04-01");
  });
});

describe("sortSubscriptions", () => {
  const subs = [
    buildSubscription({
      id: "b",
      name: "YouTube Premium",
      nextBillingDate: "2026-03-13",
      amountMinor: 299_00,
      billingCycle: "monthly",
    }),
    buildSubscription({
      id: "a",
      name: "1Password",
      nextBillingDate: "2026-06-01",
      amountMinor: 5828_00,
      billingCycle: "yearly",
    }),
    buildSubscription({
      id: "c",
      name: "Claude Pro",
      nextBillingDate: "2026-03-28",
      amountMinor: 2150_00,
      billingCycle: "monthly",
    }),
  ];

  it("sorts by renewal date ascending", () => {
    expect(sortSubscriptions(subs, "renewal_asc", "2026-03-11").map((sub) => sub.name)).toEqual([
      "YouTube Premium",
      "Claude Pro",
      "1Password",
    ]);
  });

  it("sorts by normalized monthly amount descending", () => {
    expect(sortSubscriptions(subs, "amount_desc", "2026-03-11").map((sub) => sub.name)).toEqual([
      "Claude Pro",
      "1Password",
      "YouTube Premium",
    ]);
  });

  it("sorts alphabetically", () => {
    expect(sortSubscriptions(subs, "alpha_asc", "2026-03-11").map((sub) => sub.name)).toEqual([
      "1Password",
      "Claude Pro",
      "YouTube Premium",
    ]);
  });

  it("keeps pinned subscriptions at the top in manual order", () => {
    expect(
      sortSubscriptions(subs, "amount_desc", "2026-03-11", ["a", "b"]).map(
        (sub) => sub.name
      )
    ).toEqual([
      "1Password",
      "YouTube Premium",
      "Claude Pro",
    ]);
  });
});

describe("pinned subscription helpers", () => {
  const subscriptions = [
    buildSubscription({ id: "a" }),
    buildSubscription({ id: "b" }),
    buildSubscription({ id: "c" }),
  ];

  it("normalizes pinned order by dropping stale and duplicate ids", () => {
    expect(
      normalizePinnedSubscriptionOrder(subscriptions, ["b", "missing", "b", "a"])
    ).toEqual(["b", "a"]);
  });

  it("pins a subscription to the front and unpins on second toggle", () => {
    expect(togglePinnedSubscription(["b", "a"], "c")).toEqual(["c", "b", "a"]);
    expect(togglePinnedSubscription(["b", "a"], "b")).toEqual(["a"]);
  });

  it("reorders pinned subscriptions when dragged over another pinned item", () => {
    expect(reorderPinnedSubscriptions(["a", "b", "c"], "c", "a")).toEqual([
      "c",
      "a",
      "b",
    ]);
  });
});

describe("summarizeSubscriptionTotals", () => {
  it("separates active and paused totals using monthly equivalents", () => {
    const subscriptions = [
      buildSubscription({
        name: "Claude Pro",
        amountMinor: 2150_00,
        billingCycle: "monthly",
        isActive: true,
      }),
      buildSubscription({
        name: "1Password",
        amountMinor: 5828_00,
        billingCycle: "yearly",
        isActive: false,
      }),
    ];

    expect(summarizeSubscriptionTotals(subscriptions)).toEqual({
      activeMinor: 215000,
      pausedMinor: 48567,
    });
  });
});

describe("buildSubscriptionsCsv", () => {
  it("exports selected subscriptions with normalized monthly amounts", () => {
    const csv = buildSubscriptionsCsv(
      [
        buildSubscription({
          name: 'Claude "Max"',
          amountMinor: 2150_00,
          billingCycle: "monthly",
          nextBillingDate: "2026-03-28",
        }),
        buildSubscription({
          name: "1Password",
          amountMinor: 5828_00,
          billingCycle: "yearly",
          nextBillingDate: "2026-03-01",
        }),
      ],
      "2026-03-11"
    );

    expect(csv).toContain('"Name","Status","Category","Billing cycle","Amount","Monthly equivalent","Next renewal"');
    expect(csv).toContain('"Claude ""Max""","Active","entertainment","monthly","2150.00","2150.00","2026-03-28"');
    expect(csv).toContain('"1Password","Active","entertainment","yearly","5828.00","485.67","2027-03-01"');
  });
});
