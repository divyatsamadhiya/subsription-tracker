import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../models/Settings.js", () => ({
  SettingsModel: {
    findOne: vi.fn()
  }
}));

vi.mock("../models/Subscription.js", () => ({
  SubscriptionModel: {
    find: vi.fn(),
    create: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn()
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
import {
  createSubscriptionForUser,
  deleteSubscriptionForUser,
  listSubscriptionsForUser,
  updateSubscriptionForUser
} from "./subscriptionService.js";

const makeSubscription = (overrides?: Partial<Record<string, unknown>>) => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    id: "sub_1",
    name: "Netflix",
    amountMinor: 999,
    currency: "USD",
    billingCycle: "monthly",
    nextBillingDate: "2026-01-08",
    category: "entertainment",
    reminderDaysBefore: [1, 3, 7],
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
};

describe("subscriptionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists subscriptions for a user", async () => {
    const sort = vi.fn().mockResolvedValue([makeSubscription()]);
    vi.mocked(SubscriptionModel.find).mockReturnValue({ sort } as never);

    const subscriptions = await listSubscriptionsForUser("user_1");

    expect(SubscriptionModel.find).toHaveBeenCalledWith({ userId: "user_1" });
    expect(sort).toHaveBeenCalledWith({ nextBillingDate: 1, name: 1 });
    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0].id).toBe("sub_1");
  });

  it("creates a subscription using account currency", async () => {
    vi.mocked(SettingsModel.findOne).mockResolvedValue({ defaultCurrency: "INR" } as never);
    vi.mocked(SubscriptionModel.create).mockResolvedValue(makeSubscription({ currency: "INR" }) as never);

    const result = await createSubscriptionForUser("user_1", {
      name: "Netflix",
      amountMinor: 999,
      billingCycle: "monthly",
      nextBillingDate: "2026-01-08",
      category: "entertainment",
      reminderDaysBefore: [1, 3],
      isActive: true
    });

    expect(SettingsModel.findOne).toHaveBeenCalledWith({ userId: "user_1" });
    expect(result.currency).toBe("INR");
  });

  it("falls back to USD when settings are missing", async () => {
    vi.mocked(SettingsModel.findOne).mockResolvedValue(null as never);
    vi.mocked(SubscriptionModel.create).mockResolvedValue(makeSubscription({ currency: "USD" }) as never);

    const result = await createSubscriptionForUser("user_1", {
      name: "Netflix",
      amountMinor: 999,
      billingCycle: "monthly",
      nextBillingDate: "2026-01-08",
      category: "entertainment",
      reminderDaysBefore: [1],
      isActive: true
    });

    expect(result.currency).toBe("USD");
  });

  it("updates an existing subscription", async () => {
    vi.mocked(SettingsModel.findOne).mockResolvedValue({ defaultCurrency: "USD" } as never);
    vi.mocked(SubscriptionModel.findOneAndUpdate).mockResolvedValue(makeSubscription({ name: "Figma" }) as never);

    const result = await updateSubscriptionForUser("user_1", "sub_1", {
      name: "Figma",
      amountMinor: 1299,
      billingCycle: "monthly",
      nextBillingDate: "2026-01-09",
      category: "productivity",
      reminderDaysBefore: [1],
      isActive: true
    });

    expect(result.name).toBe("Figma");
  });

  it("fails update for missing subscription", async () => {
    vi.mocked(SettingsModel.findOne).mockResolvedValue({ defaultCurrency: "USD" } as never);
    vi.mocked(SubscriptionModel.findOneAndUpdate).mockResolvedValue(null as never);

    await expect(
      updateSubscriptionForUser("user_1", "missing_sub", {
        name: "Figma",
        amountMinor: 1299,
        billingCycle: "monthly",
        nextBillingDate: "2026-01-09",
        category: "productivity",
        reminderDaysBefore: [1],
        isActive: true
      })
    ).rejects.toMatchObject({ status: 404, message: "Subscription not found" });
  });

  it("deletes an existing subscription", async () => {
    vi.mocked(SubscriptionModel.findOneAndDelete).mockResolvedValue(makeSubscription() as never);

    await expect(deleteSubscriptionForUser("user_1", "sub_1")).resolves.toBeUndefined();
  });

  it("fails delete for missing subscription", async () => {
    vi.mocked(SubscriptionModel.findOneAndDelete).mockResolvedValue(null as never);

    await expect(deleteSubscriptionForUser("user_1", "missing_sub")).rejects.toMatchObject({
      status: 404,
      message: "Subscription not found"
    });
  });
});
