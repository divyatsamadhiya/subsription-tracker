import type { SubscriptionCategory } from "../types";
import { ENTERTAINMENT_SUGGESTION_SEEDS } from "./subscription-suggestions/entertainment";
import { HEALTH_SUGGESTION_SEEDS } from "./subscription-suggestions/health";
import { OTHER_SUGGESTION_SEEDS } from "./subscription-suggestions/other";
import { PRODUCTIVITY_SUGGESTION_SEEDS } from "./subscription-suggestions/productivity";
import type { SuggestionSeed } from "./subscription-suggestions/types";
import { UTILITIES_SUGGESTION_SEEDS } from "./subscription-suggestions/utilities";

export interface SubscriptionSuggestion {
  name: string;
  logoUrl: string;
  category: SubscriptionCategory;
}

const icon = (slug: string): string => `https://cdn.simpleicons.org/${slug}`;

const SUGGESTION_SEEDS: SuggestionSeed[] = [
  ...ENTERTAINMENT_SUGGESTION_SEEDS,
  ...PRODUCTIVITY_SUGGESTION_SEEDS,
  ...UTILITIES_SUGGESTION_SEEDS,
  ...HEALTH_SUGGESTION_SEEDS,
  ...OTHER_SUGGESTION_SEEDS
];

const dedupeAndNormalize = (seeds: SuggestionSeed[]): SubscriptionSuggestion[] => {
  const seen = new Set<string>();

  return seeds
    .filter(([name]) => {
      const key = name.trim().toLowerCase();
      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .map(([name, slug, category]) => ({
      name,
      logoUrl: icon(slug),
      category
    }))
    .sort((first, second) => first.name.localeCompare(second.name));
};

export const SUBSCRIPTION_SUGGESTIONS = dedupeAndNormalize(SUGGESTION_SEEDS);
