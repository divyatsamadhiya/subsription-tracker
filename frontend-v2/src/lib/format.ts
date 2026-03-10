import type { SubscriptionCategory } from "./types";

export const formatCurrencyMinor = (
  amountMinor: number,
  currency: string
): string => {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);
};

export const categoryLabel = (category: SubscriptionCategory): string => {
  return category
    .replace("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export const billingCycleLabel = (value: string): string => {
  if (value === "custom_days") return "Custom (days)";
  return value
    .replace("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export const formatIsoDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
};

export const formatRelativeDue = (days: number): string => {
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
};

export const formatShortDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
};
