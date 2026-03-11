const subscriptionRowControlsBaseClass =
  "flex items-center gap-2 overflow-hidden transition-all duration-150";

export function getSubscriptionRowControlsClass(alwaysVisible: boolean): string {
  if (alwaysVisible) {
    return `${subscriptionRowControlsBaseClass} w-[76px] opacity-100 pointer-events-auto`;
  }

  return `${subscriptionRowControlsBaseClass} w-0 opacity-0 pointer-events-none group-hover:w-[76px] group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:w-[76px] group-focus-within:opacity-100 group-focus-within:pointer-events-auto`;
}

export function getBulkSelectionSummary(selectedCount: number): string | null {
  if (selectedCount <= 0) return null;
  return `${selectedCount} selected`;
}

export function getAmountFilterSummary(
  minMonthlyAmountMinor: number,
  symbol: string
): string {
  if (minMonthlyAmountMinor <= 0) {
    return "All amounts";
  }

  return `Above ${symbol}${Math.round(minMonthlyAmountMinor / 100)}/mo`;
}

export function getBulkSelectAllLabel(
  selectedVisibleCount: number,
  visibleCount: number
): string | null {
  if (
    selectedVisibleCount <= 0 ||
    visibleCount <= 0 ||
    selectedVisibleCount >= visibleCount
  ) {
    return null;
  }

  return `Select all (${visibleCount})`;
}
