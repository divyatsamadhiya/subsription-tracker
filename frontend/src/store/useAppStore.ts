import { create } from "zustand";
import { ApiError, api } from "../lib/api";
import { DEFAULT_SETTINGS, type AppSettings, type AuthUser, type BackupFileV1, type BillingCycle, type Subscription, type SubscriptionCategory } from "../types";

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
  user: AuthUser | null;
  subscriptions: Subscription[];
  settings: AppSettings;
  upcomingWindow: 7 | 30;
  setUpcomingWindow: (window: 7 | 30) => void;
  hydrate: () => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  addSubscription: (draft: SubscriptionDraft) => Promise<void>;
  updateSubscription: (id: string, draft: SubscriptionDraft) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  exportBackup: () => Promise<BackupFileV1>;
  importBackup: (backup: BackupFileV1) => Promise<void>;
}

const userMessage = (error: unknown, fallback: string): string => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

const loadDashboardState = async (): Promise<{
  settings: AppSettings;
  subscriptions: Subscription[];
}> => {
  const [settings, subscriptions] = await Promise.all([
    api.getSettings(),
    api.listSubscriptions()
  ]);

  return {
    settings,
    subscriptions: sortSubscriptions(subscriptions)
  };
};

export const useAppStore = create<AppState>((set) => ({
  hydrated: false,
  loading: false,
  error: null,
  user: null,
  subscriptions: [],
  settings: DEFAULT_SETTINGS,
  upcomingWindow: 7,

  setUpcomingWindow: (window) => set({ upcomingWindow: window }),

  hydrate: async () => {
    set({ loading: true, error: null });

    try {
      const user = await api.me();
      const dashboard = await loadDashboardState();

      set({
        user,
        settings: dashboard.settings,
        subscriptions: dashboard.subscriptions,
        hydrated: true,
        loading: false,
        error: null
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        set({
          user: null,
          subscriptions: [],
          settings: DEFAULT_SETTINGS,
          hydrated: true,
          loading: false,
          error: null
        });
        return;
      }

      set({
        user: null,
        subscriptions: [],
        settings: DEFAULT_SETTINGS,
        hydrated: true,
        loading: false,
        error: userMessage(error, "Failed to load account data.")
      });
    }
  },

  register: async (email, password) => {
    set({ loading: true, error: null });

    try {
      const user = await api.register(email, password);
      const dashboard = await loadDashboardState();

      set({
        user,
        settings: dashboard.settings,
        subscriptions: dashboard.subscriptions,
        loading: false,
        error: null,
        hydrated: true
      });
    } catch (error) {
      set({
        loading: false,
        error: userMessage(error, "Registration failed.")
      });
      throw error;
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });

    try {
      const user = await api.login(email, password);
      const dashboard = await loadDashboardState();

      set({
        user,
        settings: dashboard.settings,
        subscriptions: dashboard.subscriptions,
        loading: false,
        error: null,
        hydrated: true
      });
    } catch (error) {
      set({
        loading: false,
        error: userMessage(error, "Login failed.")
      });
      throw error;
    }
  },

  logout: async () => {
    set({ loading: true, error: null });

    try {
      await api.logout();
      set({
        user: null,
        subscriptions: [],
        settings: DEFAULT_SETTINGS,
        loading: false,
        error: null
      });
    } catch (error) {
      set({
        loading: false,
        error: userMessage(error, "Logout failed.")
      });
      throw error;
    }
  },

  addSubscription: async (draft) => {
    try {
      const subscription = await api.createSubscription(draft);

      set((current) => ({
        subscriptions: sortSubscriptions([...current.subscriptions, subscription]),
        error: null
      }));
    } catch (error) {
      set({ error: userMessage(error, "Failed to create subscription.") });
      throw error;
    }
  },

  updateSubscription: async (id, draft) => {
    try {
      const subscription = await api.updateSubscription(id, draft);

      set((current) => ({
        subscriptions: sortSubscriptions(
          current.subscriptions.map((item) => (item.id === id ? subscription : item))
        ),
        error: null
      }));
    } catch (error) {
      set({ error: userMessage(error, "Failed to update subscription.") });
      throw error;
    }
  },

  deleteSubscription: async (id) => {
    try {
      await api.deleteSubscription(id);

      set((current) => ({
        subscriptions: current.subscriptions.filter((subscription) => subscription.id !== id),
        error: null
      }));
    } catch (error) {
      set({ error: userMessage(error, "Failed to delete subscription.") });
      throw error;
    }
  },

  updateSettings: async (settingsPatch) => {
    try {
      const settings = await api.updateSettings(settingsPatch);

      set((current) => ({
        settings,
        subscriptions: current.subscriptions.map((subscription) => ({
          ...subscription,
          currency: settings.defaultCurrency
        })),
        error: null
      }));
    } catch (error) {
      set({ error: userMessage(error, "Failed to update settings.") });
      throw error;
    }
  },

  exportBackup: async () => {
    try {
      return await api.exportBackup();
    } catch (error) {
      set({ error: userMessage(error, "Failed to export backup.") });
      throw error;
    }
  },

  importBackup: async (backup) => {
    try {
      await api.importBackup(backup);
      const dashboard = await loadDashboardState();

      set({
        subscriptions: dashboard.subscriptions,
        settings: dashboard.settings,
        error: null
      });
    } catch (error) {
      set({ error: userMessage(error, "Failed to import backup.") });
      throw error;
    }
  }
}));
