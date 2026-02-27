import type { SubscriptionCategory } from "../../types";

export type SuggestionSeed = readonly [
  name: string,
  logoSlug: string,
  category: SubscriptionCategory
];
