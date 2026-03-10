import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  authResponseSchema,
  authUserSchema,
  forgotPasswordInputSchema,
  forgotPasswordResponseSchema,
  loginInputSchema,
  registerInputSchema,
  resetPasswordInputSchema
} from "../domain/schemas.js";
import {
  DEFAULT_SETTINGS,
  type AuthResponse,
  type AuthUser,
  type ForgotPasswordResponse
} from "../domain/types.js";
import { config } from "../config.js";
import type { User } from "../generated/prisma/client.js";
import { prisma } from "../prisma.js";
import {
  comparePassword,
  hashPassword,
  signUserToken
} from "../utils/auth.js";
import { HttpError } from "../utils/http.js";
import { toAuthUser } from "../utils/serializers.js";
import { logger } from "../logger/logger.js";
import { sendPasswordResetEmail } from "./passwordResetEmailService.js";

export interface AuthWithToken {
  token: string;
  user: AuthUser;
}

const resetTokenTtlMs = 15 * 60 * 1000;
const maxFailedAttempts = 5;
const lockoutDurationMs = 15 * 60 * 1000;
const googleAuthorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
const googleTokenEndpoint = "https://oauth2.googleapis.com/token";
const validGoogleIssuers = new Set(["accounts.google.com", "https://accounts.google.com"]);

const hashResetToken = (value: string): string => {
  return createHash("sha256").update(value).digest("hex");
};

const ensureGoogleOauthConfigured = (): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} => {
  const { clientId, clientSecret, redirectUri } = config.googleOauth;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new HttpError(503, "Google sign-in is not configured");
  }

  return { clientId, clientSecret, redirectUri };
};

const buildFrontendAuthRedirectUrl = (params?: Record<string, string>): string => {
  const url = new URL(config.frontendAppUrl);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
};

const parseJwtPayload = (token: string): Record<string, unknown> => {
  const [, payloadSegment] = token.split(".");
  if (!payloadSegment) {
    throw new HttpError(502, "Invalid Google identity token");
  }

  const normalized = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");

  try {
    const decoded = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    throw new HttpError(502, "Invalid Google identity token");
  }
};

const validateGoogleIdentity = (
  payload: Record<string, unknown>,
  clientId: string
): { sub: string; email: string; name?: string } => {
  const iss = payload.iss;
  const aud = payload.aud;
  const exp = payload.exp;
  const sub = payload.sub;
  const email = payload.email;
  const emailVerified = payload.email_verified;
  const name = payload.name;

  if (typeof iss !== "string" || !validGoogleIssuers.has(iss)) {
    throw new HttpError(401, "Invalid Google identity");
  }

  if (typeof aud !== "string" || aud !== clientId) {
    throw new HttpError(401, "Invalid Google identity");
  }

  if (typeof exp !== "number" || exp * 1000 <= Date.now()) {
    throw new HttpError(401, "Google sign-in has expired");
  }

  if (typeof sub !== "string" || sub.trim().length === 0) {
    throw new HttpError(401, "Invalid Google identity");
  }

  if (typeof email !== "string" || email.trim().length === 0) {
    throw new HttpError(401, "Google account email is unavailable");
  }

  if (emailVerified !== true) {
    throw new HttpError(401, "Google email must be verified");
  }

  return {
    sub,
    email: email.trim().toLowerCase(),
    name: typeof name === "string" && name.trim().length > 0 ? name.trim() : undefined
  };
};

const createAuthResult = (user: User): AuthWithToken => {
  const token = signUserToken({ userId: user.id, sessionVersion: user.sessionVersion });
  const response = authResponseSchema.parse({ user: toAuthUser(user) });

  return {
    token,
    user: response.user
  };
};

export const createGoogleOauthAuthorizationUrl = (state: string): string => {
  const { clientId, redirectUri } = ensureGoogleOauthConfigured();
  const url = new URL(googleAuthorizationEndpoint);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
};

export const getGoogleAuthSuccessRedirectUrl = (): string => {
  return buildFrontendAuthRedirectUrl();
};

