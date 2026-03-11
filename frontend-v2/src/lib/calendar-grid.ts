import type { Subscription } from "./types";

export function buildCalendarGrid(daysInMonth: number, firstDow: number): (number | null)[] {
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

export function buildRenewalMap(
  renewals: Subscription[],
  year: number,
  month: number
): Map<number, Subscription[]> {
  const rMap = new Map<number, Subscription[]>();
  for (const sub of renewals) {
    const [subYear, subMonth, subDay] = sub.nextBillingDate.split("-").map(Number);
    if (subYear === year && subMonth === month) {
      const existing = rMap.get(subDay) ?? [];
      existing.push(sub);
      rMap.set(subDay, existing);
    }
  }
  return rMap;
}

export function formatMonthLabel(year: number, month: number): string {
  return new Date(year, month - 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
}
