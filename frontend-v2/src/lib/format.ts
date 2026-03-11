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

/**
 * Extract just the currency symbol (e.g. "$", "€", "£", "₹") for a
 * given currency code. Used in chart axes and donut center labels.
 */
export const currencySymbol = (currency: string): string => {
  return (
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? currency
  );
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

/**
 * Format an ISO date string (YYYY-MM-DD) as a long locale date.
 * Constructs the Date using UTC to prevent timezone-shift issues.
 */
export const formatIsoDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
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
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
};