export const getGoogleAuthFailureRedirectUrl = (errorCode: string): string => {
  return buildFrontendAuthRedirectUrl({ authError: errorCode });
};

export const loginWithGoogleAuthorizationCode = async (code: string): Promise<AuthWithToken> => {
  const { clientId, clientSecret, redirectUri } = ensureGoogleOauthConfigured();

  const tokenResponse = await fetch(googleTokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });

  if (!tokenResponse.ok) {
    logger.warn("Google token exchange failed", { status: tokenResponse.status });
    throw new HttpError(502, "Google sign-in failed");
  }

  const tokenPayload = (await tokenResponse.json()) as { id_token?: string };
  if (!tokenPayload.id_token) {
    throw new HttpError(502, "Google sign-in failed");
  }

  const identity = validateGoogleIdentity(parseJwtPayload(tokenPayload.id_token), clientId);

  const linkedUser = await prisma.user.findUnique({ where: { googleSubject: identity.sub } });
  if (linkedUser) {
    if (linkedUser.deletedAt) {
      throw new HttpError(403, "This account has been deactivated");
    }

    logger.info("Google login succeeded for linked user", { userId: linkedUser.id });
    return createAuthResult(linkedUser);
  }

  const existingUser = await prisma.user.findUnique({ where: { email: identity.email } });
  if (existingUser) {
    if (existingUser.deletedAt) {
      throw new HttpError(403, "This account has been deactivated");
    }

    const updatedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: { googleSubject: identity.sub }
    });

    logger.info("Google login linked to existing user", { userId: updatedUser.id });
    return createAuthResult(updatedUser);
  }

  const user = await prisma.user.create({
    data: {
      email: identity.email,
      googleSubject: identity.sub,
      fullName: identity.name
    }
  });

  await prisma.settings.create({
    data: {
      userId: user.id,
      ...DEFAULT_SETTINGS
    }
  });

  logger.info("Google login created new user", { userId: user.id });
  return createAuthResult(user);
};

export const registerUser = async (input: unknown): Promise<AuthWithToken> => {
  const payload = registerInputSchema.parse(input);

  const existing = await prisma.user.findUnique({ where: { email: payload.email } });
  if (existing) {
    logger.warn("Registration blocked: duplicate account attempt");
    throw new HttpError(400, "Registration failed");
  }

  const passwordHash = await hashPassword(payload.password);
  const user = await prisma.user.create({
    data: {
      email: payload.email,
      passwordHash,
      fullName: payload.fullName,
      country: payload.country,
      timeZone: payload.timeZone
    }
  });

  await prisma.settings.create({
    data: {
      userId: user.id,
      ...DEFAULT_SETTINGS
    }
  });

  const token = signUserToken({ userId: user.id, sessionVersion: user.sessionVersion });
  const response = authResponseSchema.parse({ user: toAuthUser(user) });

  logger.info("User registration succeeded", { userId: response.user.id });

  return {
    token,
    user: response.user
  };
};

export const loginUser = async (input: unknown): Promise<AuthWithToken> => {
  const payload = loginInputSchema.parse(input);

  const user = await prisma.user.findUnique({ where: { email: payload.email } });
  if (!user) {
    logger.warn("Login failed: invalid credentials");
    throw new HttpError(401, "Invalid email or password");
  }

  if (user.deletedAt) {
    logger.warn("Login failed: account deleted", { userId: user.id });
    throw new HttpError(403, "This account has been deactivated");
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    logger.warn("Login failed: account temporarily locked", { userId: user.id });
    throw new HttpError(423, "Account temporarily locked due to too many failed attempts. Please try again later.");
  }

  if (!user.passwordHash) {
    logger.warn("Login failed: password auth unavailable for account", { userId: user.id });
    throw new HttpError(401, "Invalid email or password");
  }

  const validPassword = await comparePassword(payload.password, user.passwordHash);
  if (!validPassword) {
    const attempts = user.failedLoginAttempts + 1;
    const lockout = attempts >= maxFailedAttempts ? new Date(Date.now() + lockoutDurationMs) : null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil: lockout
      }
    });

    if (lockout) {
      logger.warn("Account locked after repeated failures", { userId: user.id, attempts });
      throw new HttpError(423, "Account temporarily locked due to too many failed attempts. Please try again later.");
    }

    logger.warn("Login failed: invalid credentials", { userId: user.id, attempts });
    throw new HttpError(401, "Invalid email or password");
  }

  if (user.failedLoginAttempts > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null }
    });
  }

  const token = signUserToken({ userId: user.id, sessionVersion: user.sessionVersion });
  const response = authResponseSchema.parse({ user: toAuthUser(user) });

  logger.info("Login succeeded", { userId: response.user.id });

  return {
    token,
    user: response.user
  };
};

