import { appSettingsSchema, updateSettingsSchema } from "../domain/schemas.js";
import { DEFAULT_SETTINGS, type AppSettings } from "../domain/types.js";
import { SettingsModel } from "../models/Settings.js";
import { SubscriptionModel } from "../models/Subscription.js";
import { logger } from "../logger/logger.js";

const ensureSettings = async (userId: string): Promise<AppSettings> => {
  const existing = await SettingsModel.findOne({ userId });

  if (existing) {
    return appSettingsSchema.parse({
      defaultCurrency: existing.defaultCurrency,
      weekStartsOn: existing.weekStartsOn,
      notificationsEnabled: existing.notificationsEnabled
    });
  }

  const created = await SettingsModel.create({
    userId,
    ...DEFAULT_SETTINGS
  });

  logger.info("Default settings created", { userId });

  return appSettingsSchema.parse({
    defaultCurrency: created.defaultCurrency,
    weekStartsOn: created.weekStartsOn,
    notificationsEnabled: created.notificationsEnabled
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

  const updatedDoc = await SettingsModel.findOneAndUpdate(
    { userId },
    { ...patch },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );

  if (patch.defaultCurrency && patch.defaultCurrency !== previous.defaultCurrency) {
    await SubscriptionModel.updateMany({ userId }, { $set: { currency: patch.defaultCurrency } });
    logger.info("Subscription currency updated from settings change", {
      userId,
      currency: patch.defaultCurrency
    });
  }

  const settings = appSettingsSchema.parse({
    defaultCurrency: updatedDoc.defaultCurrency,
    weekStartsOn: updatedDoc.weekStartsOn,
    notificationsEnabled: updatedDoc.notificationsEnabled
  });

  logger.info("Settings updated", { userId });

  return settings;
};
