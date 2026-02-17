import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../models/Settings.js", () => ({
  SettingsModel: {
    findOne: vi.fn(),
    create: vi.fn(),
    findOneAndUpdate: vi.fn()
  }
}));

vi.mock("../models/Subscription.js", () => ({
  SubscriptionModel: {
    updateMany: vi.fn()
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
import { getSettingsForUser, updateSettingsForUser } from "./settingsService.js";

const makeSettings = (overrides?: Partial<Record<string, unknown>>) => ({
  defaultCurrency: "USD",
  weekStartsOn: 0,
  notificationsEnabled: false,
  themePreference: "system",
  ...overrides
});

describe("settingsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing settings", async () => {
    vi.mocked(SettingsModel.findOne).mockResolvedValue(makeSettings() as never);

    const settings = await getSettingsForUser("user_1");

    expect(settings.defaultCurrency).toBe("USD");
    expect(settings.themePreference).toBe("system");
    expect(SettingsModel.create).not.toHaveBeenCalled();
  });

  it("creates defaults when settings do not exist", async () => {
    vi.mocked(SettingsModel.findOne).mockResolvedValue(null as never);
    vi.mocked(SettingsModel.create).mockResolvedValue(makeSettings() as never);

    const settings = await getSettingsForUser("user_1");

    expect(SettingsModel.create).toHaveBeenCalled();
    expect(settings.defaultCurrency).toBe("USD");
    expect(settings.themePreference).toBe("system");
  });

  it("updates settings and propagates currency change", async () => {
    vi.mocked(SettingsModel.findOne).mockResolvedValue(makeSettings({ defaultCurrency: "USD" }) as never);
    vi.mocked(SettingsModel.findOneAndUpdate).mockResolvedValue(makeSettings({ defaultCurrency: "INR" }) as never);
    vi.mocked(SubscriptionModel.updateMany).mockResolvedValue({ acknowledged: true } as never);

    const settings = await updateSettingsForUser("user_1", { defaultCurrency: "INR" });

    expect(SettingsModel.findOneAndUpdate).toHaveBeenCalled();
    expect(SubscriptionModel.updateMany).toHaveBeenCalledWith(
      { userId: "user_1" },
      { $set: { currency: "INR" } }
    );
    expect(settings.defaultCurrency).toBe("INR");
  });

  it("updates settings without currency propagation when currency is unchanged", async () => {
    vi.mocked(SettingsModel.findOne).mockResolvedValue(makeSettings({ defaultCurrency: "USD" }) as never);
    vi.mocked(SettingsModel.findOneAndUpdate).mockResolvedValue(
      makeSettings({ notificationsEnabled: true, themePreference: "dark" }) as never
    );

    const settings = await updateSettingsForUser("user_1", { notificationsEnabled: true });

    expect(SubscriptionModel.updateMany).not.toHaveBeenCalled();
    expect(settings.notificationsEnabled).toBe(true);
  });

  it("updates theme preference", async () => {
    vi.mocked(SettingsModel.findOne).mockResolvedValue(makeSettings() as never);
    vi.mocked(SettingsModel.findOneAndUpdate).mockResolvedValue(
      makeSettings({ themePreference: "dark" }) as never
    );

    const settings = await updateSettingsForUser("user_1", { themePreference: "dark" });

    expect(settings.themePreference).toBe("dark");
    expect(SubscriptionModel.updateMany).not.toHaveBeenCalled();
  });

  it("rejects empty settings patch", async () => {
    await expect(updateSettingsForUser("user_1", {})).rejects.toBeDefined();
  });
});
