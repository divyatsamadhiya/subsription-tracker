import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { enforceTrustedOrigin } from "./originGuard.js";

vi.mock("../logger/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

const makeResponse = () => {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return {
    status,
    json
  } as unknown as Response;
};

const makeRequest = (
  overrides?: Partial<
    Request & {
      headers: Record<string, string>;
      cookies: Record<string, string>;
    }
  >
): Request => {
  const headers = overrides?.headers ?? {};
  const req = {
    method: overrides?.method ?? "POST",
    originalUrl: overrides?.originalUrl ?? "/api/v1/subscriptions",
    cookies: overrides?.cookies ?? {},
    get: (name: string) => headers[name.toLowerCase()]
  } as unknown as Request;

  return req;
};

describe("enforceTrustedOrigin middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows safe methods", () => {
    const req = makeRequest({ method: "GET" });
    const res = makeResponse();
    const next = vi.fn();

    enforceTrustedOrigin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("allows unsafe methods without auth cookie", () => {
    const req = makeRequest({ method: "POST", cookies: {} });
    const res = makeResponse();
    const next = vi.fn();

    enforceTrustedOrigin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("allows authenticated request from trusted origin", () => {
    const req = makeRequest({
      method: "POST",
      cookies: { pulseboard_token: "token" },
      headers: { origin: "http://localhost:5173" }
    });
    const res = makeResponse();
    const next = vi.fn();

    enforceTrustedOrigin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("rejects authenticated request from untrusted origin", () => {
    const req = makeRequest({
      method: "POST",
      cookies: { pulseboard_token: "token" },
      headers: { origin: "https://evil.example.com" }
    });
    const res = makeResponse();
    const next = vi.fn();

    enforceTrustedOrigin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect((res.status as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(403);
    expect((res.json as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({
      error: "Invalid request origin"
    });
  });
});
