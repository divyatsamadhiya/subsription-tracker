import { describe, it, expect } from "vitest";
import { SUBSCRIPTION_SUGGESTIONS } from "./suggestions";
import { CATEGORY_OPTIONS } from "./types";

describe("SUBSCRIPTION_SUGGESTIONS", () => {
  it("is a non-empty array", () => {
    expect(SUBSCRIPTION_SUGGESTIONS.length).toBeGreaterThan(0);
  });

  it("contains at least 50 suggestions", () => {
    expect(SUBSCRIPTION_SUGGESTIONS.length).toBeGreaterThanOrEqual(50);
  });

  it("each entry has name and category", () => {
    for (const s of SUBSCRIPTION_SUGGESTIONS) {
      expect(s.name).toBeTruthy();
      expect(s.category).toBeTruthy();
    }
  });

  it("all categories are valid", () => {
    const validCategories = new Set(CATEGORY_OPTIONS);
    for (const s of SUBSCRIPTION_SUGGESTIONS) {
      expect(validCategories.has(s.category)).toBe(true);
    }
  });

  it("is sorted alphabetically by name", () => {
    for (let i = 1; i < SUBSCRIPTION_SUGGESTIONS.length; i++) {
      const cmp = SUBSCRIPTION_SUGGESTIONS[i - 1].name.localeCompare(
        SUBSCRIPTION_SUGGESTIONS[i].name
      );
      expect(cmp).toBeLessThanOrEqual(0);
    }
  });

  it("covers all categories", () => {
    const categories = new Set(SUBSCRIPTION_SUGGESTIONS.map((s) => s.category));
    for (const cat of CATEGORY_OPTIONS) {
      expect(categories.has(cat)).toBe(true);
    }
  });

  it("has no duplicate names", () => {
    const names = SUBSCRIPTION_SUGGESTIONS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("contains known services", () => {
    const names = new Set(SUBSCRIPTION_SUGGESTIONS.map((s) => s.name));
    expect(names.has("Netflix")).toBe(true);
    expect(names.has("Spotify")).toBe(true);
    expect(names.has("GitHub")).toBe(true);
  });
});
