import dotenv from "dotenv";

dotenv.config();

const required = (value: string | undefined, key: string, fallbackForTest?: string): string => {
  if (!value) {
    if (process.env.NODE_ENV === "test" && fallbackForTest) {
      return fallbackForTest;
    }
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  mongoUri: required(process.env.MONGODB_URI, "MONGODB_URI", "mongodb://127.0.0.1:27017/pulseboard-test"),
  jwtSecret: required(process.env.JWT_SECRET, "JWT_SECRET", "pulseboard-test-secret"),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173"
};

export const isProduction = config.nodeEnv === "production";
export const authCookieName = "pulseboard_token";
export const authCookieMaxAgeMs = 7 * 24 * 60 * 60 * 1000;
