import { createHash, randomBytes } from "node:crypto";
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
import { SettingsModel } from "../models/Settings.js";
import { UserModel } from "../models/User.js";
import {
  comparePassword,
  hashPassword,
  signUserToken
} from "../utils/auth.js";
import { HttpError } from "../utils/http.js";
import { toAuthUser } from "../utils/serializers.js";
import { logger } from "../logger/logger.js";

export interface AuthWithToken {
  token: string;
  user: AuthUser;
}

const resetTokenTtlMs = 15 * 60 * 1000;

const hashResetToken = (value: string): string => {
  return createHash("sha256").update(value).digest("hex");
};

export const registerUser = async (input: unknown): Promise<AuthWithToken> => {
  const payload = registerInputSchema.parse(input);

  const existing = await UserModel.findOne({ email: payload.email });
  if (existing) {
    logger.warn("Registration blocked: duplicate account attempt");
    throw new HttpError(400, "Registration failed");
  }

  const passwordHash = await hashPassword(payload.password);
  const user = await UserModel.create({
    email: payload.email,
    passwordHash
  });

  await SettingsModel.create({
    userId: user._id,
    ...DEFAULT_SETTINGS
  });

  const token = signUserToken(user._id.toString());
  const response = authResponseSchema.parse({ user: toAuthUser(user) });

  logger.info("User registration succeeded", { userId: response.user.id });

  return {
    token,
    user: response.user
  };
};

export const loginUser = async (input: unknown): Promise<AuthWithToken> => {
  const payload = loginInputSchema.parse(input);

  const user = await UserModel.findOne({ email: payload.email });
  if (!user) {
    logger.warn("Login failed: invalid credentials");
    throw new HttpError(401, "Invalid email or password");
  }

  const validPassword = await comparePassword(payload.password, user.passwordHash);
  if (!validPassword) {
    logger.warn("Login failed: invalid credentials");
    throw new HttpError(401, "Invalid email or password");
  }

  const token = signUserToken(user._id.toString());
  const response = authResponseSchema.parse({ user: toAuthUser(user) });

  logger.info("Login succeeded", { userId: response.user.id });

  return {
    token,
    user: response.user
  };
};

export const getCurrentUser = async (userId: string): Promise<AuthUser> => {
  const user = await UserModel.findById(userId);

  if (!user) {
    logger.warn("Current user lookup failed", { userId });
    throw new HttpError(401, "User account no longer exists");
  }

  const authUser = authUserSchema.parse(toAuthUser(user));
  logger.info("Current user lookup succeeded", { userId });
  return authUser;
};

export const requestPasswordReset = async (input: unknown): Promise<ForgotPasswordResponse> => {
  const payload = forgotPasswordInputSchema.parse(input);
  const message = "If this email exists, a reset code has been generated.";
  const user = await UserModel.findOne({ email: payload.email });

  if (!user) {
    logger.info("Password reset requested for unknown account");
    return forgotPasswordResponseSchema.parse({ message });
  }

  const resetToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + resetTokenTtlMs);

  user.passwordResetTokenHash = hashResetToken(resetToken);
  user.passwordResetExpiresAt = expiresAt;
  await user.save();

  logger.info("Password reset code generated", {
    userId: user._id.toString(),
    expiresAt: expiresAt.toISOString()
  });

  // In production this token should be delivered out-of-band (email/SMS), never returned by API.
  return forgotPasswordResponseSchema.parse({ message });
};

export const resetPassword = async (input: unknown): Promise<void> => {
  const payload = resetPasswordInputSchema.parse(input);
  const user = await UserModel.findOne({ email: payload.email });

  if (!user) {
    logger.warn("Password reset failed: invalid reset request");
    throw new HttpError(400, "Invalid or expired reset code");
  }

  const hasActiveToken =
    Boolean(user.passwordResetTokenHash) &&
    Boolean(user.passwordResetExpiresAt) &&
    user.passwordResetExpiresAt instanceof Date &&
    user.passwordResetExpiresAt.getTime() > Date.now();

  if (!hasActiveToken) {
    logger.warn("Password reset failed: code missing or expired", { userId: user._id.toString() });
    throw new HttpError(400, "Invalid or expired reset code");
  }

  if (hashResetToken(payload.resetToken) !== user.passwordResetTokenHash) {
    logger.warn("Password reset failed: code mismatch", { userId: user._id.toString() });
    throw new HttpError(400, "Invalid or expired reset code");
  }

  user.passwordHash = await hashPassword(payload.newPassword);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();

  logger.info("Password reset succeeded", { userId: user._id.toString() });
};

export const toAuthResponse = (user: AuthUser): AuthResponse => {
  return authResponseSchema.parse({ user });
};
