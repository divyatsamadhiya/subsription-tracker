import { describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";
import { config } from "./config.js";

vi.mock("./logger/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

describe("app security configuration", () => {
  it("disables x-powered-by header", () => {
    const app = createApp();
    expect(app.get("x-powered-by")).toBe(false);
  });

  it("enables trusted-origin checks in middleware stack", () => {
    const app = createApp();
    const stack = (app as { _router?: { stack?: Array<{ name?: string }> } })._router?.stack ?? [];

    expect(stack.some((layer) => layer.name === "enforceTrustedOrigin")).toBe(true);
  });

  it("rejects wildcard frontend origins with cookie auth", () => {
    expect(config.frontendOrigins).not.toContain("*");
  });

  it("registers profile routes in middleware stack", () => {
    const app = createApp();
    const stack = (app as { _router?: { stack?: Array<{ regexp?: { toString(): string } }> } })._router
      ?.stack ?? [];
    const hasProfileRoute = stack.some((layer) =>
      layer.regexp?.toString().includes("\\/api\\/v1\\/profile")
    );

    expect(hasProfileRoute).toBe(true);
  });
});
