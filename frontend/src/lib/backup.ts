import { backupFileSchema } from "./schemas";
import type { AppSettings, BackupFileV1, Subscription } from "../types";

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
  return backupFileSchema.parse(parsedJson);
};

export const backupFilename = (): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `pulseboard-backup-${timestamp}.json`;
};
