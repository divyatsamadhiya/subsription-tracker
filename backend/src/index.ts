import { config } from "./config.js";
import { connectDatabase, disconnectDatabase } from "./db.js";
import { createApp } from "./app.js";
import { logger } from "./logger/logger.js";

const bootstrap = async (): Promise<void> => {
  await connectDatabase();

  const app = createApp();

  const server = app.listen(config.port, () => {
    logger.info("Pulseboard backend listening", { url: `http://localhost:${config.port}` });
  });

  const shutdown = async () => {
    logger.info("Shutting down gracefully...");
    server.close();
    await disconnectDatabase();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

bootstrap().catch((error: unknown) => {
  if (error instanceof Error) {
    logger.error("Failed to start backend", { message: error.message, stack: error.stack });
  } else {
    logger.error("Failed to start backend with unknown error");
  }
  process.exit(1);
});
