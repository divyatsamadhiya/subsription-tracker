import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { z, ZodError } from "zod";
import { HttpError } from "../utils/http.js";

vi.mock("../services/settingsService.js", () => ({
  getSettingsForUser: vi.fn(),
  updateSettingsForUser: vi.fn()
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
import { getSettingsForUser, updateSettingsForUser } from "../services/settingsService.js";
import { settingsController } from "./settingsController.js";

const makeResponse = (): Response => {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  } as unknown as Response;
};

const makeValidationError = (): ZodError => {
  try {
    z.object({ defaultCurrency: z.enum(["USD", "EUR"]) }).parse({ defaultCurrency: "BAD" });
  } catch (error) {
    return error as ZodError;
  }

  throw new Error("Expected a ZodError to be thrown");
};

describe("settingsController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthUserId).mockReturnValue("user_1");
  });

  it("returns 400 when patch validation fails", async () => {
    vi.mocked(updateSettingsForUser).mockRejectedValue(makeValidationError());
    const req = { body: {} } as Request;
    const res = makeResponse();

    await settingsController.patch(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid enum value. Expected 'USD' | 'EUR', received 'BAD'" });
  });

  it("returns HttpError status from service", async () => {
    vi.mocked(getSettingsForUser).mockRejectedValue(new HttpError(503, "Settings temporarily unavailable"));
    const req = {} as Request;
    const res = makeResponse();

    await settingsController.get(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: "Settings temporarily unavailable" });
  });

  it("returns 500 when service throws unexpected error", async () => {
    vi.mocked(getSettingsForUser).mockRejectedValue(new Error("Database unavailable"));
    const req = {} as Request;
    const res = makeResponse();

    await settingsController.get(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
  });
});
