import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/http.js";
import { logger } from "../logger/logger.js";

export const notFoundHandler = (req: Request, res: Response): void => {
  logger.warn("Route not found", { method: req.method, path: req.originalUrl });
  res.status(404).json({ error: "Route not found" });
};

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (error instanceof ZodError) {
    logger.warn("Validation error", {
      path: _req.originalUrl,
      issue: error.issues[0]?.message ?? "Invalid request payload"
    });
    res.status(400).json({ error: error.issues[0]?.message ?? "Invalid request payload" });
    return;
  }

  if (error instanceof HttpError) {
    logger.warn("Handled application error", {
      path: _req.originalUrl,
      statusCode: error.status,
      message: error.message
    });
    res.status(error.status).json({ error: error.message });
    return;
  }

  if (error instanceof Error) {
    logger.error("Unhandled application error", {
      path: _req.originalUrl,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: error.message });
    return;
  }

  logger.error("Unhandled unknown error shape", { path: _req.originalUrl });
  res.status(500).json({ error: "Unexpected server error" });
};
