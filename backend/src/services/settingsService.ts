import { appSettingsSchema, updateSettingsSchema } from "../domain/schemas.js";
import { DEFAULT_SETTINGS, type AppSettings } from "../domain/types.js";
import { prisma } from "../prisma.js";
import { logger } from "../logger/logger.js";

const ensureSettings = async (userId: string): Promise<AppSettings> => {
  const existing = await prisma.settings.findUnique({ where: { userId } });

  if (existing) {
    return appSettingsSchema.parse({
      defaultCurrency: existing.defaultCurrency,
      weekStartsOn: existing.weekStartsOn,
      notificationsEnabled: existing.notificationsEnabled,
      themePreference: existing.themePreference ?? DEFAULT_SETTINGS.themePreference
    });
  }

  const created = await prisma.settings.create({
    data: {
      userId,
      ...DEFAULT_SETTINGS
    }
  });

  logger.info("Default settings created", { userId });

  return appSettingsSchema.parse({
    defaultCurrency: created.defaultCurrency,
    weekStartsOn: created.weekStartsOn,
    notificationsEnabled: created.notificationsEnabled,
    themePreference: created.themePreference
  });
};

export const getSettingsForUser = async (userId: string): Promise<AppSettings> => {
  const settings = await ensureSettings(userId);
  logger.info("Settings fetched", { userId });
  return settings;
};

export const updateSettingsForUser = async (
  userId: string,
  patchInput: unknown
): Promise<AppSettings> => {
  const patch = updateSettingsSchema.parse(patchInput);
  const previous = await ensureSettings(userId);

  const updatedDoc = await prisma.settings.upsert({
    where: { userId },
    update: { ...patch },
    create: { userId, ...DEFAULT_SETTINGS, ...patch }
  });

  if (patch.defaultCurrency && patch.defaultCurrency !== previous.defaultCurrency) {
    await prisma.subscription.updateMany({
      where: { userId },
      data: { currency: patch.defaultCurrency }
    });
    logger.info("Subscription currency updated from settings change", {
      userId,
      currency: patch.defaultCurrency
    });
  }

  const settings = appSettingsSchema.parse({
    defaultCurrency: updatedDoc.defaultCurrency,
    weekStartsOn: updatedDoc.weekStartsOn,
    notificationsEnabled: updatedDoc.notificationsEnabled,
    themePreference: updatedDoc.themePreference ?? DEFAULT_SETTINGS.themePreference
  });

  logger.info("Settings updated", { userId });

  return settings;
};
