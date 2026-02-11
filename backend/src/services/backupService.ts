import {
  appSettingsSchema,
  backupFileSchema,
  subscriptionSchema
} from "../domain/schemas.js";
import { DEFAULT_SETTINGS, type BackupFileV1 } from "../domain/types.js";
import { SettingsModel } from "../models/Settings.js";
import { SubscriptionModel } from "../models/Subscription.js";
import { toSubscription } from "../utils/serializers.js";
import { logger } from "../logger/logger.js";

export const exportBackupForUser = async (userId: string): Promise<BackupFileV1> => {
  const [settingsDoc, subscriptionsDocs] = await Promise.all([
    SettingsModel.findOne({ userId }),
    SubscriptionModel.find({ userId }).sort({ nextBillingDate: 1, name: 1 })
  ]);

  const backup: BackupFileV1 = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    settings: appSettingsSchema.parse({
      defaultCurrency: settingsDoc?.defaultCurrency ?? DEFAULT_SETTINGS.defaultCurrency,
      weekStartsOn: settingsDoc?.weekStartsOn ?? DEFAULT_SETTINGS.weekStartsOn,
      notificationsEnabled: settingsDoc?.notificationsEnabled ?? DEFAULT_SETTINGS.notificationsEnabled
    }),
    subscriptions: subscriptionsDocs.map((document) => subscriptionSchema.parse(toSubscription(document)))
  };

  logger.info("Backup exported", { userId, count: backup.subscriptions.length });

  return backup;
};

export const importBackupForUser = async (userId: string, input: unknown): Promise<void> => {
  const backup = backupFileSchema.parse(input);

  await Promise.all([
    SubscriptionModel.deleteMany({ userId }),
    SettingsModel.deleteMany({ userId })
  ]);

  await SettingsModel.create({
    userId,
    ...backup.settings
  });

  if (backup.subscriptions.length > 0) {
    await SubscriptionModel.insertMany(
      backup.subscriptions.map((subscription) => ({
        userId,
        ...subscription
      }))
    );
  }

  logger.info("Backup imported", { userId, count: backup.subscriptions.length });
};
