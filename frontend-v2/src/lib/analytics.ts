import { calculateMonthlyTotalMinor, daysUntil, getUpcomingRenewals } from "./date";
import type { BillingCycle, Subscription, SubscriptionCategory } from "./types";

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
  bucketLabel: string;
  count: number;
}

export interface AnalyticsSummary {
  monthlyBaselineMinor: number;
  projectedSixMonthMinor: number;
  activeCount: number;
  renewalCount30Days: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const toMonthKey = (isoDate: string): string => isoDate.slice(0, 7);

const toMonthLabel = (monthKey: string): string => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
};

const addDays = (isoDate: string, days: number): string => {
  const [year, month, day] = isoDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day) + days * DAY_MS);
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
};

const daysInMonth = (year: number, monthIndex: number): number =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

const addMonths = (isoDate: string, months: number): string => {
  const [year, month, day] = isoDate.split("-").map(Number);
  const monthIndex = month - 1 + months;
  const nextYear = year + Math.floor(monthIndex / 12);
  const normalizedMonthIndex = ((monthIndex % 12) + 12) % 12;
  const nextDay = Math.min(day, daysInMonth(nextYear, normalizedMonthIndex));
  return `${nextYear}-${String(normalizedMonthIndex + 1).padStart(2, "0")}-${String(nextDay).padStart(2, "0")}`;
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

const monthlyEquivalent = (sub: Subscription): number => {
  switch (sub.billingCycle) {
    case "weekly":
      return sub.amountMinor * (52 / 12);
    case "monthly":
      return sub.amountMinor;
    case "yearly":
      return sub.amountMinor / 12;
    case "custom_days":
      return sub.amountMinor * (30 / (sub.customIntervalDays ?? 30));
    default:
      return 0;
  }
};

export const buildSpendTrend = (
  subscriptions: Subscription[],
  fromIsoDate: string,
  monthsAhead = 6
): SpendTrendPoint[] => {
  const count = Math.max(1, monthsAhead);
  const startMonthKey = `${fromIsoDate.slice(0, 7)}-01`;
  const endExclusive = addMonths(startMonthKey, count);

  const result: SpendTrendPoint[] = Array.from({ length: count }, (_, i) => {
    const monthStartIso = addMonths(startMonthKey, i);
    const monthKey = toMonthKey(monthStartIso);
    return { monthLabel: toMonthLabel(monthKey), monthKey, amountMinor: 0 };
  });

  const indexByKey = new Map(result.map((p, i) => [p.monthKey, i]));
  const active = subscriptions.filter((s) => s.isActive);

  for (const sub of active) {
    let date = sub.nextBillingDate;
    let guard = 0;
    while (date < fromIsoDate && guard < 400) {
      date = nextChargeDate(date, sub.billingCycle, sub.customIntervalDays);
      guard++;
    }
    while (date < endExclusive && guard < 1200) {
      const idx = indexByKey.get(toMonthKey(date));
      if (idx !== undefined) result[idx].amountMinor += sub.amountMinor;
      date = nextChargeDate(date, sub.billingCycle, sub.customIntervalDays);
      guard++;
    }
  }

  return result;
};

export const buildCategorySpend = (
  subscriptions: Subscription[]
): CategorySpendPoint[] => {
  const totals = new Map<SubscriptionCategory, number>();

  for (const sub of subscriptions.filter((s) => s.isActive)) {
    const monthly = monthlyEquivalent(sub);
    totals.set(sub.category, (totals.get(sub.category) ?? 0) + monthly);
  }

  const points = [...totals.entries()]
    .map(([category, amount]) => ({ category, amountMinor: Math.round(amount) }))
    .filter((p) => p.amountMinor > 0);

  const total = points.reduce((s, p) => s + p.amountMinor, 0);
  if (total === 0) return [];

  return points
    .map((p) => ({ ...p, share: p.amountMinor / total }))
    .sort((a, b) => b.amountMinor - a.amountMinor);
};

export const buildRenewalBuckets = (
  subscriptions: Subscription[],
  fromIsoDate: string
): RenewalBucketPoint[] => {
  const buckets: RenewalBucketPoint[] = [
    { bucketLabel: "0-7 days", count: 0 },
    { bucketLabel: "8-14 days", count: 0 },
    { bucketLabel: "15-21 days", count: 0 },
    { bucketLabel: "22-30 days", count: 0 },
  ];

  for (const sub of subscriptions.filter((s) => s.isActive)) {
    const delta = daysUntil(sub.nextBillingDate, fromIsoDate);
    if (delta < 0 || delta > 30) continue;
    if (delta <= 7) buckets[0].count++;
    else if (delta <= 14) buckets[1].count++;
    else if (delta <= 21) buckets[2].count++;
    else buckets[3].count++;
  }

  return buckets;
};

export const buildAnalyticsSummary = (
  subscriptions: Subscription[],
  todayIsoDate: string
): AnalyticsSummary => ({
  monthlyBaselineMinor: calculateMonthlyTotalMinor(subscriptions),
  projectedSixMonthMinor: buildSpendTrend(subscriptions, todayIsoDate, 6).reduce(
    (s, p) => s + p.amountMinor,
    0
  ),
  activeCount: subscriptions.filter((s) => s.isActive).length,
  renewalCount30Days: getUpcomingRenewals(subscriptions, todayIsoDate, 30).length,
});
