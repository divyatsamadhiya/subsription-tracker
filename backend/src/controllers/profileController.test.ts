import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { z, ZodError } from "zod";
import { HttpError } from "../utils/http.js";

vi.mock("../services/profileService.js", () => ({
  getProfileForUser: vi.fn(),
  updateProfileForUser: vi.fn()
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
import { getProfileForUser, updateProfileForUser } from "../services/profileService.js";
import { profileController } from "./profileController.js";

const makeResponse = (): Response => {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  } as unknown as Response;
};

const makeValidationError = (): ZodError => {
  try {
    z.object({ fullName: z.string().min(1) }).parse({ fullName: "" });
  } catch (error) {
    return error as ZodError;
  }

  throw new Error("Expected a ZodError to be thrown");
};

describe("profileController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthUserId).mockReturnValue("user_1");
  });

  it("returns 401 when get profile service fails with HttpError", async () => {
    vi.mocked(getProfileForUser).mockRejectedValue(
      new HttpError(401, "User account no longer exists")
    );
    const req = {} as Request;
    const res = makeResponse();

    await profileController.get(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "User account no longer exists" });
  });

  it("returns 400 when patch profile input validation fails", async () => {
    vi.mocked(updateProfileForUser).mockRejectedValue(makeValidationError());
    const req = { body: {} } as Request;
    const res = makeResponse();

    await profileController.patch(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "String must contain at least 1 character(s)" });
  });

  it("returns 500 when get profile service fails unexpectedly", async () => {
    vi.mocked(getProfileForUser).mockRejectedValue(new Error("Database unavailable"));
    const req = {} as Request;
    const res = makeResponse();

    await profileController.get(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
  });
});
