import { daysUntil } from "./date";
import { priceOnDate } from "./analytics";
import type { BillingCycle, Subscription } from "./types";

export type SubscriptionSortOption =
  | "renewal_asc"
  | "amount_desc"
  | "alpha_asc";

interface SubscriptionFilterOptions {
  searchQuery?: string;
  minMonthlyAmountMinor?: number;
}

const CSV_HEADERS = [
  "Name",
  "Status",
  "Category",
  "Billing cycle",
  "Amount",
  "Monthly equivalent",
  "Next renewal",
];

const DAY_MS = 24 * 60 * 60 * 1000;

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

function nextChargeDate(
  isoDate: string,
  billingCycle: BillingCycle,
  customIntervalDays?: number
): string {
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
}

export function monthlyEquivalentMinor(subscription: Subscription): number {
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

export function getEffectiveRenewalDate(
  subscription: Subscription,
  todayIsoDate: string
): string {
  let date = subscription.nextBillingDate;
  let guard = 0;

  while (daysUntil(date, todayIsoDate) < 0 && guard < 400) {
    date = nextChargeDate(
      date,
      subscription.billingCycle,
      subscription.customIntervalDays
    );
    guard++;
  }

  return date;
}

export function formatRenewalDistance(days: number): string | null {
  if (days < 0) return null;
  if (days === 0) return "Renews today";
  if (days === 1) return "Renews tomorrow";
  return `Renews in ${days} days`;
}

export function getRenewalDistance(
  subscription: Subscription,
  todayIsoDate: string
): string | null {
  const effectiveRenewalDate = getEffectiveRenewalDate(subscription, todayIsoDate);
  return formatRenewalDistance(daysUntil(effectiveRenewalDate, todayIsoDate));
}

export function matchesSubscriptionSearch(
  subscription: Subscription,
  searchQuery: string
): boolean {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (!normalizedQuery) return true;

  const numericQuery = normalizedQuery.replace(/[^0-9.]/g, "");
  const amountMinor = subscription.amountMinor / 100;
  const monthlyMinor = monthlyEquivalentMinor(subscription) / 100;
  const searchFields = [
    subscription.name.toLowerCase(),
    subscription.category.toLowerCase(),
    String(Math.round(amountMinor)),
    amountMinor.toFixed(2),
    String(Math.round(monthlyMinor)),
    monthlyMinor.toFixed(2),
  ];

  if (searchFields.some((field) => field.includes(normalizedQuery))) {
    return true;
  }

  return numericQuery.length > 0
    ? searchFields.some((field) => field.includes(numericQuery))
    : false;
}

export function filterSubscriptions(
  subscriptions: Subscription[],
  options: SubscriptionFilterOptions = {}
): Subscription[] {
  const { searchQuery = "", minMonthlyAmountMinor = 0 } = options;

  return subscriptions.filter((subscription) => {
    if (!matchesSubscriptionSearch(subscription, searchQuery)) {
      return false;
    }

    return monthlyEquivalentMinor(subscription) >= minMonthlyAmountMinor;
  });
}

export function normalizePinnedSubscriptionOrder(
  subscriptions: Subscription[],
  pinnedIds: string[]
): string[] {
  const validIds = new Set(subscriptions.map((subscription) => subscription.id));
  const seen = new Set<string>();

  return pinnedIds.filter((id) => {
    if (!validIds.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function togglePinnedSubscription(
  pinnedIds: string[],
  subscriptionId: string
): string[] {
  if (pinnedIds.includes(subscriptionId)) {
    return pinnedIds.filter((id) => id !== subscriptionId);
  }

  return [subscriptionId, ...pinnedIds];
}

export function reorderPinnedSubscriptions(
  pinnedIds: string[],
  draggedId: string,
  targetId: string
): string[] {
  if (draggedId === targetId) return pinnedIds;

  const next = pinnedIds.filter((id) => id !== draggedId);
  const targetIndex = next.indexOf(targetId);

  if (targetIndex === -1) return pinnedIds;

  next.splice(targetIndex, 0, draggedId);
  return next;
}

function compareSubscriptions(
  left: Subscription,
  right: Subscription,
  sortOption: SubscriptionSortOption,
  todayIsoDate: string
): number {
  switch (sortOption) {
    case "amount_desc":
      return (
        monthlyEquivalentMinor(right) - monthlyEquivalentMinor(left) ||
        right.amountMinor - left.amountMinor ||
        left.name.localeCompare(right.name)
      );
    case "alpha_asc":
      return (
        left.name.localeCompare(right.name) ||
        left.nextBillingDate.localeCompare(right.nextBillingDate)
      );
    case "renewal_asc":
    default:
      return (
        getEffectiveRenewalDate(left, todayIsoDate).localeCompare(
          getEffectiveRenewalDate(right, todayIsoDate)
        ) ||
        left.nextBillingDate.localeCompare(right.nextBillingDate) ||
        left.name.localeCompare(right.name)
      );
  }
}

export function sortSubscriptions(
  subscriptions: Subscription[],
  sortOption: SubscriptionSortOption,
  todayIsoDate: string,
  pinnedIds: string[] = []
): Subscription[] {
  const sorted = [...subscriptions];
  const pinnedOrder = normalizePinnedSubscriptionOrder(subscriptions, pinnedIds);
  const pinnedPositions = new Map(
    pinnedOrder.map((subscriptionId, index) => [subscriptionId, index])
  );

  return sorted.sort((left, right) => {
    const leftPinned = pinnedPositions.get(left.id);
    const rightPinned = pinnedPositions.get(right.id);

    if (leftPinned !== undefined || rightPinned !== undefined) {
      if (leftPinned === undefined) return 1;
      if (rightPinned === undefined) return -1;
      return leftPinned - rightPinned;
    }

    return compareSubscriptions(left, right, sortOption, todayIsoDate);
  });
}

export function summarizeSubscriptionTotals(subscriptions: Subscription[]) {
  return subscriptions.reduce(
    (summary, subscription) => {
      const monthlyEquivalent = monthlyEquivalentMinor(subscription);
      if (subscription.isActive) {
        summary.activeMinor += monthlyEquivalent;
      } else {
        summary.pausedMinor += monthlyEquivalent;
      }
      return summary;
    },
    { activeMinor: 0, pausedMinor: 0 }
  );
}

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function buildSubscriptionsCsv(
  subscriptions: Subscription[],
  todayIsoDate: string
): string {
  const rows = subscriptions.map((subscription) => {
    const effectiveRenewalDate = getEffectiveRenewalDate(subscription, todayIsoDate);

    return [
      subscription.name,
      subscription.isActive ? "Active" : "Paused",
      subscription.category,
      subscription.billingCycle,
      (subscription.amountMinor / 100).toFixed(2),
      (monthlyEquivalentMinor(subscription) / 100).toFixed(2),
      effectiveRenewalDate,
    ]
      .map((value) => escapeCsv(String(value)))
      .join(",");
  });

  return [CSV_HEADERS.map(escapeCsv).join(","), ...rows].join("\n");
}

/**
 * Walk billing cycles from createdAt to today, summing the charge at each
 * renewal using the price that was active on that date.
 */
export function totalSpentSinceAddedMinor(
  subscription: Subscription,
  todayIsoDate: string
): number {
  let total = subscription.priorSpendingMinor ?? 0;
  let date = subscription.createdAt.slice(0, 10); // ISO date portion
  let guard = 0;

  // First charge happens on createdAt
  while (date <= todayIsoDate && guard < 2000) {
    const price = priceOnDate(subscription, date);
    total += price.amountMinor;
    date = nextChargeDate(date, price.billingCycle, price.customIntervalDays);
    guard++;
  }

  return total;
}

/**
 * Project cost for a given number of months based on the current monthly
 * equivalent rate.
 */
export function projectedCostMinor(
  subscription: Subscription,
  months: number
): number {
  return Math.round(monthlyEquivalentMinor(subscription) * months);
}
