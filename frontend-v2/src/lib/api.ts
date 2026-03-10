import type { AuthUser, Subscription, AppSettings, UserProfile } from "./types";

const BASE = "/api/v1";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  me: () => request<AuthUser>("/auth/me"),
  logout: () => request<void>("/auth/logout", { method: "POST" }),

  getProfile: () => request<UserProfile>("/profile"),
  updateProfile: (patch: Partial<UserProfile>) =>
    request<UserProfile>("/profile", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  getSettings: () => request<AppSettings>("/settings"),
  updateSettings: (patch: Partial<AppSettings>) =>
    request<AppSettings>("/settings", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  getSubscriptions: () => request<Subscription[]>("/subscriptions"),
  createSubscription: (data: Omit<Subscription, "id" | "createdAt" | "updatedAt">) =>
    request<Subscription>("/subscriptions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateSubscription: (id: string, data: Partial<Subscription>) =>
    request<Subscription>(`/subscriptions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteSubscription: (id: string) =>
    request<void>(`/subscriptions/${id}`, { method: "DELETE" }),
};
