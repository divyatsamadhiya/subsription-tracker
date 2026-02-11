import {
  appSettingsSchema,
  authResponseSchema,
  backupFileSchema,
  forgotPasswordResponseSchema,
  subscriptionInputSchema,
  subscriptionSchema
} from "./schemas";
import type {
  AppSettings,
  AuthUser,
  BackupFileV1,
  ForgotPasswordResponse,
  Subscription,
  SubscriptionInput
} from "../types";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const requestJson = async <T>(
  path: string,
  options: RequestInit,
  parser: (value: unknown) => T
): Promise<T> => {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    },
    credentials: "include"
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(data?.error ?? "Request failed", response.status);
  }

  if (response.status === 204) {
    return parser(undefined);
  }

  const data: unknown = await response.json();
  return parser(data);
};

const requestNoContent = async (path: string, options: RequestInit): Promise<void> => {
  const response = await fetch(path, {
    ...options,
    credentials: "include"
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(data?.error ?? "Request failed", response.status);
  }
};

export const api = {
  async register(email: string, password: string): Promise<AuthUser> {
    const parsed = await requestJson(
      "/api/v1/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ email, password })
      },
      (payload) => authResponseSchema.parse(payload)
    );

    return parsed.user;
  },

  async login(email: string, password: string): Promise<AuthUser> {
    const parsed = await requestJson(
      "/api/v1/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password })
      },
      (payload) => authResponseSchema.parse(payload)
    );

    return parsed.user;
  },

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    return requestJson(
      "/api/v1/auth/forgot-password",
      {
        method: "POST",
        body: JSON.stringify({ email })
      },
      (payload) => forgotPasswordResponseSchema.parse(payload)
    );
  },

  async resetPassword(email: string, resetToken: string, newPassword: string): Promise<void> {
    await requestNoContent("/api/v1/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, resetToken, newPassword })
    });
  },

  async logout(): Promise<void> {
    await requestNoContent("/api/v1/auth/logout", { method: "POST" });
  },

  async me(): Promise<AuthUser> {
    const parsed = await requestJson(
      "/api/v1/auth/me",
      { method: "GET" },
      (payload) => authResponseSchema.parse(payload)
    );

    return parsed.user;
  },

  async listSubscriptions(): Promise<Subscription[]> {
    return requestJson(
      "/api/v1/subscriptions",
      { method: "GET" },
      (payload) => {
        const row = payload as { subscriptions: unknown[] };
        return row.subscriptions.map((item) => subscriptionSchema.parse(item));
      }
    );
  },

  async createSubscription(input: SubscriptionInput): Promise<Subscription> {
    const body = subscriptionInputSchema.parse(input);
    return requestJson(
      "/api/v1/subscriptions",
      {
        method: "POST",
        body: JSON.stringify(body)
      },
      (payload) => {
        const row = payload as { subscription: unknown };
        return subscriptionSchema.parse(row.subscription);
      }
    );
  },

  async updateSubscription(id: string, input: SubscriptionInput): Promise<Subscription> {
    const body = subscriptionInputSchema.parse(input);
    return requestJson(
      `/api/v1/subscriptions/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(body)
      },
      (payload) => {
        const row = payload as { subscription: unknown };
        return subscriptionSchema.parse(row.subscription);
      }
    );
  },

  async deleteSubscription(id: string): Promise<void> {
    await requestNoContent(`/api/v1/subscriptions/${id}`, { method: "DELETE" });
  },

  async getSettings(): Promise<AppSettings> {
    return requestJson(
      "/api/v1/settings",
      { method: "GET" },
      (payload) => {
        const row = payload as { settings: unknown };
        return appSettingsSchema.parse(row.settings);
      }
    );
  },

  async updateSettings(input: Partial<AppSettings>): Promise<AppSettings> {
    return requestJson(
      "/api/v1/settings",
      {
        method: "PATCH",
        body: JSON.stringify(input)
      },
      (payload) => {
        const row = payload as { settings: unknown };
        return appSettingsSchema.parse(row.settings);
      }
    );
  },

  async exportBackup(): Promise<BackupFileV1> {
    return requestJson(
      "/api/v1/backup/export",
      { method: "GET" },
      (payload) => backupFileSchema.parse(payload)
    );
  },

  async importBackup(backup: BackupFileV1): Promise<void> {
    await requestNoContent("/api/v1/backup/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(backupFileSchema.parse(backup))
    });
  }
};

export { ApiError };
