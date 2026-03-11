import { describe, it, expect } from "vitest";
import { getBrandColor } from "./brand-colors";

describe("getBrandColor", () => {
  it("returns brand color for known services (case-insensitive)", () => {
    expect(getBrandColor("Netflix")).toBe("#E50914");
    expect(getBrandColor("netflix")).toBe("#E50914");
    expect(getBrandColor("NETFLIX")).toBe("#E50914");
  });

  it("returns correct colors for popular services", () => {
    expect(getBrandColor("Spotify")).toBe("#1DB954");
    expect(getBrandColor("YouTube Premium")).toBe("#FF0000");
    expect(getBrandColor("Figma")).toBe("#A259FF");
    expect(getBrandColor("Slack")).toBe("#4A154B");
    expect(getBrandColor("GitHub")).toBe("#333333");
    expect(getBrandColor("Discord Nitro")).toBe("#5865F2");
  });

  it("returns undefined for unknown services", () => {
    expect(getBrandColor("My Custom Sub")).toBeUndefined();
    expect(getBrandColor("Random Service")).toBeUndefined();
    expect(getBrandColor("")).toBeUndefined();
  });

  it("covers all categories of services", () => {
    // Entertainment
    expect(getBrandColor("Disney+")).toBeDefined();
    // Productivity
    expect(getBrandColor("Notion")).toBeDefined();
    // Utilities
    expect(getBrandColor("NordVPN")).toBeDefined();
    // Health
    expect(getBrandColor("Headspace")).toBeDefined();
    // Other
    expect(getBrandColor("Amazon Prime")).toBeDefined();
  });
});
