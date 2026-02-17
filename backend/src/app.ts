import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { subscriptionsRouter } from "./routes/subscriptions.js";
import { settingsRouter } from "./routes/settings.js";
import { backupRouter } from "./routes/backup.js";
import { profileRouter } from "./routes/profile.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { enforceTrustedOrigin } from "./middleware/originGuard.js";
import { logger } from "./logger/logger.js";

export const createApp = () => {
  const app = express();
  app.disable("x-powered-by");

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  );
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || config.frontendOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(null, false);
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(requestLogger);
  app.use(enforceTrustedOrigin);

  app.get("/api/v1/health", (_req, res) => {
    logger.info("Health check succeeded");
    res.status(200).json({ ok: true });
  });

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/subscriptions", subscriptionsRouter);
  app.use("/api/v1/settings", settingsRouter);
  app.use("/api/v1/profile", profileRouter);
  app.use("/api/v1/backup", backupRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
