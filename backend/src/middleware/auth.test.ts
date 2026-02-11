import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/auth.js", () => ({
  authCookieName: "pulseboard_token",
  verifyUserToken: vi.fn()
}));

vi.mock("../logger/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

import type { Request, Response } from "express";
import { getAuthUserId, optionalAuth, requireAuth } from "./auth.js";
import { verifyUserToken } from "../utils/auth.js";

const makeResponse = () => {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return {
    status,
    json
  } as unknown as Response;
};

describe("requireAuth middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when token is missing", () => {
    const req = { cookies: {}, originalUrl: "/api/v1/test" } as unknown as Request;
    const res = makeResponse();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect((res.status as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(401);
  });

  it("returns 401 when token is invalid", () => {
    vi.mocked(verifyUserToken).mockImplementation(() => {
      throw new Error("invalid");
    });

    const req = {
      cookies: { pulseboard_token: "bad_token" },
      originalUrl: "/api/v1/test"
    } as unknown as Request;
    const res = makeResponse();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect((res.status as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(401);
  });

  it("attaches userId and continues on valid token", () => {
    vi.mocked(verifyUserToken).mockReturnValue("user_1");

    const req = {
      cookies: { pulseboard_token: "good_token" },
      originalUrl: "/api/v1/test"
    } as unknown as Request;
    const res = makeResponse();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((req as Request & { userId?: string }).userId).toBe("user_1");
  });
});

describe("optionalAuth middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("continues without userId when token is missing", () => {
    const req = { cookies: {} } as unknown as Request;
    const res = makeResponse();
    const next = vi.fn();

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((req as Request & { userId?: string }).userId).toBeUndefined();
  });

  it("continues without userId when token is invalid", () => {
    vi.mocked(verifyUserToken).mockImplementation(() => {
      throw new Error("invalid");
    });

    const req = { cookies: { pulseboard_token: "bad_token" } } as unknown as Request;
    const res = makeResponse();
    const next = vi.fn();

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((req as Request & { userId?: string }).userId).toBeUndefined();
  });
});

describe("getAuthUserId", () => {
  it("returns userId when present", () => {
    const req = { userId: "user_1" } as unknown as Request;
    expect(getAuthUserId(req)).toBe("user_1");
  });

  it("throws HttpError 401 when userId is missing", () => {
    const req = {} as Request;
    expect(() => getAuthUserId(req)).toThrowError(/Authentication required/);
  });
});
