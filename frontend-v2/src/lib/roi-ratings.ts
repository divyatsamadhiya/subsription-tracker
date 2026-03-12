const STORAGE_KEY = "pulseboard:roi-ratings";

export type UsageRating = 1 | 2 | 3 | 4 | 5;

export const USAGE_LABELS: Record<UsageRating, string> = {
  1: "Never",
  2: "Rarely",
  3: "Sometimes",
  4: "Often",
  5: "Daily",
};

export type RoiVerdict = "poor" | "fair" | "good";

function readAll(): Record<string, UsageRating> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, UsageRating>) : {};
  } catch {
    return {};
  }
}

function writeAll(ratings: Record<string, UsageRating>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ratings));
}

export function getRoiRatings(): Record<string, UsageRating> {
  return readAll();
}

export function setRoiRating(subscriptionId: string, rating: UsageRating): void {
  const ratings = readAll();
  ratings[subscriptionId] = rating;
  writeAll(ratings);
}

export function clearRoiRating(subscriptionId: string): void {
  const ratings = readAll();
  delete ratings[subscriptionId];
  writeAll(ratings);
}

export function getRoiVerdict(rating: UsageRating): RoiVerdict {
  if (rating <= 2) return "poor";
  if (rating === 3) return "fair";
  return "good";
}
