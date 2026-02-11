import type { SubscriptionCategory } from "../types";

export const formatCurrencyMinor = (amountMinor: number, currency: string): string => {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(amountMinor / 100);
};

export const categoryLabel = (category: SubscriptionCategory): string => {
  return category.replace("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
};

export const billingCycleLabel = (value: string): string => {
  if (value === "custom_days") {
    return "Custom (days)";
  }
  return value.replace("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
};

export const formatRelativeDue = (days: number): string => {
  if (days === 0) {
    return "Due today";
  }
  if (days === 1) {
    return "Due tomorrow";
  }
  return `Due in ${days} days`;
};
