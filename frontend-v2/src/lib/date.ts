import type { Subscription } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

const toUtcMidnight = (isoDate: string): number => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
};

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

const averageMonthlyCost = (sub: Subscription): number => {
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

export const getUpcomingRenewals = (
  subscriptions: Subscription[],
  startIsoDate: string,
  windowDays: number
): Subscription[] => {
  return subscriptions
    .filter((s) => s.isActive)
    .filter((s) => {
      const delta = daysUntil(s.nextBillingDate, startIsoDate);
      return delta >= 0 && delta <= windowDays;
    })
    .sort((a, b) => a.nextBillingDate.localeCompare(b.nextBillingDate));
};
