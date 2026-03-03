export type UserRole = "user" | "admin";

export interface UserProfile {
  fullName?: string;
  country?: string;
  timeZone?: string;
  phone?: string;
  bio?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  profile: UserProfile;
  profileComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSession {
  user: AuthUser;
}

export type AdminUserStatus = "active" | "deleted";

export interface AdminUserListItem {
  id: string;
  email: string;
  role: UserRole;
  status: AdminUserStatus;
  fullName?: string;
  country?: string;
  createdAt: string;
  deletedAt?: string;
  subscriptionCount: number;
  activeSubscriptionCount: number;
}

export interface AdminUserListResponse {
  users: AdminUserListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CurrencySpend {
  currency: string;
  amountMinor: number;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  role: UserRole;
  status: AdminUserStatus;
  profile: UserProfile;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  deletedByAdminId?: string;
  deleteReason?: string;
  subscriptionSummary: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    monthlySpendByCurrency: CurrencySpend[];
  };
}

export interface AdminOverviewAnalytics {
  users: {
    active: number;
    deleted: number;
    newLast30Days: number;
  };
  subscriptions: {
    activeTotal: number;
    totalByCategory: {
      entertainment: number;
      productivity: number;
      utilities: number;
      health: number;
      other: number;
    };
  };
  monthlySpendByCurrency: CurrencySpend[];
  signupTrend: Array<{
    date: string;
    count: number;
  }>;
}
