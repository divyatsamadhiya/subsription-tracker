import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../models/Settings.js", () => ({
  SettingsModel: {
    findOne: vi.fn(),
    deleteMany: vi.fn(),
    create: vi.fn()
  }
}));

vi.mock("../models/Subscription.js", () => ({
  SubscriptionModel: {
    find: vi.fn(),
    deleteMany: vi.fn(),
    insertMany: vi.fn()
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

import { SettingsModel } from "../models/Settings.js";
import { SubscriptionModel } from "../models/Subscription.js";
import { exportBackupForUser, importBackupForUser } from "./backupService.js";

const makeSubscription = (id: string) => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    id,
    name: "Netflix",
    amountMinor: 999,
    currency: "USD",
    billingCycle: "monthly",
    nextBillingDate: "2026-01-08",
    category: "entertainment",
    reminderDaysBefore: [1, 3, 7],
    isActive: true,
    createdAt: now,
    updatedAt: now
  };
};

describe("backupService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports backup with existing settings and subscriptions", async () => {
    const sort = vi.fn().mockResolvedValue([makeSubscription("sub_1")]);
    vi.mocked(SettingsModel.findOne).mockResolvedValue({
      defaultCurrency: "USD",
      weekStartsOn: 0,
      notificationsEnabled: false
    } as never);
    vi.mocked(SubscriptionModel.find).mockReturnValue({ sort } as never);

    const backup = await exportBackupForUser("user_1");

    expect(backup.version).toBe("1.0");
    expect(backup.subscriptions).toHaveLength(1);
    expect(backup.settings.defaultCurrency).toBe("USD");
  });

  it("exports backup with default settings when settings are missing", async () => {
    const sort = vi.fn().mockResolvedValue([]);
    vi.mocked(SettingsModel.findOne).mockResolvedValue(null as never);
    vi.mocked(SubscriptionModel.find).mockReturnValue({ sort } as never);

    const backup = await exportBackupForUser("user_1");

    expect(backup.settings.defaultCurrency).toBe("USD");
    expect(backup.subscriptions).toHaveLength(0);
  });

  it("imports backup and inserts subscriptions", async () => {
    vi.mocked(SubscriptionModel.deleteMany).mockResolvedValue({ acknowledged: true } as never);
    vi.mocked(SettingsModel.deleteMany).mockResolvedValue({ acknowledged: true } as never);
    vi.mocked(SettingsModel.create).mockResolvedValue({} as never);
    vi.mocked(SubscriptionModel.insertMany).mockResolvedValue([] as never);

    await importBackupForUser("user_1", {
      version: "1.0",
      exportedAt: "2026-01-01T00:00:00.000Z",
      settings: {
        defaultCurrency: "USD",
        weekStartsOn: 0,
        notificationsEnabled: false
      },
      subscriptions: [
        {
          ...makeSubscription("sub_1"),
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z"
        }
      ]
    });

    expect(SubscriptionModel.deleteMany).toHaveBeenCalledWith({ userId: "user_1" });
    expect(SettingsModel.create).toHaveBeenCalled();
    expect(SubscriptionModel.insertMany).toHaveBeenCalledTimes(1);
  });

  it("imports backup without insertMany when subscriptions are empty", async () => {
    vi.mocked(SubscriptionModel.deleteMany).mockResolvedValue({ acknowledged: true } as never);
    vi.mocked(SettingsModel.deleteMany).mockResolvedValue({ acknowledged: true } as never);
    vi.mocked(SettingsModel.create).mockResolvedValue({} as never);

    await importBackupForUser("user_1", {
      version: "1.0",
      exportedAt: "2026-01-01T00:00:00.000Z",
      settings: {
        defaultCurrency: "USD",
        weekStartsOn: 0,
        notificationsEnabled: false
      },
      subscriptions: []
    });

    expect(SubscriptionModel.insertMany).not.toHaveBeenCalled();
  });

  it("rejects invalid backup payload", async () => {
    await expect(importBackupForUser("user_1", { invalid: true })).rejects.toBeDefined();
  });
});
