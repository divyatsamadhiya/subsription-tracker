import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { z, ZodError } from "zod";
import { HttpError } from "../utils/http.js";

vi.mock("../services/backupService.js", () => ({
  exportBackupForUser: vi.fn(),
  importBackupForUser: vi.fn()
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
import { exportBackupForUser, importBackupForUser } from "../services/backupService.js";
import { backupController } from "./backupController.js";

const makeResponse = (): Response => {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis()
  } as unknown as Response;
};

const makeValidationError = (): ZodError => {
  try {
    z.object({ version: z.literal("1.0") }).parse({ version: "2.0" });
  } catch (error) {
    return error as ZodError;
  }

  throw new Error("Expected a ZodError to be thrown");
};

describe("backupController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthUserId).mockReturnValue("user_1");
  });

  it("returns 400 when import validation fails", async () => {
    vi.mocked(importBackupForUser).mockRejectedValue(makeValidationError());
    const req = { body: {} } as Request;
    const res = makeResponse();

    await backupController.import(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.stringContaining("Invalid")
    });
  });

  it("returns HttpError status from export service", async () => {
    vi.mocked(exportBackupForUser).mockRejectedValue(new HttpError(503, "Backup export temporarily unavailable"));
    const req = {} as Request;
    const res = makeResponse();

    await backupController.export(req, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: "Backup export temporarily unavailable" });
  });

  it("returns 500 when export service fails unexpectedly", async () => {
    vi.mocked(exportBackupForUser).mockRejectedValue(new Error("Storage unavailable"));
    const req = {} as Request;
    const res = makeResponse();

    await backupController.export(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
  });
});
