import { calculateMonthlyTotalMinor, daysUntil, getUpcomingRenewals } from "./date";
import { categoryLabel, formatCurrencyMinor } from "./format";
import type { Subscription, SubscriptionCategory } from "./types";

export interface PotentialSavingsInsight {
  amountMinor: number;
  category: SubscriptionCategory;
  candidates: Subscription[];
}

export interface ExpensiveSubscriptionInsight {
  subscription: Subscription;
  monthlyEquivalentMinor: number;
}

export interface DashboardSpotlightTip {
  label: string;
  message: string;
}

function monthlyEquivalentMinor(subscription: Subscription): number {
  switch (subscription.billingCycle) {
    case "weekly":
      return Math.round(subscription.amountMinor * (52 / 12));
    case "monthly":
      return subscription.amountMinor;
    case "yearly":
      return Math.round(subscription.amountMinor / 12);
    case "custom_days": {
      const interval = subscription.customIntervalDays ?? 30;
      return Math.round(subscription.amountMinor * (30 / interval));
    }
    default:
      return 0;
  }
}

export function getGreetingRenewalTip(
  subscriptions: Subscription[],
  todayIsoDate: string
): string | null {
  const nextRenewal = getUpcomingRenewals(subscriptions, todayIsoDate, 7)[0];
  if (!nextRenewal) return null;

  const delta = daysUntil(nextRenewal.nextBillingDate, todayIsoDate);
  if (delta === 0) {
    return `${nextRenewal.name} renews today`;
  }
  if (delta === 1) {
    return `${nextRenewal.name} renews tomorrow`;
  }
  return `${nextRenewal.name} renews in ${delta} days`;
}

export function getPotentialSavingsInsight(
  subscriptions: Subscription[]
): PotentialSavingsInsight | null {
  const active = subscriptions.filter((subscription) => subscription.isActive);
  const grouped = new Map<SubscriptionCategory, Subscription[]>();

  for (const subscription of active) {
    const group = grouped.get(subscription.category) ?? [];
    group.push(subscription);
    grouped.set(subscription.category, group);
  }

  const overlapGroups = [...grouped.entries()]
    .map(([category, group]) => {
      if (group.length < 2) return null;

      const ranked = [...group].sort(
        (left, right) =>
          monthlyEquivalentMinor(left) - monthlyEquivalentMinor(right)
      );
      const candidates = ranked.slice(0, Math.max(1, ranked.length - 1));
      const amountMinor = candidates.reduce(
        (sum, subscription) => sum + monthlyEquivalentMinor(subscription),
        0
      );

      return { category, candidates, amountMinor };
    })
    .filter((group): group is PotentialSavingsInsight => group !== null)
    .sort((left, right) => right.amountMinor - left.amountMinor);

  return overlapGroups[0] ?? null;
}

export function getMostExpensiveSubscription(
  subscriptions: Subscription[]
): ExpensiveSubscriptionInsight | null {
  const active = subscriptions.filter((subscription) => subscription.isActive);
  if (active.length === 0) return null;

  const [subscription] = [...active].sort((left, right) => {
    const amountDelta =
      monthlyEquivalentMinor(right) - monthlyEquivalentMinor(left);
    if (amountDelta !== 0) return amountDelta;
    return right.amountMinor - left.amountMinor;
  });

  return {
    subscription,
    monthlyEquivalentMinor: monthlyEquivalentMinor(subscription),
  };
}

export function getSavingsFallbackAmountMinor(
  subscriptions: Subscription[]
): number {
  const total = calculateMonthlyTotalMinor(subscriptions);
  return Math.round(total * 0.1);
}

function pickRotatingTip(
  tips: DashboardSpotlightTip[],
  todayIsoDate: string,
  currentHour: number
): DashboardSpotlightTip {
  const slot = Math.floor(currentHour / 6);
  const seed = Number(todayIsoDate.replace(/-/g, ""));
  return tips[(seed + slot) % tips.length];
}

export function getMostExpensiveSubscriptionTip(
  subscriptions: Subscription[],
  todayIsoDate: string,
  currentHour: number,
  currency: string,
  excludedLabels: string[] = []
): DashboardSpotlightTip {
  const mostExpensiveInsight = getMostExpensiveSubscription(subscriptions);
  if (!mostExpensiveInsight) {
    return {
      label: "Getting started",
      message:
        "Add the services you pay for most often first so the dashboard can surface useful savings and renewal tips.",
    };
  }

  const { subscription, monthlyEquivalentMinor } = mostExpensiveInsight;
  const delta = daysUntil(subscription.nextBillingDate, todayIsoDate);
  if (delta >= 0 && delta <= 3) {
    const when =
      delta === 0
        ? "renews today"
        : delta === 1
          ? "renews tomorrow"
          : `renews in ${delta} days`;
    return {
      label: "Renewal alert",
      message: `${subscription.name} ${when}. It is your largest monthly cost, so confirm it before the charge hits.`,
    };
  }

  const monthlyTotalMinor = calculateMonthlyTotalMinor(subscriptions);
  const savingsInsight = getPotentialSavingsInsight(subscriptions);
  const tips: DashboardSpotlightTip[] = [];
  const share =
    monthlyTotalMinor > 0
      ? Math.round((monthlyEquivalentMinor / monthlyTotalMinor) * 100)
      : 0;

  tips.push({
    label: "Cost watch",
    message: `${subscription.name} drives ${share}% of your monthly spend. Reconfirm it still earns its spot.`,
  });
  tips.push({
    label: "Annual impact",
    message: `At its current pace, ${subscription.name} costs about ${formatCurrencyMinor(monthlyEquivalentMinor * 12, currency)}/year.`,
  });

  if (subscription.billingCycle === "monthly") {
    tips.push({
      label: "Flexibility",
      message: `${subscription.name} bills monthly, so it is the fastest large expense to trim if you need breathing room.`,
    });
  } else if (subscription.billingCycle === "yearly") {
    tips.push({
      label: "Commitment check",
      message: `${subscription.name} is on a yearly plan. Review usage before renewal so a big annual charge does not sneak through.`,
    });
  } else {
    tips.push({
      label: "Usage check",
      message: `${subscription.name} is your highest recurring cost. Review whether you used it enough this ${currentHour < 12 ? "morning" : currentHour < 17 ? "afternoon" : "evening"}.`,
    });
  }

  if (savingsInsight && savingsInsight.category === subscription.category) {
    const categoryPeers = subscriptions.filter(
      (item) =>
        item.isActive &&
        item.category === subscription.category &&
        item.id !== subscription.id
    );
    if (categoryPeers.length > 0) {
      tips.push({
        label: "Category overlap",
        message: `${subscription.name} sits in a category with ${categoryPeers.length} other active ${categoryLabel(subscription.category).toLowerCase()} subscription${categoryPeers.length === 1 ? "" : "s"}. Compare them before the next bill.`,
      });
    }
  }

  const filteredTips = tips.filter((tip) => !excludedLabels.includes(tip.label));
  return pickRotatingTip(filteredTips.length > 0 ? filteredTips : tips, todayIsoDate, currentHour);
}
