import { calculateMonthlyTotalMinor, daysUntil, getUpcomingRenewals } from "./date";
import type { BillingCycle, Subscription, SubscriptionCategory } from "../types";

export interface SpendTrendPoint {
  monthLabel: string;
  monthKey: string;
  amountMinor: number;
}

export interface CategorySpendPoint {
  category: SubscriptionCategory;
  amountMinor: number;
  share: number;
}

export interface RenewalBucketPoint {
  bucketLabel: "0-7 days" | "8-14 days" | "15-21 days" | "22-30 days";
  count: number;
}

export interface AnalyticsSummary {
  monthlyBaselineMinor: number;
  projectedSixMonthMinor: number;
  activeCount: number;
  renewalCount30Days: number;
}

interface SpendTrendOptions {
  fromIsoDate: string;
  monthsAhead?: number;
}

interface RenewalBucketOptions {
  fromIsoDate: string;
  daysAhead?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const toMonthKey = (isoDate: string): string => isoDate.slice(0, 7);

const toMonthLabel = (monthKey: string): string => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, 1)));
};

const addDays = (isoDate: string, days: number): string => {
  const [year, month, day] = isoDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day) + days * DAY_MS);
  const nextYear = next.getUTCFullYear();
  const nextMonth = String(next.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(next.getUTCDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
};

const daysInMonth = (year: number, monthIndex: number): number => {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
};

const addMonths = (isoDate: string, months: number): string => {
  const [year, month, day] = isoDate.split("-").map(Number);
  const monthIndex = month - 1 + months;
  const nextYear = year + Math.floor(monthIndex / 12);
  const normalizedMonthIndex = ((monthIndex % 12) + 12) % 12;
  const nextDay = Math.min(day, daysInMonth(nextYear, normalizedMonthIndex));
  const nextMonth = String(normalizedMonthIndex + 1).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${String(nextDay).padStart(2, "0")}`;
};

const nextChargeDate = (
  isoDate: string,
  billingCycle: BillingCycle,
  customIntervalDays?: number
): string => {
  switch (billingCycle) {
    case "weekly":
      return addDays(isoDate, 7);
    case "monthly":
      return addMonths(isoDate, 1);
    case "yearly":
      return addMonths(isoDate, 12);
    case "custom_days":
      return addDays(isoDate, customIntervalDays ?? 30);
    default:
      return isoDate;
  }
};

const monthlyEquivalent = (subscription: Subscription): number => {
  switch (subscription.billingCycle) {
    case "weekly":
      return subscription.amountMinor * (52 / 12);
    case "monthly":
      return subscription.amountMinor;
    case "yearly":
      return subscription.amountMinor / 12;
    case "custom_days":
      return subscription.amountMinor * (30 / (subscription.customIntervalDays ?? 30));
    default:
      return 0;
  }
};

export const buildSpendTrend = (
  subscriptions: Subscription[],
  options: SpendTrendOptions
): SpendTrendPoint[] => {
  const monthsAhead = Math.max(1, options.monthsAhead ?? 6);
  const startMonthKey = `${options.fromIsoDate.slice(0, 7)}-01`;
  const endExclusive = addMonths(startMonthKey, monthsAhead);
  const result: SpendTrendPoint[] = Array.from({ length: monthsAhead }, (_, index) => {
    const monthStartIso = addMonths(startMonthKey, index);
    const monthKey = toMonthKey(monthStartIso);
    return {
      monthLabel: toMonthLabel(monthKey),
      monthKey,
      amountMinor: 0
    };
  });
  const indexByMonthKey = new Map(result.map((point, index) => [point.monthKey, index]));
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.isActive);

  activeSubscriptions.forEach((subscription) => {
    let chargeDate = subscription.nextBillingDate;
    let guard = 0;

    while (chargeDate < options.fromIsoDate && guard < 400) {
      chargeDate = nextChargeDate(
        chargeDate,
        subscription.billingCycle,
        subscription.customIntervalDays
      );
      guard += 1;
    }

    while (chargeDate < endExclusive && guard < 1200) {
      const index = indexByMonthKey.get(toMonthKey(chargeDate));
      if (index !== undefined) {
        result[index].amountMinor += subscription.amountMinor;
      }

      chargeDate = nextChargeDate(
        chargeDate,
        subscription.billingCycle,
        subscription.customIntervalDays
      );
      guard += 1;
    }
  });

  return result;
};

export const buildCategorySpend = (subscriptions: Subscription[]): CategorySpendPoint[] => {
  const totals = new Map<SubscriptionCategory, number>();

  subscriptions
    .filter((subscription) => subscription.isActive)
    .forEach((subscription) => {
      const monthlyMinor = monthlyEquivalent(subscription);
      totals.set(subscription.category, (totals.get(subscription.category) ?? 0) + monthlyMinor);
    });

  const rawPoints = [...totals.entries()]
    .map(([category, amount]) => ({
      category,
      amountMinor: Math.round(amount)
    }))
    .filter((point) => point.amountMinor > 0);

  const totalMinor = rawPoints.reduce((sum, point) => sum + point.amountMinor, 0);
  if (totalMinor === 0) {
    return [];
  }

  return rawPoints
    .map((point) => ({
      ...point,
      share: point.amountMinor / totalMinor
    }))
    .sort((first, second) => second.amountMinor - first.amountMinor);
};

export const buildRenewalBuckets = (
  subscriptions: Subscription[],
  options: RenewalBucketOptions
): RenewalBucketPoint[] => {
  const daysAhead = options.daysAhead ?? 30;
  const buckets: RenewalBucketPoint[] = [
    { bucketLabel: "0-7 days", count: 0 },
    { bucketLabel: "8-14 days", count: 0 },
    { bucketLabel: "15-21 days", count: 0 },
    { bucketLabel: "22-30 days", count: 0 }
  ];

  subscriptions
    .filter((subscription) => subscription.isActive)
    .forEach((subscription) => {
      const delta = daysUntil(subscription.nextBillingDate, options.fromIsoDate);
      if (delta < 0 || delta > daysAhead) {
        return;
      }

      if (delta <= 7) {
        buckets[0].count += 1;
      } else if (delta <= 14) {
        buckets[1].count += 1;
      } else if (delta <= 21) {
        buckets[2].count += 1;
      } else {
        buckets[3].count += 1;
      }
    });

  return buckets;
};

export const buildAnalyticsSummary = (
  subscriptions: Subscription[],
  todayIsoDate: string
): AnalyticsSummary => {
  const activeCount = subscriptions.filter((subscription) => subscription.isActive).length;
  const monthlyBaselineMinor = calculateMonthlyTotalMinor(subscriptions);
  const projectedSixMonthMinor = buildSpendTrend(subscriptions, {
    fromIsoDate: todayIsoDate,
    monthsAhead: 6
  }).reduce((sum, point) => sum + point.amountMinor, 0);
  const renewalCount30Days = getUpcomingRenewals(subscriptions, todayIsoDate, 30).length;

  return {
    monthlyBaselineMinor,
    projectedSixMonthMinor,
    activeCount,
    renewalCount30Days
  };
};
