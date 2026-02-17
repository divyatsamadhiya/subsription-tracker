import { backupFileSchema } from "./schemas";
import { DEFAULT_SETTINGS, type AppSettings, type BackupFileV1, type Subscription } from "../types";

export const createBackup = (
  settings: AppSettings,
  subscriptions: Subscription[]
): BackupFileV1 => {
  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    settings,
    subscriptions
  };
};

export const serializeBackup = (backup: BackupFileV1): string => {
  return JSON.stringify(backup, null, 2);
};

export const parseBackupJson = (input: string): BackupFileV1 => {
  const parsedJson: unknown = JSON.parse(input);
  if (typeof parsedJson === "object" && parsedJson !== null) {
    const record = parsedJson as Record<string, unknown>;
    if (typeof record.settings === "object" && record.settings !== null) {
      const settings = record.settings as Record<string, unknown>;
      return backupFileSchema.parse({
        ...record,
        settings: {
          ...settings,
          themePreference: settings.themePreference ?? DEFAULT_SETTINGS.themePreference
        }
      });
    }
  }

  return backupFileSchema.parse(parsedJson);
};

export const backupFilename = (): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `pulseboard-backup-${timestamp}.json`;
};
