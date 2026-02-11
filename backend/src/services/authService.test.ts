import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../models/User.js", () => ({
  UserModel: {
    findOne: vi.fn(),
    create: vi.fn(),
    findById: vi.fn()
  }
}));

vi.mock("../models/Settings.js", () => ({
  SettingsModel: {
    create: vi.fn()
  }
}));

vi.mock("../utils/auth.js", () => ({
  hashPassword: vi.fn(),
  comparePassword: vi.fn(),
  signUserToken: vi.fn()
}));

vi.mock("../logger/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

import { UserModel } from "../models/User.js";
import { SettingsModel } from "../models/Settings.js";
import { comparePassword, hashPassword, signUserToken } from "../utils/auth.js";
import {
  getCurrentUser,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword
} from "./authService.js";

const makeUser = (
  overrides?: Partial<
    Record<
      "_id" | "email" | "passwordHash" | "createdAt" | "updatedAt" | "passwordResetTokenHash" | "passwordResetExpiresAt",
      unknown
    >
  >
) => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    _id: { toString: () => "user_1" },
    email: "john@example.com",
    passwordHash: "hashed",
    createdAt: now,
    updatedAt: now,
    passwordResetTokenHash: undefined,
    passwordResetExpiresAt: undefined,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
};

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers a new user successfully", async () => {
    vi.mocked(UserModel.findOne).mockResolvedValue(null as never);
    vi.mocked(hashPassword).mockResolvedValue("hash_123");
    vi.mocked(UserModel.create).mockResolvedValue(makeUser() as never);
    vi.mocked(SettingsModel.create).mockResolvedValue({} as never);
    vi.mocked(signUserToken).mockReturnValue("token_abc");

    const result = await registerUser({
      email: "John@Example.com",
      password: "Password123"
    });

    expect(UserModel.findOne).toHaveBeenCalledWith({ email: "john@example.com" });
    expect(hashPassword).toHaveBeenCalledWith("Password123");
    expect(SettingsModel.create).toHaveBeenCalled();
    expect(signUserToken).toHaveBeenCalledWith("user_1");
    expect(result.token).toBe("token_abc");
    expect(result.user.email).toBe("john@example.com");
  });

  it("fails registration for duplicate email", async () => {
    vi.mocked(UserModel.findOne).mockResolvedValue(makeUser() as never);

    await expect(
      registerUser({ email: "john@example.com", password: "Password123" })
    ).rejects.toMatchObject({ status: 400, message: "Registration failed" });
  });

  it("logs user in successfully", async () => {
    vi.mocked(UserModel.findOne).mockResolvedValue(makeUser() as never);
    vi.mocked(comparePassword).mockResolvedValue(true);
    vi.mocked(signUserToken).mockReturnValue("token_abc");

    const result = await loginUser({ email: "john@example.com", password: "Password123" });

    expect(comparePassword).toHaveBeenCalledWith("Password123", "hashed");
    expect(result.token).toBe("token_abc");
    expect(result.user.id).toBe("user_1");
  });

  it("fails login when email does not exist", async () => {
    vi.mocked(UserModel.findOne).mockResolvedValue(null as never);

    await expect(
      loginUser({ email: "john@example.com", password: "Password123" })
    ).rejects.toMatchObject({ status: 401, message: "Invalid email or password" });
  });

  it("fails login when password is invalid", async () => {
    vi.mocked(UserModel.findOne).mockResolvedValue(makeUser() as never);
    vi.mocked(comparePassword).mockResolvedValue(false);

    await expect(
      loginUser({ email: "john@example.com", password: "WrongPassword" })
    ).rejects.toMatchObject({ status: 401, message: "Invalid email or password" });
  });

  it("returns the current user", async () => {
    vi.mocked(UserModel.findById).mockResolvedValue(makeUser() as never);

    const user = await getCurrentUser("user_1");

    expect(UserModel.findById).toHaveBeenCalledWith("user_1");
    expect(user.email).toBe("john@example.com");
  });

  it("fails current user lookup when user is missing", async () => {
    vi.mocked(UserModel.findById).mockResolvedValue(null as never);

    await expect(getCurrentUser("missing_user")).rejects.toMatchObject({
      status: 401,
      message: "User account no longer exists"
    });
  });

  it("generates a password reset code for an existing user", async () => {
    const user = makeUser();
    vi.mocked(UserModel.findOne).mockResolvedValue(user as never);

    const result = await requestPasswordReset({ email: "john@example.com" });

    expect(result.message).toBe("If this email exists, a reset code has been generated.");
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(user.passwordResetTokenHash).toHaveLength(64);
    expect(user.passwordResetExpiresAt).toBeInstanceOf(Date);
  });

  it("returns a generic response when reset is requested for unknown email", async () => {
    vi.mocked(UserModel.findOne).mockResolvedValue(null as never);

    const result = await requestPasswordReset({ email: "missing@example.com" });

    expect(result).toEqual({
      message: "If this email exists, a reset code has been generated."
    });
  });

  it("resets password with a valid reset code", async () => {
    const resetToken = "reset-code";
    const user = makeUser({
      passwordResetTokenHash: createHash("sha256").update(resetToken).digest("hex"),
      passwordResetExpiresAt: new Date(Date.now() + 60_000)
    });

    vi.mocked(UserModel.findOne).mockResolvedValue(user as never);
    vi.mocked(hashPassword).mockResolvedValue("new_hash_123");

    await expect(
      resetPassword({
        email: "john@example.com",
        resetToken,
        newPassword: "NewPassword123"
      })
    ).resolves.toBeUndefined();

    expect(hashPassword).toHaveBeenCalledWith("NewPassword123");
    expect(user.passwordHash).toBe("new_hash_123");
    expect(user.passwordResetTokenHash).toBeUndefined();
    expect(user.passwordResetExpiresAt).toBeUndefined();
    expect(user.save).toHaveBeenCalledTimes(1);
  });

  it("fails password reset with an invalid reset code", async () => {
    const user = makeUser({
      passwordResetTokenHash: createHash("sha256").update("valid-code").digest("hex"),
      passwordResetExpiresAt: new Date(Date.now() + 60_000)
    });

    vi.mocked(UserModel.findOne).mockResolvedValue(user as never);

    await expect(
      resetPassword({
        email: "john@example.com",
        resetToken: "wrong-code",
        newPassword: "NewPassword123"
      })
    ).rejects.toMatchObject({ status: 400, message: "Invalid or expired reset code" });
  });

  it("fails password reset when reset code is expired", async () => {
    const user = makeUser({
      passwordResetTokenHash: createHash("sha256").update("expired-code").digest("hex"),
      passwordResetExpiresAt: new Date(Date.now() - 60_000)
    });

    vi.mocked(UserModel.findOne).mockResolvedValue(user as never);

    await expect(
      resetPassword({
        email: "john@example.com",
        resetToken: "expired-code",
        newPassword: "NewPassword123"
      })
    ).rejects.toMatchObject({ status: 400, message: "Invalid or expired reset code" });
  });
});
