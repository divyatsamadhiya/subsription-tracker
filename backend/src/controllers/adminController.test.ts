import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { HttpError } from "../utils/http.js";

vi.mock("../services/adminService.js", () => ({
  getAdminSession: vi.fn(),
  listAdminUsers: vi.fn(),
  getAdminUserDetail: vi.fn(),
  softDeleteUserByAdmin: vi.fn(),
  restoreUserByAdmin: vi.fn(),
  forceLogoutUserByAdmin: vi.fn(),
  getAdminOverviewAnalytics: vi.fn()
}));

vi.mock("../middleware/auth.js", () => ({
  getAuthUserId: vi.fn()
}));

vi.mock("../logger/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

import { getAuthUserId } from "../middleware/auth.js";
import {
  getAdminOverviewAnalytics,
  getAdminSession,
  softDeleteUserByAdmin
} from "../services/adminService.js";
import { adminController } from "./adminController.js";

const makeResponse = (): Response => {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis()
  } as unknown as Response;
};

describe("adminController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthUserId).mockReturnValue("admin_1");
  });

  it("returns 200 for session bootstrap", async () => {
    vi.mocked(getAdminSession).mockResolvedValue({
      user: {
        id: "admin_1",
        email: "admin@example.com",
        role: "admin",
        profile: {},
        profileComplete: false,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    });

    const req = {} as Request;
    const res = makeResponse();

    await adminController.session(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 404 when delete target does not exist", async () => {
    vi.mocked(softDeleteUserByAdmin).mockRejectedValue(new HttpError(404, "User not found"));

    const req = { params: { userId: "missing" }, body: { reason: "test" } } as unknown as Request;
    const res = makeResponse();

    await adminController.deleteUser(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
  });

  it("returns 500 on unexpected analytics error", async () => {
    vi.mocked(getAdminOverviewAnalytics).mockRejectedValue(new Error("db down"));

    const req = {} as Request;
    const res = makeResponse();

    await adminController.analyticsOverview(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
  });
});
