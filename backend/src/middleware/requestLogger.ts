import type { NextFunction, Request, Response } from "express";
import { logger } from "../logger/logger.js";

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const payload = {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip
    };

    if (res.statusCode >= 400) {
      logger.warn("Request completed with error status", payload);
      return;
    }

    logger.info("Request completed successfully", payload);
  });

  next();
};
