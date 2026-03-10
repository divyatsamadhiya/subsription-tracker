"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "./api";
import type { AuthUser, Subscription, AppSettings } from "./types";
import { DEFAULT_SETTINGS } from "./types";

interface DashboardState {
  user: AuthUser | null;
  subscriptions: Subscription[];
  settings: AppSettings;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const DashboardContext = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [me, subs, prefs] = await Promise.all([
        api.me(),
        api.getSubscriptions(),
        api.getSettings(),
      ]);
      setUser(me);
      setSubscriptions(
        subs.sort((a, b) =>
          a.nextBillingDate.localeCompare(b.nextBillingDate) ||
          a.name.localeCompare(b.name)
        )
      );
      setSettings(prefs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    window.location.href = "/login";
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <DashboardContext.Provider
      value={{ user, subscriptions, settings, loading, error, refresh, logout }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
