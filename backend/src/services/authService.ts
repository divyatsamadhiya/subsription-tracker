import {
  authResponseSchema,
  authUserSchema,
  loginInputSchema,
  registerInputSchema
} from "../domain/schemas.js";
import { DEFAULT_SETTINGS, type AuthResponse, type AuthUser } from "../domain/types.js";
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

export const registerUser = async (input: unknown): Promise<AuthWithToken> => {
  const payload = registerInputSchema.parse(input);

  const existing = await UserModel.findOne({ email: payload.email });
  if (existing) {
    logger.warn("Registration blocked: email already exists", { email: payload.email });
    throw new HttpError(409, "Email is already registered");
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

  logger.info("User registration succeeded", { userId: response.user.id, email: response.user.email });

  return {
    token,
    user: response.user
  };
};

export const loginUser = async (input: unknown): Promise<AuthWithToken> => {
  const payload = loginInputSchema.parse(input);

  const user = await UserModel.findOne({ email: payload.email });
  if (!user) {
    logger.warn("Login failed: user not found", { email: payload.email });
    throw new HttpError(401, "Invalid email or password");
  }

  const validPassword = await comparePassword(payload.password, user.passwordHash);
  if (!validPassword) {
    logger.warn("Login failed: invalid password", { email: payload.email });
    throw new HttpError(401, "Invalid email or password");
  }

  const token = signUserToken(user._id.toString());
  const response = authResponseSchema.parse({ user: toAuthUser(user) });

  logger.info("Login succeeded", { userId: response.user.id, email: response.user.email });

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

export const toAuthResponse = (user: AuthUser): AuthResponse => {
  return authResponseSchema.parse({ user });
};
