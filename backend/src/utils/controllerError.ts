import type { Response } from "express";
import { ZodError } from "zod";
import { logger } from "../logger/logger.js";
import { HttpError } from "./http.js";

export interface ControllerErrorContext {
  action: string;
  scope: string;
}

export const handleControllerError = (
  res: Response,
  error: unknown,
  context: ControllerErrorContext
): void => {
  if (error instanceof ZodError) {
    const message = error.issues[0]?.message ?? "Invalid request payload";
    logger.warn(`${context.scope} request validation failed`, { action: context.action, message });
    res.status(400).json({ error: message });
    return;
  }

  if (error instanceof HttpError) {
    logger.warn(`${context.scope} request failed`, {
      action: context.action,
      statusCode: error.status,
      message: error.message
    });
    res.status(error.status).json({ error: error.message });
    return;
  }

  if (error instanceof Error) {
    logger.error(`${context.scope} request failed with unexpected error`, {
      action: context.action,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: "Internal server error" });
    return;
  }

  logger.error(`${context.scope} request failed with unknown error shape`, {
    action: context.action
  });
  res.status(500).json({ error: "Unexpected server error" });
};
