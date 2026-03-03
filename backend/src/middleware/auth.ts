import type { NextFunction, Request, Response } from "express";
import { authCookieName, verifyUserToken } from "../utils/auth.js";
import { logger } from "../logger/logger.js";
import { HttpError } from "../utils/http.js";
import { prisma } from "../prisma.js";
import type { UserRole } from "../domain/types.js";

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  void (async () => {
    try {
      const token = req.cookies[authCookieName] as string | undefined;

      if (!token) {
        logger.warn("Auth rejected: missing cookie token", { path: req.originalUrl });
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      let decoded;
      try {
        decoded = verifyUserToken(token);
      } catch {
        logger.warn("Auth rejected: invalid token", { path: req.originalUrl });
        res.status(401).json({ error: "Invalid authentication token" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          role: true,
          sessionVersion: true,
          deletedAt: true
        }
      });

      if (!user || user.deletedAt || user.sessionVersion !== decoded.sessionVersion) {
        logger.warn("Auth rejected: stale or inactive session", { path: req.originalUrl });
        res.status(401).json({ error: "Invalid authentication token" });
        return;
      }

      const authReq = req as Request & { userId: string; userRole: UserRole };
      authReq.userId = user.id;
      authReq.userRole = user.role;
      next();
    } catch (error) {
      next(error);
    }
  })();
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  void (async () => {
    try {
      const token = req.cookies[authCookieName] as string | undefined;
      if (!token) {
        next();
        return;
      }

      let decoded;
      try {
        decoded = verifyUserToken(token);
      } catch {
        // Continue unauthenticated on malformed/expired token.
        next();
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          role: true,
          sessionVersion: true,
          deletedAt: true
        }
      });

      if (user && !user.deletedAt && user.sessionVersion === decoded.sessionVersion) {
        const authReq = req as Request & { userId: string; userRole: UserRole };
        authReq.userId = user.id;
        authReq.userRole = user.role;
      }

      next();
    } catch (error) {
      next(error);
    }
  })();
};

export const getAuthUserId = (req: Request): string => {
  const userId = (req as Request & { userId?: string }).userId;
  if (!userId) {
    throw new HttpError(401, "Authentication required");
  }
  return userId;
};

export const getAuthUserRole = (req: Request): UserRole => {
  const role = (req as Request & { userRole?: UserRole }).userRole;
  if (!role) {
    throw new HttpError(401, "Authentication required");
  }
  return role;
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const role = (req as Request & { userRole?: UserRole }).userRole;
  if (role !== "admin") {
    logger.warn("Admin access rejected: insufficient role", { path: req.originalUrl });
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  next();
};
