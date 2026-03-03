import {
  adminAnalyticsSchema,
  adminSessionSchema,
  adminUserDetailSchema,
  adminUserListSchema,
  authResponseSchema
} from "./schemas";
import type {
  AdminOverviewAnalytics,
  AdminSession,
  AdminUserDetail,
  AdminUserListResponse,
  AuthUser
} from "../types";

export class ApiError extends Error {
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
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(data?.error ?? "Request failed", response.status);
  }
};

const toQueryString = (params: Record<string, string | number | undefined>): string => {
  const urlParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") {
      return;
    }

    urlParams.set(key, String(value));
  });

  const query = urlParams.toString();
  return query.length > 0 ? `?${query}` : "";
};

export const api = {
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

  async logout(): Promise<void> {
    await requestNoContent("/api/v1/auth/logout", { method: "POST" });
  },

  async getAdminSession(): Promise<AdminSession> {
    return requestJson(
      "/api/v1/admin/session",
      { method: "GET" },
      (payload) => adminSessionSchema.parse(payload)
    );
  },

  async listUsers(input: {
    search?: string;
    status?: "active" | "deleted" | "all";
    page?: number;
    pageSize?: number;
  }): Promise<AdminUserListResponse> {
    return requestJson(
      `/api/v1/admin/users${toQueryString(input)}`,
      { method: "GET" },
      (payload) => adminUserListSchema.parse(payload)
    );
  },

  async getUser(userId: string): Promise<AdminUserDetail> {
    const parsed = await requestJson(
      `/api/v1/admin/users/${userId}`,
      { method: "GET" },
      (payload) => {
        const row = payload as { user: unknown };
        return {
          user: adminUserDetailSchema.parse(row.user)
        };
      }
    );

    return parsed.user;
  },

  async softDeleteUser(userId: string, reason: string): Promise<void> {
    await requestNoContent(`/api/v1/admin/users/${userId}/delete`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });
  },

  async restoreUser(userId: string, reason: string): Promise<void> {
    await requestNoContent(`/api/v1/admin/users/${userId}/restore`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });
  },

  async forceLogoutUser(userId: string, reason: string): Promise<void> {
    await requestNoContent(`/api/v1/admin/users/${userId}/force-logout`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });
  },

  async getAnalyticsOverview(): Promise<AdminOverviewAnalytics> {
    return requestJson(
      "/api/v1/admin/analytics/overview",
      { method: "GET" },
      (payload) => {
        const row = payload as { analytics: unknown };
        return adminAnalyticsSchema.parse(row.analytics);
      }
    );
  }
};
