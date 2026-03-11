import { describe, it, expect } from "vitest";
import { CATEGORY_OPTIONS, DEFAULT_SETTINGS } from "./types";

describe("CATEGORY_OPTIONS", () => {
  it("has 5 categories", () => {
    expect(CATEGORY_OPTIONS).toHaveLength(5);
  });

  it("includes all expected categories", () => {
    expect(CATEGORY_OPTIONS).toContain("entertainment");
    expect(CATEGORY_OPTIONS).toContain("productivity");
    expect(CATEGORY_OPTIONS).toContain("utilities");
    expect(CATEGORY_OPTIONS).toContain("health");
    expect(CATEGORY_OPTIONS).toContain("other");
  });

  it("has the expected order", () => {
    expect(CATEGORY_OPTIONS[0]).toBe("entertainment");
    expect(CATEGORY_OPTIONS[4]).toBe("other");
  });
});

describe("DEFAULT_SETTINGS", () => {
  it("has USD as default currency", () => {
    expect(DEFAULT_SETTINGS.defaultCurrency).toBe("USD");
  });

  it("starts week on Sunday (0)", () => {
    expect(DEFAULT_SETTINGS.weekStartsOn).toBe(0);
  });

  it("has notifications disabled", () => {
    expect(DEFAULT_SETTINGS.notificationsEnabled).toBe(false);
  });

  it("uses system theme preference", () => {
    expect(DEFAULT_SETTINGS.themePreference).toBe("system");
  });
});
