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

const parseOrigins = (value: string | undefined): string[] => {
  const raw = value ?? "http://localhost:5173";
  const origins = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (origins.length === 0) {
    throw new Error("FRONTEND_ORIGIN must define at least one allowed origin");
  }

  if (origins.includes("*")) {
    throw new Error("FRONTEND_ORIGIN cannot include '*' when credentialed cookies are enabled");
  }

  return origins;
};

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  mongoUri: required(process.env.MONGODB_URI, "MONGODB_URI", "mongodb://127.0.0.1:27017/pulseboard-test"),
  jwtSecret: required(process.env.JWT_SECRET, "JWT_SECRET", "pulseboard-test-secret"),
  frontendOrigins: parseOrigins(process.env.FRONTEND_ORIGIN)
};

export const isProduction = config.nodeEnv === "production";
export const authCookieName = "pulseboard_token";
export const authCookieMaxAgeMs = 7 * 24 * 60 * 60 * 1000;
