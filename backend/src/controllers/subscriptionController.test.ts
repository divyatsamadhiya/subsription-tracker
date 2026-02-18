import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { z, ZodError } from "zod";
import { HttpError } from "../utils/http.js";

vi.mock("../services/subscriptionService.js", () => ({
  createSubscriptionForUser: vi.fn(),
  deleteSubscriptionForUser: vi.fn(),
  listSubscriptionsForUser: vi.fn(),
  updateSubscriptionForUser: vi.fn()
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
  createSubscriptionForUser,
  deleteSubscriptionForUser,
  listSubscriptionsForUser,
  updateSubscriptionForUser
} from "../services/subscriptionService.js";
import { subscriptionController } from "./subscriptionController.js";

const makeResponse = (): Response => {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis()
  } as unknown as Response;
};

const makeValidationError = (): ZodError => {
  try {
    z.object({ name: z.string().min(1) }).parse({ name: "" });
  } catch (error) {
    return error as ZodError;
  }

  throw new Error("Expected a ZodError to be thrown");
};

describe("subscriptionController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthUserId).mockReturnValue("user_1");
  });

  it("returns 400 when create input validation fails", async () => {
    vi.mocked(createSubscriptionForUser).mockRejectedValue(makeValidationError());
    const req = { body: {} } as Request;
    const res = makeResponse();

    await subscriptionController.create(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "String must contain at least 1 character(s)" });
  });

  it("returns 404 when update service returns not found", async () => {
    vi.mocked(updateSubscriptionForUser).mockRejectedValue(
      new HttpError(404, "Subscription not found")
    );
    const req = { params: { id: "sub_1" }, body: {} } as unknown as Request;
    const res = makeResponse();

    await subscriptionController.update(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Subscription not found" });
  });

  it("returns 500 when list service throws unexpected error", async () => {
    vi.mocked(listSubscriptionsForUser).mockRejectedValue(new Error("Database unavailable"));
    const req = {} as Request;
    const res = makeResponse();

    await subscriptionController.list(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
  });

  it("returns 404 when delete service returns not found", async () => {
    vi.mocked(deleteSubscriptionForUser).mockRejectedValue(
      new HttpError(404, "Subscription not found")
    );
    const req = { params: { id: "missing" } } as unknown as Request;
    const res = makeResponse();

    await subscriptionController.remove(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Subscription not found" });
  });
});
