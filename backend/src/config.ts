import crypto from "node:crypto";
import dotenv from "dotenv";

dotenv.config();

/**
 * Random salt generated on each server start.
 * Tokens signed in a previous process become invalid after a restart,
 * forcing users to log in again.
 */
export const sessionSalt = crypto.randomBytes(16).toString("hex");

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
  const raw = value ?? "http://localhost:5173,http://localhost:5174";
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

  const expanded = new Set<string>(origins);

  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (url.hostname === "localhost") {
        expanded.add(`${url.protocol}//127.0.0.1${url.port ? `:${url.port}` : ""}`);
      } else if (url.hostname === "127.0.0.1") {
        expanded.add(`${url.protocol}//localhost${url.port ? `:${url.port}` : ""}`);
      }
    } catch {
      // Keep explicit origin as-is if URL parsing fails.
    }
  }

  return [...expanded];
};

const WEAK_JWT_SECRETS = new Set([
  "change-this-to-a-long-random-secret",
  "replace-with-strong-random-secret",
  "secret",
  "jwt-secret",
  "pulseboard-secret"
]);

const validatedJwtSecret = (value: string): string => {
  if (process.env.NODE_ENV === "test") return value;
  if (WEAK_JWT_SECRETS.has(value) || value.length < 32) {
    throw new Error(
      "JWT_SECRET is too weak or a known placeholder. " +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return value;
};

const optionalForTest = (value: string | undefined, fallbackForTest: string): string | undefined => {
  if (value) {
    return value;
  }

  if (process.env.NODE_ENV === "test") {
    return fallbackForTest;
  }

  return undefined;
};

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required(process.env.DATABASE_URL, "DATABASE_URL", "postgresql://localhost:5432/pulseboard_test"),
  jwtSecret: validatedJwtSecret(required(process.env.JWT_SECRET, "JWT_SECRET", "pulseboard-test-secret")),
  frontendOrigins: parseOrigins(process.env.FRONTEND_ORIGIN),
  frontendAppUrl: process.env.FRONTEND_APP_URL ?? process.env.FRONTEND_ORIGIN?.split(",")[0]?.trim() ?? "http://localhost:5173",
  googleOauth: {
    clientId: optionalForTest(process.env.GOOGLE_CLIENT_ID, "pulseboard-google-client-id"),
    clientSecret: optionalForTest(process.env.GOOGLE_CLIENT_SECRET, "pulseboard-google-client-secret"),
    redirectUri: optionalForTest(
      process.env.GOOGLE_OAUTH_REDIRECT_URI,
      "http://localhost:4000/api/v1/auth/google/callback"
    )
  },
  email: {
    fromAddress: process.env.RESET_EMAIL_FROM ?? "onboarding@resend.dev",
    fromName: process.env.RESET_EMAIL_FROM_NAME ?? "Pulseboard",
    resendApiKey: process.env.RESEND_API_KEY,
    sendmailPath: process.env.SENDMAIL_PATH ?? "/usr/sbin/sendmail",
    allowSendmailFallback: process.env.ALLOW_SENDMAIL_FALLBACK === "true"
  }
};

export const isProduction = config.nodeEnv === "production";
export const authCookieName = "pulseboard_token";
export const authCookieMaxAgeMs = 7 * 24 * 60 * 60 * 1000;
