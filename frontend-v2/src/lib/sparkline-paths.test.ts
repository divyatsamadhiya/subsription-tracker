import { describe, expect, it } from "vitest";
import { buildSparklinePaths } from "./sparkline-paths";

describe("buildSparklinePaths", () => {
  it("returns null for fewer than 2 data points", () => {
    expect(buildSparklinePaths([], 64, 24)).toBeNull();
    expect(buildSparklinePaths([5], 64, 24)).toBeNull();
  });

  it("returns linePath and areaPath for valid data", () => {
    const result = buildSparklinePaths([0, 10, 5], 64, 24);
    expect(result).not.toBeNull();
    expect(result!.linePath).toMatch(/^M/);
    expect(result!.areaPath).toContain(" Z");
  });

  it("handles flat data (all same value) without division by zero", () => {
    const result = buildSparklinePaths([5, 5, 5, 5], 64, 24);
    expect(result).not.toBeNull();
    expect(result!.linePath).toBeDefined();
  });

  it("area path closes back to the bottom-right and bottom-left", () => {
    const result = buildSparklinePaths([1, 2, 3], 100, 50);
    expect(result).not.toBeNull();
    // Area path should end with L<width>,<height> L0,<height> Z
    expect(result!.areaPath).toContain("L100,50 L0,50 Z");
  });

  it("first point starts at x=0 and last point ends at x=width", () => {
    const result = buildSparklinePaths([10, 20], 80, 30);
    expect(result).not.toBeNull();
    expect(result!.linePath).toMatch(/^M0,/);
    expect(result!.linePath).toContain("L80,");
  });

  it("respects custom padding", () => {
    const noPadding = buildSparklinePaths([0, 10], 64, 24, 0);
    const withPadding = buildSparklinePaths([0, 10], 64, 24, 4);
    expect(noPadding).not.toBeNull();
    expect(withPadding).not.toBeNull();
    // Different padding should produce different y-coordinates
    expect(noPadding!.linePath).not.toBe(withPadding!.linePath);
  });
});
