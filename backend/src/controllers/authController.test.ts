import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { z, ZodError } from "zod";
import { HttpError } from "../utils/http.js";

vi.mock("../services/authService.js", () => ({
  getCurrentUser: vi.fn(),
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  toAuthResponse: vi.fn((user: unknown) => ({ user }))
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

import {
  getCurrentUser,
  loginUser,
  registerUser,
  requestPasswordReset
} from "../services/authService.js";
import { getAuthUserId } from "../middleware/auth.js";
import { authController } from "./authController.js";

const makeResponse = (): Response => {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis()
  } as unknown as Response;
};

const makeValidationError = (): ZodError => {
  try {
    z.object({ email: z.string().email() }).parse({ email: "not-an-email" });
  } catch (error) {
    return error as ZodError;
  }

  throw new Error("Expected a ZodError to be thrown");
};

describe("authController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when register service returns an HttpError", async () => {
    vi.mocked(registerUser).mockRejectedValue(new HttpError(400, "Registration failed"));
    const req = { body: {} } as Request;
    const res = makeResponse();

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Registration failed" });
  });

  it("returns 401 when login service returns an HttpError", async () => {
    vi.mocked(loginUser).mockRejectedValue(new HttpError(401, "Invalid email or password"));
    const req = { body: {} } as Request;
    const res = makeResponse();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid email or password" });
  });

  it("returns 400 when forgot-password validation fails", async () => {
    vi.mocked(requestPasswordReset).mockRejectedValue(makeValidationError());
    const req = { body: {} } as Request;
    const res = makeResponse();

    await authController.forgotPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid email" });
  });

  it("returns 500 when me endpoint hits an unexpected error", async () => {
    vi.mocked(getAuthUserId).mockReturnValue("user_1");
    vi.mocked(getCurrentUser).mockRejectedValue(new Error("Database unavailable"));
    const req = {} as Request;
    const res = makeResponse();

    await authController.me(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
  });
});
