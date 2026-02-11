import type { Subscription } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

const toUtcMidnight = (isoDate: string): number => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
};

export const nowIsoDate = (): string => {
  const current = new Date();
  const year = current.getFullYear();
  const month = String(current.getMonth() + 1).padStart(2, "0");
  const day = String(current.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const isoDateFromTime = (timeMs: number): string => {
  const date = new Date(timeMs);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const addDaysToIsoDate = (isoDate: string, days: number): string => {
  return isoDateFromTime(toUtcMidnight(isoDate) + days * DAY_MS);
};

export const daysUntil = (targetIsoDate: string, fromIsoDate = nowIsoDate()): number => {
  return Math.floor((toUtcMidnight(targetIsoDate) - toUtcMidnight(fromIsoDate)) / DAY_MS);
};

export const isDateInWindow = (
  targetIsoDate: string,
  startIsoDate: string,
  windowDays: number
): boolean => {
  const delta = daysUntil(targetIsoDate, startIsoDate);
  return delta >= 0 && delta <= windowDays;
};

const averageMonthlyCost = (subscription: Subscription): number => {
  switch (subscription.billingCycle) {
    case "weekly":
      return subscription.amountMinor * (52 / 12);
    case "monthly":
      return subscription.amountMinor;
    case "yearly":
      return subscription.amountMinor / 12;
    case "custom_days": {
      const interval = subscription.customIntervalDays ?? 30;
      return subscription.amountMinor * (30 / interval);
    }
    default:
      return 0;
  }
};

const averageYearlyCost = (subscription: Subscription): number => {
  switch (subscription.billingCycle) {
    case "weekly":
      return subscription.amountMinor * 52;
    case "monthly":
      return subscription.amountMinor * 12;
    case "yearly":
      return subscription.amountMinor;
    case "custom_days": {
      const interval = subscription.customIntervalDays ?? 30;
      return subscription.amountMinor * (365 / interval);
    }
    default:
      return 0;
  }
};

export const calculateMonthlyTotalMinor = (subscriptions: Subscription[]): number => {
  return Math.round(
    subscriptions
      .filter((subscription) => subscription.isActive)
      .reduce((sum, subscription) => sum + averageMonthlyCost(subscription), 0)
  );
};

export const calculateYearlyTotalMinor = (subscriptions: Subscription[]): number => {
  return Math.round(
    subscriptions
      .filter((subscription) => subscription.isActive)
      .reduce((sum, subscription) => sum + averageYearlyCost(subscription), 0)
  );
};

export const getUpcomingRenewals = (
  subscriptions: Subscription[],
  startIsoDate: string,
  windowDays: number
): Subscription[] => {
  return subscriptions
    .filter((subscription) => subscription.isActive)
    .filter((subscription) => isDateInWindow(subscription.nextBillingDate, startIsoDate, windowDays))
    .sort((a, b) => a.nextBillingDate.localeCompare(b.nextBillingDate));
};
