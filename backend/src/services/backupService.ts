import {
  appSettingsSchema,
  backupFileSchema,
  subscriptionSchema
} from "../domain/schemas.js";
import { DEFAULT_SETTINGS, type BackupFileV1 } from "../domain/types.js";
import { prisma } from "../prisma.js";
import { toSubscription } from "../utils/serializers.js";
import { logger } from "../logger/logger.js";

export const exportBackupForUser = async (userId: string): Promise<BackupFileV1> => {
  const [settingsDoc, subscriptionsDocs] = await Promise.all([
    prisma.settings.findUnique({ where: { userId } }),
    prisma.subscription.findMany({
      where: { userId },
      orderBy: [{ nextBillingDate: "asc" }, { name: "asc" }],
      include: { priceChanges: { orderBy: { effectiveDate: "asc" } } }
    })
  ]);

  const backup: BackupFileV1 = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    settings: appSettingsSchema.parse({
      defaultCurrency: settingsDoc?.defaultCurrency ?? DEFAULT_SETTINGS.defaultCurrency,
      weekStartsOn: settingsDoc?.weekStartsOn ?? DEFAULT_SETTINGS.weekStartsOn,
      notificationsEnabled: settingsDoc?.notificationsEnabled ?? DEFAULT_SETTINGS.notificationsEnabled,
      themePreference: settingsDoc?.themePreference ?? DEFAULT_SETTINGS.themePreference
    }),
    subscriptions: subscriptionsDocs.map((document) => subscriptionSchema.parse(toSubscription(document)))
  };

  logger.info("Backup exported", { userId, count: backup.subscriptions.length });

  return backup;
};

export const importBackupForUser = async (userId: string, input: unknown): Promise<void> => {
  const normalizedInput = (() => {
    if (typeof input !== "object" || input === null) {
      return input;
    }

    const inputRecord = input as Record<string, unknown>;
    const settingsRaw = inputRecord.settings;
    if (typeof settingsRaw !== "object" || settingsRaw === null) {
      return input;
    }

    const settingsRecord = settingsRaw as Record<string, unknown>;
    return {
      ...inputRecord,
      settings: {
        ...settingsRecord,
        themePreference: settingsRecord.themePreference ?? DEFAULT_SETTINGS.themePreference
      }
    };
  })();
  const backup = backupFileSchema.parse(normalizedInput);

  await Promise.all([
    prisma.subscription.deleteMany({ where: { userId } }),
    prisma.settings.deleteMany({ where: { userId } })
  ]);

  await prisma.settings.create({
    data: {
      userId,
      ...backup.settings
    }
  });

  if (backup.subscriptions.length > 0) {
    for (const subscription of backup.subscriptions) {
      const { priceHistory, ...subscriptionData } = subscription;
      await prisma.subscription.create({
        data: {
          userId,
          ...subscriptionData,
          priceChanges: {
            create: priceHistory.map((ph) => ({
              amountMinor: ph.amountMinor,
              currency: ph.currency,
              billingCycle: ph.billingCycle,
              customIntervalDays: ph.customIntervalDays,
              effectiveDate: ph.effectiveDate,
            }))
          }
        }
      });
    }
  }

  logger.info("Backup imported", { userId, count: backup.subscriptions.length });
};
