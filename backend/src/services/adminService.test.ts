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
import {
  forceLogoutUserByAdmin,
  getAdminOverviewAnalytics,
  listAdminUsers,
  purgeDeletedUsersOlderThan,
  restoreUserByAdmin,
  setUserRoleByEmail,
  softDeleteUserByAdmin
} from "./adminService.js";

const makeUser = (overrides?: Partial<Record<string, unknown>>) => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  return {
    id: "user_1",
    email: "john@example.com",
    passwordHash: "hash",
    role: "user",
    sessionVersion: 1,
    fullName: "John Doe",
    country: "United States",
    timeZone: "America/New_York",
    phone: null,
    bio: null,
    deletedAt: null,
    deletedByAdminId: null,
    deleteReason: null,
    passwordResetTokenHash: null,
    passwordResetExpiresAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
};

const makeSubscription = (overrides?: Partial<Record<string, unknown>>) => ({
  userId: "user_1",
  category: "entertainment",
  currency: "USD",
  amountMinor: 1000,
  billingCycle: "monthly",
  customIntervalDays: null,
  isActive: true,
  ...overrides
});

describe("adminService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (value: unknown) => {
      if (typeof value === "function") {
        return value(prisma as never);
      }

      if (Array.isArray(value)) {
        return Promise.all(value as Promise<unknown>[]);
      }

      return value as never;
    });
  });

  it("lists users with pagination and active subscription counts", async () => {
    vi.mocked(prisma.user.count).mockResolvedValue(1 as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: "user_1",
        email: "john@example.com",
        role: "user",
        fullName: "John Doe",
        country: "United States",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        deletedAt: null,
        _count: { subscriptions: 2 }
      }
    ] as never);
    vi.mocked(prisma.subscription.groupBy).mockResolvedValue([
      { userId: "user_1", _count: { _all: 1 } }
    ] as never);

    const result = await listAdminUsers({ status: "all", page: 1, pageSize: 10 });

    expect(result.total).toBe(1);
    expect(result.users[0]?.subscriptionCount).toBe(2);
    expect(result.users[0]?.activeSubscriptionCount).toBe(1);
    expect(result.users[0]?.status).toBe("active");
  });

  it("prevents self soft-delete", async () => {
    await expect(
      softDeleteUserByAdmin("admin_1", "admin_1", { reason: "cleanup" })
    ).rejects.toMatchObject({ status: 400, message: "Admin cannot delete their own account" });
  });

  it("soft-deletes a target user and writes audit log", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user_2", deletedAt: null } as never);
    vi.mocked(prisma.user.update).mockResolvedValue(makeUser({ id: "user_2" }) as never);
    vi.mocked(prisma.adminAuditLog.create).mockResolvedValue({} as never);

    await expect(
      softDeleteUserByAdmin("admin_1", "user_2", { reason: "fraud" })
    ).resolves.toBeUndefined();

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user_2" },
      data: expect.objectContaining({
        deletedByAdminId: "admin_1",
        deleteReason: "fraud",
        sessionVersion: { increment: 1 }
      })
    });
    expect(prisma.adminAuditLog.create).toHaveBeenCalledTimes(1);
  });

  it("restores a deleted user and writes audit log", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user_2",
      deletedAt: new Date("2026-02-01T00:00:00.000Z")
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue(makeUser({ id: "user_2" }) as never);
    vi.mocked(prisma.adminAuditLog.create).mockResolvedValue({} as never);

    await expect(
      restoreUserByAdmin("admin_1", "user_2", { reason: "false positive" })
    ).resolves.toBeUndefined();

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user_2" },
      data: {
        deletedAt: null,
        deletedByAdminId: null,
        deleteReason: null,
        sessionVersion: { increment: 1 }
      }
    });
    expect(prisma.adminAuditLog.create).toHaveBeenCalledTimes(1);
  });

  it("forces logout by incrementing session version", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user_2" } as never);
    vi.mocked(prisma.user.update).mockResolvedValue(makeUser({ id: "user_2" }) as never);
    vi.mocked(prisma.adminAuditLog.create).mockResolvedValue({} as never);

    await expect(
      forceLogoutUserByAdmin("admin_1", "user_2", { reason: "security reset" })
    ).resolves.toBeUndefined();

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user_2" },
      data: { sessionVersion: { increment: 1 } }
    });
    expect(prisma.adminAuditLog.create).toHaveBeenCalledTimes(1);
  });

  it("returns aggregate-only analytics overview", async () => {
    vi.mocked(prisma.user.count)
      .mockResolvedValueOnce(10 as never)
      .mockResolvedValueOnce(2 as never)
      .mockResolvedValueOnce(4 as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { createdAt: new Date("2026-02-20T00:00:00.000Z") },
      { createdAt: new Date("2026-02-20T10:00:00.000Z") }
    ] as never);
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([
      makeSubscription({ category: "entertainment", currency: "USD", amountMinor: 1000 }),
      makeSubscription({ category: "productivity", currency: "USD", amountMinor: 500 })
    ] as never);

    const analytics = await getAdminOverviewAnalytics();

    expect(analytics.users.active).toBe(10);
    expect(analytics.users.deleted).toBe(2);
    expect(analytics.subscriptions.activeTotal).toBe(2);
    expect(analytics.subscriptions.totalByCategory.entertainment).toBe(1);
    expect(analytics.monthlySpendByCurrency[0]?.currency).toBe("USD");
    expect(analytics.signupTrend).toHaveLength(30);
  });

  it("grants role by email and writes audit log", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(makeUser({ role: "user" }) as never);
    vi.mocked(prisma.user.update).mockResolvedValue(makeUser({ role: "admin" }) as never);
    vi.mocked(prisma.adminAuditLog.create).mockResolvedValue({} as never);

    const updated = await setUserRoleByEmail("system", "john@example.com", "admin");

    expect(updated.role).toBe("admin");
    expect(prisma.adminAuditLog.create).toHaveBeenCalledTimes(1);
  });

  it("purges users deleted older than retention", async () => {
    vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 3 } as never);

    const purgedCount = await purgeDeletedUsersOlderThan(30);

    expect(purgedCount).toBe(3);
    expect(prisma.user.deleteMany).toHaveBeenCalledWith({
      where: {
        deletedAt: {
          lte: expect.any(Date)
        }
      }
    });
  });
});
