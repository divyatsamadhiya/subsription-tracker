import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "../generated/prisma/client.js";

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
  createSubscriptionForUser,
  deleteSubscriptionForUser,
  listSubscriptionsForUser,
  updateSubscriptionForUser
} from "./subscriptionService.js";

const makeSubscription = (overrides?: Partial<Record<string, unknown>>) => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    pk: "pk_1",
    id: "sub_1",
    userId: "user_1",
    name: "Netflix",
    amountMinor: 999,
    currency: "USD",
    billingCycle: "monthly",
    nextBillingDate: "2026-01-08",
    category: "entertainment",
    reminderDaysBefore: [1, 3, 7],
    isActive: true,
    notes: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
};

const makeP2025Error = () =>
  new Prisma.PrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    clientVersion: "0.0.0"
  });

describe("subscriptionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists subscriptions for a user", async () => {
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([makeSubscription()] as never);

    const subscriptions = await listSubscriptionsForUser("user_1");

    expect(prisma.subscription.findMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      orderBy: [{ nextBillingDate: "asc" }, { name: "asc" }]
    });
    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0].id).toBe("sub_1");
  });

  it("creates a subscription using account currency", async () => {
    vi.mocked(prisma.settings.findUnique).mockResolvedValue({ defaultCurrency: "INR" } as never);
    vi.mocked(prisma.subscription.create).mockResolvedValue(makeSubscription({ currency: "INR" }) as never);

    const result = await createSubscriptionForUser("user_1", {
      name: "Netflix",
      amountMinor: 999,
      billingCycle: "monthly",
      nextBillingDate: "2026-01-08",
      category: "entertainment",
      reminderDaysBefore: [1, 3],
      isActive: true
    });

    expect(prisma.settings.findUnique).toHaveBeenCalledWith({ where: { userId: "user_1" } });
    expect(result.currency).toBe("INR");
  });

  it("falls back to USD when settings are missing", async () => {
    vi.mocked(prisma.settings.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.subscription.create).mockResolvedValue(makeSubscription({ currency: "USD" }) as never);

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
    vi.mocked(prisma.settings.findUnique).mockResolvedValue({ defaultCurrency: "USD" } as never);
    vi.mocked(prisma.subscription.update).mockResolvedValue(makeSubscription({ name: "Figma" }) as never);

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
    vi.mocked(prisma.settings.findUnique).mockResolvedValue({ defaultCurrency: "USD" } as never);
    vi.mocked(prisma.subscription.update).mockRejectedValue(makeP2025Error());

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
    vi.mocked(prisma.subscription.delete).mockResolvedValue(makeSubscription() as never);

    await expect(deleteSubscriptionForUser("user_1", "sub_1")).resolves.toBeUndefined();
  });

  it("fails delete for missing subscription", async () => {
    vi.mocked(prisma.subscription.delete).mockRejectedValue(makeP2025Error());

    await expect(deleteSubscriptionForUser("user_1", "missing_sub")).rejects.toMatchObject({
      status: 404,
      message: "Subscription not found"
    });
  });
});
