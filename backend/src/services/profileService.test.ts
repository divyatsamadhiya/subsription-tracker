import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../models/User.js", () => ({
  UserModel: {
    findById: vi.fn()
  }
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
import { getProfileForUser, updateProfileForUser } from "./profileService.js";

const makeUser = (overrides?: Partial<Record<string, unknown>>) => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    _id: { toString: () => "user_1" },
    email: "john@example.com",
    passwordHash: "hashed",
    fullName: "John Doe",
    country: "United States",
    timeZone: "America/New_York",
    phone: undefined,
    bio: undefined,
    createdAt: now,
    updatedAt: now,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
};

describe("profileService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a normalized profile response", async () => {
    vi.mocked(UserModel.findById).mockResolvedValue(makeUser() as never);

    const response = await getProfileForUser("user_1");

    expect(response.profile.fullName).toBe("John Doe");
    expect(response.profile.country).toBe("United States");
    expect(response.profileComplete).toBe(true);
  });

  it("returns incomplete profile state for legacy user", async () => {
    vi.mocked(UserModel.findById).mockResolvedValue(
      makeUser({ fullName: undefined, country: undefined, timeZone: undefined }) as never
    );

    const response = await getProfileForUser("user_1");

    expect(response.profileComplete).toBe(false);
  });

  it("updates profile fields and clears nullable optional values", async () => {
    const user = makeUser({ phone: "+14155552671", bio: "hello there" });
    vi.mocked(UserModel.findById).mockResolvedValue(user as never);

    const response = await updateProfileForUser("user_1", {
      fullName: "Jane Doe",
      country: "India",
      timeZone: null,
      phone: null,
      bio: null
    });

    expect(user.save).toHaveBeenCalledTimes(1);
    expect(user.fullName).toBe("Jane Doe");
    expect(user.country).toBe("India");
    expect(user.timeZone).toBeUndefined();
    expect(user.phone).toBeUndefined();
    expect(user.bio).toBeUndefined();
    expect(response.profile.country).toBe("India");
    expect(response.profileComplete).toBe(true);
  });

  it("rejects invalid phone values", async () => {
    await expect(
      updateProfileForUser("user_1", {
        phone: "4155552671"
      })
    ).rejects.toBeDefined();
  });
});
