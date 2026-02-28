import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../prisma.js", async () => ({
  prisma: (await import("../test/mockPrisma.js")).mockPrisma
}));

vi.mock("../logger/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

import { prisma } from "../prisma.js";
import { getProfileForUser, updateProfileForUser } from "./profileService.js";

const makeUser = (overrides?: Partial<Record<string, unknown>>) => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    id: "user_1",
    email: "john@example.com",
    passwordHash: "hashed",
    fullName: "John Doe",
    country: "United States",
    timeZone: "America/New_York",
    phone: null,
    bio: null,
    createdAt: now,
    updatedAt: now,
    passwordResetTokenHash: null,
    passwordResetExpiresAt: null,
    ...overrides
  };
};

describe("profileService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a normalized profile response", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(makeUser() as never);

    const response = await getProfileForUser("user_1");

    expect(response.profile.fullName).toBe("John Doe");
    expect(response.profile.country).toBe("United States");
    expect(response.profileComplete).toBe(true);
  });

  it("returns incomplete profile state for legacy user", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      makeUser({ fullName: null, country: null, timeZone: null }) as never
    );

    const response = await getProfileForUser("user_1");

    expect(response.profileComplete).toBe(false);
  });

  it("updates profile fields and clears nullable optional values", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      makeUser({ phone: "+14155552671", bio: "hello there" }) as never
    );
    vi.mocked(prisma.user.update).mockResolvedValue(
      makeUser({
        fullName: "Jane Doe",
        country: "India",
        timeZone: null,
        phone: null,
        bio: null
      }) as never
    );

    const response = await updateProfileForUser("user_1", {
      fullName: "Jane Doe",
      country: "India",
      timeZone: null,
      phone: null,
      bio: null
    });

    expect(prisma.user.update).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: {
        fullName: "Jane Doe",
        country: "India",
        timeZone: null,
        phone: null,
        bio: null
      }
    });
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
