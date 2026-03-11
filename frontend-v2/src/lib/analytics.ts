import { calculateMonthlyTotalMinor, daysUntil, getUpcomingRenewals } from "./date";
import type { BillingCycle, Subscription, SubscriptionCategory } from "./types";

export interface SpendTrendPoint {
  monthLabel: string;
  monthKey: string;
  amountMinor: number;
}

export interface SpendComparisonPoint extends SpendTrendPoint {
  previousAmountMinor: number;
  previousMonthLabel: string;
  cumulativeAmountMinor: number;
  contributors: Array<{
    subscriptionId: string;
    name: string;
    amountMinor: number;
  }>;
}

export type AnalyticsRange = "3m" | "6m" | "1y" | "all";

export interface CategorySpendPoint {
  category: SubscriptionCategory;
  amountMinor: number;
  share: number;
  momChangePercent: number | null;
  sourceCategories: SubscriptionCategory[];
}

export interface RenewalBucketPoint {
  bucketKey: "0-7" | "8-14" | "15-21" | "22-30";
  bucketLabel: string;
  startDay: number;
  endDay: number;
  count: number;
  amountMinor: number;
  subscriptions: Array<{
    subscriptionId: string;
    name: string;
    amountMinor: number;
    nextBillingDate: string;
  }>;
}

export interface AnalyticsSummary {
  monthlyBaselineMinor: number;
  projectedSixMonthMinor: number;
  activeCount: number;
  renewalCount30Days: number;
  averageMonthlySpendMinor: number;
  highestSpendMonth: SpendTrendPoint | null;
  mostCancelledCategory: {
    category: SubscriptionCategory;
    count: number;
  } | null;
  currentTwelveMonthMinor: number;
  previousTwelveMonthMinor: number;
  yoyGrowthPercent: number | null;
}

export type CategoryChangeTone = "positive" | "negative" | "neutral";

const DAY_MS = 24 * 60 * 60 * 1000;

const toMonthKey = (isoDate: string): string => isoDate.slice(0, 7);
const toIsoDate = (isoDateTime: string): string => isoDateTime.slice(0, 10);

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

const pushContributor = (
  contributors: SpendComparisonPoint["contributors"],
  subscription: Subscription
) => {
  const existing = contributors.find(
    (entry) => entry.subscriptionId === subscription.id
  );

  if (existing) {
    existing.amountMinor += subscription.amountMinor;
    return;
  }

  contributors.push({
    subscriptionId: subscription.id,
    name: subscription.name,
    amountMinor: subscription.amountMinor,
  });
};

