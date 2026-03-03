import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/auth.js", () => ({
  authCookieName: "pulseboard_token",
  verifyUserToken: vi.fn()
}));

vi.mock("../prisma.js", async () => ({
  prisma: (await import("../test/mockPrisma.js")).mockPrisma
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
import { getAuthUserId, optionalAuth, requireAdmin, requireAuth } from "./auth.js";
import { verifyUserToken } from "../utils/auth.js";
import { prisma } from "../prisma.js";

const flushAsync = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

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

  it("returns 401 when token is missing", async () => {
    const req = { cookies: {}, originalUrl: "/api/v1/profile" } as unknown as Request;
    const res = makeResponse();
    const next = vi.fn();

    requireAuth(req, res, next);
    await flushAsync();

    expect(next).not.toHaveBeenCalled();
    expect((res.status as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(401);
  });

  it("returns 401 when token is invalid", async () => {
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
    await flushAsync();

    expect(next).not.toHaveBeenCalled();
    expect((res.status as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(401);
  });

  it("attaches userId and continues on valid token", async () => {
    vi.mocked(verifyUserToken).mockReturnValue({ userId: "user_1", sessionVersion: 2 });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user_1",
      role: "admin",
      sessionVersion: 2,
      deletedAt: null
    } as never);

    const req = {
      cookies: { pulseboard_token: "good_token" },
      originalUrl: "/api/v1/test"
    } as unknown as Request;
    const res = makeResponse();
    const next = vi.fn();

    requireAuth(req, res, next);
    await flushAsync();

    expect(next).toHaveBeenCalledTimes(1);
    expect((req as Request & { userId?: string }).userId).toBe("user_1");
    expect((req as Request & { userRole?: string }).userRole).toBe("admin");
  });

  it("returns 401 when token session version is stale", async () => {
    vi.mocked(verifyUserToken).mockReturnValue({ userId: "user_1", sessionVersion: 1 });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user_1",
      role: "user",
      sessionVersion: 2,
      deletedAt: null
    } as never);

    const req = {
      cookies: { pulseboard_token: "good_token" },
      originalUrl: "/api/v1/test"
    } as unknown as Request;
    const res = makeResponse();
    const next = vi.fn();

    requireAuth(req, res, next);
    await flushAsync();

    expect(next).not.toHaveBeenCalled();
    expect((res.status as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(401);
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

  it("continues without userId when token is invalid", async () => {
    vi.mocked(verifyUserToken).mockImplementation(() => {
      throw new Error("invalid");
    });

    const req = { cookies: { pulseboard_token: "bad_token" } } as unknown as Request;
    const res = makeResponse();
    const next = vi.fn();

    optionalAuth(req, res, next);
    await flushAsync();

    expect(next).toHaveBeenCalledTimes(1);
    expect((req as Request & { userId?: string }).userId).toBeUndefined();
  });

  it("attaches user context for valid active session", async () => {
    vi.mocked(verifyUserToken).mockReturnValue({ userId: "user_1", sessionVersion: 3 });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user_1",
      role: "user",
      sessionVersion: 3,
      deletedAt: null
    } as never);

    const req = { cookies: { pulseboard_token: "good_token" } } as unknown as Request;
    const res = makeResponse();
    const next = vi.fn();

    optionalAuth(req, res, next);
    await flushAsync();

    expect(next).toHaveBeenCalledTimes(1);
    expect((req as Request & { userId?: string }).userId).toBe("user_1");
    expect((req as Request & { userRole?: string }).userRole).toBe("user");
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

describe("requireAdmin middleware", () => {
  it("returns 403 when role is not admin", () => {
    const req = { userRole: "user", originalUrl: "/api/v1/admin/users" } as unknown as Request;
    const res = makeResponse();
    const next = vi.fn();

    requireAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect((res.status as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(403);
  });

  it("continues when role is admin", () => {
    const req = { userRole: "admin", originalUrl: "/api/v1/admin/users" } as unknown as Request;
    const res = makeResponse();
    const next = vi.fn();

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
