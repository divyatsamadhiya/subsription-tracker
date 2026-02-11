import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";
import { logger } from "../logger/logger.js";
import { authCookieName } from "../utils/auth.js";

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const getRefererOrigin = (referer: string | undefined): string | null => {
  if (!referer) {
    return null;
  }

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
};

export const enforceTrustedOrigin = (req: Request, res: Response, next: NextFunction): void => {
  if (!unsafeMethods.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const authToken = req.cookies?.[authCookieName] as string | undefined;
  if (!authToken) {
    next();
    return;
  }

  const origin = req.get("origin") ?? getRefererOrigin(req.get("referer"));

  // Allow non-browser clients that do not send Origin/Referer.
  if (!origin) {
    next();
    return;
  }

  if (config.frontendOrigins.includes(origin)) {
    next();
    return;
  }

  logger.warn("Origin guard rejected unsafe authenticated request", {
    method: req.method,
    path: req.originalUrl,
    origin
  });
  res.status(403).json({ error: "Invalid request origin" });
};