const previousChargeDate = (
  isoDate: string,
  billingCycle: BillingCycle,
  customIntervalDays?: number
): string => {
  switch (billingCycle) {
    case "weekly":
      return addDays(isoDate, -7);
    case "monthly":
      return addMonths(isoDate, -1);
    case "yearly":
      return addMonths(isoDate, -12);
    case "custom_days":
      return addDays(isoDate, -(customIntervalDays ?? 30));
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

const isActiveDuringMonth = (
  subscription: Subscription,
  monthStartIso: string
): boolean => {
  const createdIso = toIsoDate(subscription.createdAt);
  const updatedIso = toIsoDate(subscription.updatedAt);

  if (createdIso > monthStartIso) return false;
  if (subscription.isActive) return true;
  return updatedIso >= monthStartIso;
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

    while (date > startMonthKey && guard < 400) {
      const previous = previousChargeDate(
        date,
        sub.billingCycle,
        sub.customIntervalDays
      );
      if (previous === date) break;
      date = previous;
      guard++;
    }

    while (date < startMonthKey && guard < 800) {
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

export const buildSpendComparisonTrend = (
  subscriptions: Subscription[],
  fromIsoDate: string,
  monthsAhead = 12
): SpendComparisonPoint[] => {
  const count = Math.max(1, monthsAhead);
  const currentStartIso = `${fromIsoDate.slice(0, 7)}-01`;
  const previousStartIso = addMonths(currentStartIso, -count);
  const current = buildSpendTrend(subscriptions, currentStartIso, count);
  const previous = buildSpendTrend(subscriptions, previousStartIso, count);
  const pointByMonth = new Map(
    current.map((point) => [
      point.monthKey,
      {
        ...point,
        previousAmountMinor: 0,
        previousMonthLabel: "",
        cumulativeAmountMinor: 0,
        contributors: [],
      } satisfies SpendComparisonPoint,
    ])
  );
  const endExclusiveIso = addMonths(currentStartIso, count);
  let cumulativeAmountMinor = 0;

  for (const sub of subscriptions.filter((subscription) => subscription.isActive)) {
    let date = sub.nextBillingDate;
    let guard = 0;

    while (date > currentStartIso && guard < 400) {
      const previousDate = previousChargeDate(
        date,
        sub.billingCycle,
        sub.customIntervalDays
      );
      if (previousDate === date) break;
      date = previousDate;
      guard++;
    }

    while (date < currentStartIso && guard < 800) {
      date = nextChargeDate(date, sub.billingCycle, sub.customIntervalDays);
      guard++;
    }

    while (date < endExclusiveIso && guard < 1200) {
      const point = pointByMonth.get(toMonthKey(date));
      if (point) {
        pushContributor(point.contributors, sub);
      }
      date = nextChargeDate(date, sub.billingCycle, sub.customIntervalDays);
      guard++;
    }
  }

  return current.map((point, index) => {
    cumulativeAmountMinor += point.amountMinor;
    const withContributors = pointByMonth.get(point.monthKey)!;

    return {
      ...withContributors,
      previousAmountMinor: previous[index]?.amountMinor ?? 0,
      previousMonthLabel: previous[index]?.monthLabel ?? "",
      cumulativeAmountMinor,
    };
  });
};

export const getAnalyticsRangeMonths = (
  subscriptions: Subscription[],
  todayIsoDate: string,
  range: AnalyticsRange
): number => {
  if (range === "3m") return 3;
  if (range === "6m") return 6;
  if (range === "1y") return 12;

  const earliest = subscriptions.reduce<string | null>((current, subscription) => {
    const created = subscription.createdAt.slice(0, 10);
    if (!current || created < current) return created;
    return current;
  }, null);

  if (!earliest) return 12;

  const [startYear, startMonth] = earliest.slice(0, 7).split("-").map(Number);
  const [endYear, endMonth] = todayIsoDate.slice(0, 7).split("-").map(Number);
  return Math.max(1, (endYear - startYear) * 12 + (endMonth - startMonth) + 1);
};

export const buildCategorySpend = (
  subscriptions: Subscription[],
  todayIsoDate: string
): CategorySpendPoint[] => {
  const currentMonthStartIso = `${todayIsoDate.slice(0, 7)}-01`;
  const previousMonthStartIso = addMonths(currentMonthStartIso, -1);
  const currentTotals = new Map<SubscriptionCategory, number>();
  const previousTotals = new Map<SubscriptionCategory, number>();

  for (const sub of subscriptions) {
    const monthly = monthlyEquivalent(sub);
    if (isActiveDuringMonth(sub, currentMonthStartIso)) {
      currentTotals.set(sub.category, (currentTotals.get(sub.category) ?? 0) + monthly);
    }
    if (isActiveDuringMonth(sub, previousMonthStartIso)) {
      previousTotals.set(sub.category, (previousTotals.get(sub.category) ?? 0) + monthly);
    }
  }

  let points = [...currentTotals.entries()]
    .map(([category, amount]) => {
      const amountMinor = Math.round(amount);
      const previousMinor = Math.round(previousTotals.get(category) ?? 0);
      const momChangePercent =
        previousMinor > 0
          ? ((amountMinor - previousMinor) / previousMinor) * 100
          : amountMinor > 0
            ? 100
            : null;

      return {
        category,
        amountMinor,
        share: 0,
        momChangePercent,
        sourceCategories: [category],
      } satisfies CategorySpendPoint;
    })
    .filter((p) => p.amountMinor > 0);

  const total = points.reduce((s, p) => s + p.amountMinor, 0);
  if (total === 0) return [];

  points = points
    .map((point) => ({ ...point, share: point.amountMinor / total }))
    .sort((a, b) => b.amountMinor - a.amountMinor);

  const prominent = points.filter((point) => point.share >= 0.08).slice(0, 3);
  const rolled = points.filter((point) => !prominent.some((entry) => entry.category === point.category));

  if (rolled.length === 0) {
    return points;
  }

  const otherAmountMinor = rolled.reduce((sum, point) => sum + point.amountMinor, 0);
  const previousOtherMinor = mergedCategoriesTotal(rolled, previousTotals);
  const explicitOther = prominent.find((point) => point.category === "other");

  const mergedOther: CategorySpendPoint = {
    category: "other",
    amountMinor: otherAmountMinor + (explicitOther?.amountMinor ?? 0),
    share: (otherAmountMinor + (explicitOther?.amountMinor ?? 0)) / total,
    momChangePercent:
      previousOtherMinor > 0
        ? (((otherAmountMinor + (explicitOther?.amountMinor ?? 0)) - previousOtherMinor) /
            previousOtherMinor) *
          100
        : otherAmountMinor > 0
          ? 100
          : null,
    sourceCategories: Array.from(
      new Set(rolled.flatMap((point) => point.sourceCategories).concat(explicitOther?.sourceCategories ?? []))
    ),
  };

  return [...prominent.filter((point) => point.category !== "other"), mergedOther].sort(
    (a, b) => b.amountMinor - a.amountMinor
  );
};

function mergedCategoriesTotal(
  points: CategorySpendPoint[],
  totals: Map<SubscriptionCategory, number>
): number {
  return points.reduce((sum, point) => {
    return (
      sum +
      point.sourceCategories.reduce(
        (nestedSum, category) => nestedSum + Math.round(totals.get(category) ?? 0),
        0
      )
    );
  }, 0);
}

export const buildRenewalBuckets = (
  subscriptions: Subscription[],
  fromIsoDate: string
): RenewalBucketPoint[] => {
  const buckets: RenewalBucketPoint[] = [
    {
      bucketKey: "0-7",
      bucketLabel: "0-7 days",
      startDay: 0,
      endDay: 7,
      count: 0,
      amountMinor: 0,
      subscriptions: [],
    },
    {
      bucketKey: "8-14",
      bucketLabel: "8-14 days",
      startDay: 8,
      endDay: 14,
      count: 0,
      amountMinor: 0,
      subscriptions: [],
    },
    {
      bucketKey: "15-21",
      bucketLabel: "15-21 days",
      startDay: 15,
      endDay: 21,
      count: 0,
      amountMinor: 0,
      subscriptions: [],
    },
    {
      bucketKey: "22-30",
      bucketLabel: "22-30 days",
      startDay: 22,
      endDay: 30,
      count: 0,
      amountMinor: 0,
      subscriptions: [],
    },
  ];

  for (const sub of subscriptions.filter((s) => s.isActive)) {
    const delta = daysUntil(sub.nextBillingDate, fromIsoDate);
    if (delta < 0 || delta > 30) continue;
    const bucket =
      delta <= 7 ? buckets[0] : delta <= 14 ? buckets[1] : delta <= 21 ? buckets[2] : buckets[3];
    bucket.count++;
    bucket.amountMinor += sub.amountMinor;
    bucket.subscriptions.push({
      subscriptionId: sub.id,
      name: sub.name,
      amountMinor: sub.amountMinor,
      nextBillingDate: sub.nextBillingDate,
    });
  }

  for (const bucket of buckets) {
    bucket.subscriptions.sort(
      (left, right) =>
        left.nextBillingDate.localeCompare(right.nextBillingDate) ||
        right.amountMinor - left.amountMinor ||
        left.name.localeCompare(right.name)
    );
  }

  return buckets;
};

export const getSubscriptionsForCategoryPoint = (
  subscriptions: Subscription[],
  categoryPoint: CategorySpendPoint | null
): Subscription[] => {
  if (!categoryPoint) return [];

  return subscriptions
    .filter(
      (subscription) =>
        subscription.isActive &&
        categoryPoint.sourceCategories.includes(subscription.category)
    )
    .sort(
      (left, right) =>
        right.amountMinor - left.amountMinor || left.name.localeCompare(right.name)
    );
};

export const getCategoryChangeMeta = (
  value: number | null
): { label: string; tone: CategoryChangeTone } => {
  if (value === null) {
    return { label: "New", tone: "neutral" };
  }

  const roundedValue = Math.round(value);

  if (roundedValue === 0) {
    return { label: "Flat", tone: "neutral" };
  }

  return {
    label: `${roundedValue > 0 ? "+" : ""}${roundedValue}% MoM`,
    tone: roundedValue > 0 ? "positive" : "negative",
  };
};

export const getMostCancelledCategory = (
  subscriptions: Subscription[]
): AnalyticsSummary["mostCancelledCategory"] => {
  const counts = new Map<SubscriptionCategory, number>();

  for (const sub of subscriptions.filter((subscription) => !subscription.isActive)) {
    counts.set(sub.category, (counts.get(sub.category) ?? 0) + 1);
  }

  const [category, count] =
    [...counts.entries()].sort((left, right) => right[1] - left[1])[0] ?? [];

  if (!category || !count) return null;

  return { category, count };
};

export const buildAnalyticsSummary = (
  subscriptions: Subscription[],
  todayIsoDate: string
): AnalyticsSummary => {
  const sixMonthTrend = buildSpendTrend(subscriptions, todayIsoDate, 6);
  const twelveMonthTrend = buildSpendComparisonTrend(subscriptions, todayIsoDate, 12);
  const currentTwelveMonthMinor = twelveMonthTrend.reduce(
    (sum, point) => sum + point.amountMinor,
    0
  );
  const previousTwelveMonthMinor = twelveMonthTrend.reduce(
    (sum, point) => sum + point.previousAmountMinor,
    0
  );
  const highestSpendMonth =
    currentTwelveMonthMinor > 0
      ? [...twelveMonthTrend].sort((left, right) => right.amountMinor - left.amountMinor)[0] ??
        null
      : null;
  const yoyGrowthPercent =
    previousTwelveMonthMinor > 0
      ? ((currentTwelveMonthMinor - previousTwelveMonthMinor) /
          previousTwelveMonthMinor) *
        100
      : currentTwelveMonthMinor > 0
        ? 100
        : null;

  return {
    monthlyBaselineMinor: calculateMonthlyTotalMinor(subscriptions),
    projectedSixMonthMinor: sixMonthTrend.reduce((sum, point) => sum + point.amountMinor, 0),
    activeCount: subscriptions.filter((s) => s.isActive).length,
    renewalCount30Days: getUpcomingRenewals(subscriptions, todayIsoDate, 30).length,
    averageMonthlySpendMinor: Math.round(currentTwelveMonthMinor / 12),
    highestSpendMonth,
    mostCancelledCategory: getMostCancelledCategory(subscriptions),
    currentTwelveMonthMinor,
    previousTwelveMonthMinor,
    yoyGrowthPercent,
  };
};
