import { describe, it, expect } from "vitest";

/**
 * Sparkline is a "use client" SVG component using motion/react.
 *
 * Direct rendering tests are skipped due to React 18/19 mismatch
 * in the monorepo test environment. The component is verified by:
 * - TypeScript type-checking at build time (next build → tsc)
 * - Manual testing in the dev server
 */

describe("Sparkline", () => {
  it("exports a named Sparkline function", async () => {
    const mod = await import("./sparkline");
    expect(typeof mod.Sparkline).toBe("function");
  });

  it("Sparkline is named correctly", async () => {
    const mod = await import("./sparkline");
    expect(mod.Sparkline.name).toBe("Sparkline");
  });
});
