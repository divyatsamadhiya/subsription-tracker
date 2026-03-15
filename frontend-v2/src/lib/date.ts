import type { BillingCycle, Subscription } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Parse an ISO date string (YYYY-MM-DD) to UTC midnight.
 * Using Date.UTC avoids local-timezone shifts.
 */
const toUtcMidnight = (isoDate: string): number => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
};

/**
 * Return today's date as ISO string using the user's local timezone.
 * This ensures "today" matches what the user sees on their clock/calendar,
 * so renewal labels ("Due today") are correct regardless of timezone.
 */
export const nowIsoDate = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const daysUntil = (
  targetIsoDate: string,
  fromIsoDate = nowIsoDate()
): number => {
  return Math.floor(
    (toUtcMidnight(targetIsoDate) - toUtcMidnight(fromIsoDate)) / DAY_MS
  );
};

export const averageMonthlyCost = (sub: Subscription): number => {
  switch (sub.billingCycle) {
    case "weekly":
      return sub.amountMinor * (52 / 12);
    case "monthly":
      return sub.amountMinor;
    case "yearly":
      return sub.amountMinor / 12;
    case "custom_days": {
      const interval = sub.customIntervalDays ?? 30;
      return sub.amountMinor * (30 / interval);
    }
    default:
      return 0;
  }
};

export const calculateMonthlyTotalMinor = (
  subscriptions: Subscription[]
): number => {
  return Math.round(
    subscriptions
      .filter((s) => s.isActive)
      .reduce((sum, s) => sum + averageMonthlyCost(s), 0)
  );
};

export const calculateYearlyTotalMinor = (
  subscriptions: Subscription[]
): number => {
  return Math.round(
    subscriptions
      .filter((s) => s.isActive)
      .reduce((sum, s) => sum + averageMonthlyCost(s) * 12, 0)
  );
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

const advanceBillingDate = (
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

/**
 * Advance a past nextBillingDate forward by the subscription's billing cycle
 * until it reaches a date >= fromIsoDate. Returns the original date if already
 * in the future.
 */
export const nextRenewalDate = (
  sub: Subscription,
  fromIsoDate: string
): string => {
  let date = sub.nextBillingDate;
  let guard = 0;
  while (date < fromIsoDate && guard < 400) {
    date = advanceBillingDate(date, sub.billingCycle, sub.customIntervalDays);
    guard++;
  }
  return date;
};

export const getUpcomingRenewals = (
  subscriptions: Subscription[],
  startIsoDate: string,
  windowDays: number
): Subscription[] => {
  return subscriptions
    .filter((s) => s.isActive)
    .map((s) => {
      const effectiveDate = nextRenewalDate(s, startIsoDate);
      return { sub: s, effectiveDate };
    })
    .filter(({ effectiveDate }) => {
      const delta = daysUntil(effectiveDate, startIsoDate);
      return delta >= 0 && delta <= windowDays;
    })
    .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))
    .map(({ sub, effectiveDate }) =>
      effectiveDate !== sub.nextBillingDate
        ? { ...sub, nextBillingDate: effectiveDate }
        : sub
    );
};
