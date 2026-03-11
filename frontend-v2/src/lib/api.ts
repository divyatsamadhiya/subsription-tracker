import type { AuthUser, Subscription, SubscriptionInput, AppSettings, UserProfile } from "./types";

const BASE = "/api/v1";
const TIMEOUT_MS = 15_000;

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE}${path}`, {
      credentials: "include",
      ...options,
      signal: controller.signal,
      headers: {
        ...(options?.body ? { "Content-Type": "application/json" } : {}),
        ...options?.headers,
      },
    });

    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try {
        const body = await res.json();
        if (body.error) message = body.error;
      } catch {
        // Response wasn't valid JSON — use status-based message
      }
      throw new Error(message);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  me: () => request<{ user: AuthUser }>("/auth/me").then((r) => r.user),
  logout: () => request<void>("/auth/logout", { method: "POST" }),

  getProfile: () => request<UserProfile>("/profile"),
  updateProfile: (patch: Partial<UserProfile>) =>
    request<UserProfile>("/profile", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  getSettings: () =>
    request<{ settings: AppSettings }>("/settings").then((r) => r.settings),
  updateSettings: (patch: Partial<AppSettings>) =>
    request<{ settings: AppSettings }>("/settings", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }).then((r) => r.settings),

  getSubscriptions: () =>
    request<{ subscriptions: Subscription[] }>("/subscriptions").then((r) => r.subscriptions),
  createSubscription: (data: SubscriptionInput) =>
    request<{ subscription: Subscription }>("/subscriptions", {
      method: "POST",
      body: JSON.stringify(data),
    }).then((r) => r.subscription),
  updateSubscription: (id: string, data: SubscriptionInput) =>
    request<{ subscription: Subscription }>(`/subscriptions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }).then((r) => r.subscription),
  deleteSubscription: (id: string) =>
    request<void>(`/subscriptions/${id}`, { method: "DELETE" }),
};
