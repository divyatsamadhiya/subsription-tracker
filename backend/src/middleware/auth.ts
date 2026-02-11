import type { NextFunction, Request, Response } from "express";
import { authCookieName, verifyUserToken } from "../utils/auth.js";
import { logger } from "../logger/logger.js";
import { HttpError } from "../utils/http.js";

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.cookies[authCookieName] as string | undefined;

  if (!token) {
    logger.warn("Auth rejected: missing cookie token", { path: req.originalUrl });
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const userId = verifyUserToken(token);
    (req as Request & { userId: string }).userId = userId;
    next();
  } catch {
    logger.warn("Auth rejected: invalid token", { path: req.originalUrl });
    res.status(401).json({ error: "Invalid authentication token" });
  }
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const token = req.cookies[authCookieName] as string | undefined;
  if (!token) {
    next();
    return;
  }

  try {
    const userId = verifyUserToken(token);
    (req as Request & { userId: string }).userId = userId;
  } catch {
    // Continue unauthenticated on malformed/expired token.
  }

  next();
};

export const getAuthUserId = (req: Request): string => {
  const userId = (req as Request & { userId?: string }).userId;
  if (!userId) {
    throw new HttpError(401, "Authentication required");
  }
  return userId;
};
