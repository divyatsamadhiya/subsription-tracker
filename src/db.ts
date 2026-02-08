import Dexie, { type Table } from "dexie";
import type { AppSettings, Subscription } from "./types";

export interface SettingsRow extends AppSettings {
  id: "app";
}

class PulseboardDb extends Dexie {
  subscriptions!: Table<Subscription, string>;
  settings!: Table<SettingsRow, "app">;

  constructor() {
    super("pulseboard-db");

    this.version(1).stores({
      subscriptions: "id, nextBillingDate, isActive, updatedAt",
      settings: "id"
    });
  }
}

export const db = new PulseboardDb();
