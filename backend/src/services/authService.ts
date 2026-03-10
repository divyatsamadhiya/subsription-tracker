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

const hashResetToken = (value: string): string => {
  return createHash("sha256").update(value).digest("hex");
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

  if (!user || user.deletedAt) {
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

  if (!user || user.deletedAt) {
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
