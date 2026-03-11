"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "./api";
import { useTheme } from "./theme-provider";
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
  const { setTheme } = useTheme();
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const [me, subs, prefs] = await Promise.all([
        api.me(),
        api.getSubscriptions(),
        api.getSettings(),
      ]);
      // Guard against state updates after unmount
      if (!mountedRef.current) return;
      setUser(me);
      setSubscriptions(
        subs.sort((a, b) =>
          a.nextBillingDate.localeCompare(b.nextBillingDate) ||
          a.name.localeCompare(b.name)
        )
      );
      setSettings(prefs);
      setTheme(prefs.themePreference);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [setTheme]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Ignore logout errors — redirect anyway
    }
    window.location.href = "/login";
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => {
      mountedRef.current = false;
    };
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
