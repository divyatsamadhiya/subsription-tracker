import { create } from "zustand";
import { db, type SettingsRow } from "../db";
import { appSettingsSchema, subscriptionSchema } from "../lib/schemas";
import { DEFAULT_SETTINGS, type AppSettings, type BackupFileV1, type BillingCycle, type Subscription, type SubscriptionCategory } from "../types";

const SETTINGS_ID = "app" as const;

const sortSubscriptions = (subscriptions: Subscription[]): Subscription[] => {
  return [...subscriptions].sort((first, second) => {
    if (first.nextBillingDate !== second.nextBillingDate) {
      return first.nextBillingDate.localeCompare(second.nextBillingDate);
    }
    return first.name.localeCompare(second.name);
  });
};

export interface SubscriptionDraft {
  name: string;
  amountMinor: number;
  billingCycle: BillingCycle;
  customIntervalDays?: number;
  nextBillingDate: string;
  category: SubscriptionCategory;
  reminderDaysBefore: number[];
  isActive: boolean;
  notes?: string;
}

interface AppState {
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  subscriptions: Subscription[];
  settings: AppSettings;
  upcomingWindow: 7 | 30;
  setUpcomingWindow: (window: 7 | 30) => void;
  hydrate: () => Promise<void>;
  addSubscription: (draft: SubscriptionDraft) => Promise<void>;
  updateSubscription: (id: string, draft: SubscriptionDraft) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  importBackup: (backup: BackupFileV1) => Promise<void>;
}

const setSettingsRow = async (settings: AppSettings): Promise<void> => {
  await db.settings.put({ id: SETTINGS_ID, ...settings });
};

const loadSettings = async (): Promise<AppSettings> => {
  const row = await db.settings.get(SETTINGS_ID);

  if (!row) {
    await setSettingsRow(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  return appSettingsSchema.parse(row);
};

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  loading: false,
  error: null,
  subscriptions: [],
  settings: DEFAULT_SETTINGS,
  upcomingWindow: 7,
  setUpcomingWindow: (window) => set({ upcomingWindow: window }),

  hydrate: async () => {
    set({ loading: true, error: null });

    try {
      const [settings, subscriptions] = await Promise.all([
        loadSettings(),
        db.subscriptions.toArray()
      ]);

      const parsedSubscriptions = subscriptions.map((subscription) => subscriptionSchema.parse(subscription));

      set({
        settings,
        subscriptions: sortSubscriptions(parsedSubscriptions),
        hydrated: true,
        loading: false
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load app data.";
      set({ error: message, loading: false, hydrated: true });
    }
  },

  addSubscription: async (draft) => {
    const state = get();
    const now = new Date().toISOString();
    const candidate: Subscription = {
      id: crypto.randomUUID(),
      name: draft.name,
      amountMinor: draft.amountMinor,
      currency: state.settings.defaultCurrency,
      billingCycle: draft.billingCycle,
      customIntervalDays: draft.customIntervalDays,
      nextBillingDate: draft.nextBillingDate,
      category: draft.category,
      reminderDaysBefore: draft.reminderDaysBefore,
      isActive: draft.isActive,
      notes: draft.notes,
      createdAt: now,
      updatedAt: now
    };

    const subscription = subscriptionSchema.parse(candidate);
    await db.subscriptions.put(subscription);

    set((current) => ({
      subscriptions: sortSubscriptions([...current.subscriptions, subscription]),
      error: null
    }));
  },

  updateSubscription: async (id, draft) => {
    const state = get();
    const existing = state.subscriptions.find((subscription) => subscription.id === id);

    if (!existing) {
      set({ error: "Subscription not found." });
      return;
    }

    const candidate: Subscription = {
      ...existing,
      ...draft,
      id,
      currency: state.settings.defaultCurrency,
      updatedAt: new Date().toISOString()
    };

    const subscription = subscriptionSchema.parse(candidate);
    await db.subscriptions.put(subscription);

    set((current) => ({
      subscriptions: sortSubscriptions(
        current.subscriptions.map((item) => (item.id === id ? subscription : item))
      ),
      error: null
    }));
  },

  deleteSubscription: async (id) => {
    await db.subscriptions.delete(id);
    set((current) => ({
      subscriptions: current.subscriptions.filter((subscription) => subscription.id !== id),
      error: null
    }));
  },

  updateSettings: async (settingsPatch) => {
    const currentSettings = get().settings;
    const nextSettings = appSettingsSchema.parse({ ...currentSettings, ...settingsPatch });
    await setSettingsRow(nextSettings);

    set((current) => ({
      settings: nextSettings,
      subscriptions: current.subscriptions.map((subscription) => ({
        ...subscription,
        currency: nextSettings.defaultCurrency
      })),
      error: null
    }));

    await db.transaction("rw", db.subscriptions, async () => {
      await Promise.all(
        get().subscriptions.map((subscription) =>
          db.subscriptions.put({
            ...subscription,
            currency: nextSettings.defaultCurrency,
            updatedAt: new Date().toISOString()
          })
        )
      );
    });
  },

  importBackup: async (backup) => {
    await db.transaction("rw", db.subscriptions, db.settings, async () => {
      await db.subscriptions.clear();
      await db.settings.clear();
      await db.subscriptions.bulkPut(backup.subscriptions.map((subscription) => subscriptionSchema.parse(subscription)));
      const settingsRow: SettingsRow = {
        id: SETTINGS_ID,
        ...appSettingsSchema.parse(backup.settings)
      };
      await db.settings.put(settingsRow);
    });

    set({
      subscriptions: sortSubscriptions(backup.subscriptions),
      settings: backup.settings,
      error: null
    });
  }
}));
