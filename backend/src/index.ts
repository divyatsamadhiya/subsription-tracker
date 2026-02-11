import { config } from "./config.js";
import { connectMongo } from "./db.js";
import { createApp } from "./app.js";
import { logger } from "./logger/logger.js";

const bootstrap = async (): Promise<void> => {
  await connectMongo();

  const app = createApp();

  app.listen(config.port, () => {
    logger.info("Pulseboard backend listening", { url: `http://localhost:${config.port}` });
  });
};

bootstrap().catch((error: unknown) => {
  if (error instanceof Error) {
    logger.error("Failed to start backend", { message: error.message, stack: error.stack });
  } else {
    logger.error("Failed to start backend with unknown error");
  }
  process.exit(1);
});
