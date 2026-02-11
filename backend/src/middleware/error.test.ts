import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import type { Request, Response } from "express";
import { HttpError } from "../utils/http.js";
import { errorHandler, notFoundHandler } from "./error.js";

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

describe("error middleware", () => {
  it("handles 404 route", () => {
    const req = { method: "GET", originalUrl: "/missing" } as Request;
    const res = makeResponse();

    notFoundHandler(req, res);

    expect((res.status as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(404);
  });

  it("handles Zod validation errors", () => {
    const req = { originalUrl: "/api" } as Request;
    const res = makeResponse();

    errorHandler(new ZodError([]), req, res, vi.fn());

    expect((res.status as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(400);
  });

  it("handles HttpError", () => {
    const req = { originalUrl: "/api" } as Request;
    const res = makeResponse();

    errorHandler(new HttpError(409, "Conflict"), req, res, vi.fn());

    expect((res.status as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(409);
  });

  it("handles generic Error", () => {
    const req = { originalUrl: "/api" } as Request;
    const res = makeResponse();

    errorHandler(new Error("Boom"), req, res, vi.fn());

    expect((res.status as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(500);
  });
});
