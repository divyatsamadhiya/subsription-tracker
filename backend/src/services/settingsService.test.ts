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
import { getSettingsForUser, updateSettingsForUser } from "./settingsService.js";

const makeSettings = (overrides?: Partial<Record<string, unknown>>) => ({
  id: "settings_1",
  userId: "user_1",
  defaultCurrency: "USD",
  weekStartsOn: 0,
  notificationsEnabled: false,
  themePreference: "system",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides
});

describe("settingsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing settings", async () => {
    vi.mocked(prisma.settings.findUnique).mockResolvedValue(makeSettings() as never);

    const settings = await getSettingsForUser("user_1");

    expect(settings.defaultCurrency).toBe("USD");
    expect(settings.themePreference).toBe("system");
    expect(prisma.settings.create).not.toHaveBeenCalled();
  });

  it("creates defaults when settings do not exist", async () => {
    vi.mocked(prisma.settings.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.settings.create).mockResolvedValue(makeSettings() as never);

    const settings = await getSettingsForUser("user_1");

    expect(prisma.settings.create).toHaveBeenCalled();
    expect(settings.defaultCurrency).toBe("USD");
    expect(settings.themePreference).toBe("system");
  });

  it("updates settings and propagates currency change", async () => {
    vi.mocked(prisma.settings.findUnique).mockResolvedValue(makeSettings({ defaultCurrency: "USD" }) as never);
    vi.mocked(prisma.settings.upsert).mockResolvedValue(makeSettings({ defaultCurrency: "INR" }) as never);
    vi.mocked(prisma.subscription.updateMany).mockResolvedValue({ count: 2 } as never);

    const settings = await updateSettingsForUser("user_1", { defaultCurrency: "INR" });

    expect(prisma.settings.upsert).toHaveBeenCalled();
    expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      data: { currency: "INR" }
    });
    expect(settings.defaultCurrency).toBe("INR");
  });

  it("updates settings without currency propagation when currency is unchanged", async () => {
    vi.mocked(prisma.settings.findUnique).mockResolvedValue(makeSettings({ defaultCurrency: "USD" }) as never);
    vi.mocked(prisma.settings.upsert).mockResolvedValue(
      makeSettings({ notificationsEnabled: true, themePreference: "dark" }) as never
    );

    const settings = await updateSettingsForUser("user_1", { notificationsEnabled: true });

    expect(prisma.subscription.updateMany).not.toHaveBeenCalled();
    expect(settings.notificationsEnabled).toBe(true);
  });

  it("updates theme preference", async () => {
    vi.mocked(prisma.settings.findUnique).mockResolvedValue(makeSettings() as never);
    vi.mocked(prisma.settings.upsert).mockResolvedValue(
      makeSettings({ themePreference: "dark" }) as never
    );

    const settings = await updateSettingsForUser("user_1", { themePreference: "dark" });

    expect(settings.themePreference).toBe("dark");
    expect(prisma.subscription.updateMany).not.toHaveBeenCalled();
  });

  it("rejects empty settings patch", async () => {
    await expect(updateSettingsForUser("user_1", {})).rejects.toBeDefined();
  });
});