export const getCurrentUser = async (userId: string): Promise<AuthUser> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    logger.warn("Current user lookup failed", { userId });
    throw new HttpError(401, "User account no longer exists");
  }

  if (user.deletedAt) {
    logger.warn("Current user lookup failed: account deleted", { userId });
    throw new HttpError(401, "User account no longer exists");
  }

  const authUser = authUserSchema.parse(toAuthUser(user));
  logger.info("Current user lookup succeeded", { userId });
  return authUser;
};

export const requestPasswordReset = async (input: unknown): Promise<ForgotPasswordResponse> => {
  const payload = forgotPasswordInputSchema.parse(input);
  const message = "If this email exists, a reset code has been generated.";
  const user = await prisma.user.findUnique({ where: { email: payload.email } });

  if (!user || user.deletedAt || !user.passwordHash) {
    logger.info("Password reset requested for unknown account");
    return forgotPasswordResponseSchema.parse({ message });
  }

  const resetCode = randomBytes(4).toString("hex");
  const expiresAt = new Date(Date.now() + resetTokenTtlMs);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: hashResetToken(resetCode),
      passwordResetExpiresAt: expiresAt
    }
  });

  try {
    await sendPasswordResetEmail({
      toEmail: user.email,
      resetCode,
      expiresAt
    });
  } catch (error) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null
      }
    });

    logger.error("Password reset email delivery failed", {
      userId: user.id,
      message: error instanceof Error ? error.message : "Unknown email delivery error"
    });
    throw new HttpError(503, "Password reset is temporarily unavailable. Please try again later.");
  }

  logger.info("Password reset code generated and delivered", {
    userId: user.id,
    expiresAt: expiresAt.toISOString()
  });

  return forgotPasswordResponseSchema.parse({ message });
};

export const resetPassword = async (input: unknown): Promise<void> => {
  const payload = resetPasswordInputSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { email: payload.email } });

  if (!user || user.deletedAt || !user.passwordHash) {
    logger.warn("Password reset failed: invalid reset request");
    throw new HttpError(400, "Invalid or expired reset code");
  }

  const hasActiveToken =
    Boolean(user.passwordResetTokenHash) &&
    Boolean(user.passwordResetExpiresAt) &&
    user.passwordResetExpiresAt instanceof Date &&
    user.passwordResetExpiresAt.getTime() > Date.now();

  if (!hasActiveToken) {
    logger.warn("Password reset failed: code missing or expired", { userId: user.id });
    throw new HttpError(400, "Invalid or expired reset code");
  }

  const computedHash = Buffer.from(hashResetToken(payload.resetToken));
  const storedHash = Buffer.from(user.passwordResetTokenHash!);
  if (computedHash.length !== storedHash.length || !timingSafeEqual(computedHash, storedHash)) {
    logger.warn("Password reset failed: code mismatch", { userId: user.id });
    throw new HttpError(400, "Invalid or expired reset code");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(payload.newPassword),
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null
    }
  });

  logger.info("Password reset succeeded", { userId: user.id });
};

export const toAuthResponse = (user: AuthUser): AuthResponse => {
  return authResponseSchema.parse({ user });
};
