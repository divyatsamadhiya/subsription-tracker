import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { requestLogger } from "./requestLogger.js";
import { logger } from "../logger/logger.js";

describe("requestLogger middleware", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("logs successful responses", () => {
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => logger);
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => logger);

    const listeners: Record<string, () => void> = {};

    const req = {
      method: "GET",
      originalUrl: "/api/v1/health",
      ip: "127.0.0.1"
    } as Request;

    const res = {
      statusCode: 200,
      on: (event: string, callback: () => void) => {
        listeners[event] = callback;
      }
    } as unknown as Response;

    const next = vi.fn();
    requestLogger(req, res, next);
    listeners.finish();

    expect(next).toHaveBeenCalledOnce();
    expect(infoSpy).toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("logs warning for error responses", () => {
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => logger);
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => logger);

    const listeners: Record<string, () => void> = {};

    const req = {
      method: "POST",
      originalUrl: "/api/v1/auth/login",
      ip: "127.0.0.1"
    } as Request;

    const res = {
      statusCode: 401,
      on: (event: string, callback: () => void) => {
        listeners[event] = callback;
      }
    } as unknown as Response;

    const next = vi.fn();
    requestLogger(req, res, next);
    listeners.finish();

    expect(next).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
  });
});
