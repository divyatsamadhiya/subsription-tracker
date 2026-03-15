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
import { exportBackupForUser, importBackupForUser } from "./backupService.js";

const makeSubscription = (id: string) => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    pk: "pk_1",
    id,
    userId: "user_1",
    name: "Netflix",
    amountMinor: 999,
    currency: "USD",
    billingCycle: "monthly",
    customIntervalDays: null,
    nextBillingDate: "2026-01-08",
    category: "entertainment",
    reminderDaysBefore: [1, 3, 7],
    isActive: true,
    notes: null,
    priorSpendingMinor: 0,
    priceChanges: [
      {
        id: "pc_1",
        subscriptionPk: "pk_1",
        amountMinor: 999,
        currency: "USD",
        billingCycle: "monthly",
        customIntervalDays: null,
        effectiveDate: "2026-01-01",
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now
  };
};

describe("backupService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports backup with existing settings and subscriptions", async () => {
    vi.mocked(prisma.settings.findUnique).mockResolvedValue({
      defaultCurrency: "USD",
      weekStartsOn: 0,
      notificationsEnabled: false,
      themePreference: "dark"
    } as never);
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([makeSubscription("sub_1")] as never);

    const backup = await exportBackupForUser("user_1");

    expect(backup.version).toBe("1.0");
    expect(backup.subscriptions).toHaveLength(1);
    expect(backup.settings.defaultCurrency).toBe("USD");
    expect(backup.settings.themePreference).toBe("dark");
  });

  it("exports backup with default settings when settings are missing", async () => {
    vi.mocked(prisma.settings.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([] as never);

    const backup = await exportBackupForUser("user_1");

    expect(backup.settings.defaultCurrency).toBe("INR");
    expect(backup.settings.themePreference).toBe("system");
    expect(backup.subscriptions).toHaveLength(0);
  });

  it("imports backup and inserts subscriptions", async () => {
    vi.mocked(prisma.subscription.deleteMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.settings.deleteMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.settings.create).mockResolvedValue({} as never);
    vi.mocked(prisma.subscription.create).mockResolvedValue({} as never);

    await importBackupForUser("user_1", {
      version: "1.0",
      exportedAt: "2026-01-01T00:00:00.000Z",
      settings: {
        defaultCurrency: "USD",
        weekStartsOn: 0,
        notificationsEnabled: false,
        themePreference: "dark"
      },
      subscriptions: [
        {
          id: "sub_1",
          name: "Netflix",
          amountMinor: 999,
          currency: "USD",
          billingCycle: "monthly",
          nextBillingDate: "2026-01-08",
          category: "entertainment",
          reminderDaysBefore: [1, 3, 7],
          isActive: true,
          priorSpendingMinor: 0,
          priceHistory: [
            {
              amountMinor: 999,
              currency: "USD",
              billingCycle: "monthly",
              effectiveDate: "2026-01-01"
            }
          ],
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z"
        }
      ]
    });

    expect(prisma.subscription.deleteMany).toHaveBeenCalledWith({ where: { userId: "user_1" } });
    expect(prisma.settings.create).toHaveBeenCalled();
    expect(prisma.subscription.create).toHaveBeenCalledTimes(1);
  });

  it("imports backup without createMany when subscriptions are empty", async () => {
    vi.mocked(prisma.subscription.deleteMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.settings.deleteMany).mockResolvedValue({ count: 0 } as never);
    vi.mocked(prisma.settings.create).mockResolvedValue({} as never);

    await importBackupForUser("user_1", {
      version: "1.0",
      exportedAt: "2026-01-01T00:00:00.000Z",
      settings: {
        defaultCurrency: "USD",
        weekStartsOn: 0,
        notificationsEnabled: false,
        themePreference: "system"
      },
      subscriptions: []
    });

    expect(prisma.subscription.create).not.toHaveBeenCalled();
  });

  it("rejects invalid backup payload", async () => {
    await expect(importBackupForUser("user_1", { invalid: true })).rejects.toBeDefined();
  });
});
