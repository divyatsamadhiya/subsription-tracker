export type BillingCycle = "weekly" | "monthly" | "yearly" | "custom_days";

export type SubscriptionCategory =
  | "entertainment"
  | "productivity"
  | "utilities"
  | "health"
  | "other";

export interface Subscription {
  id: string;
  name: string;
  amountMinor: number;
  currency: string;
  billingCycle: BillingCycle;
  customIntervalDays?: number;
  nextBillingDate: string;
  category: SubscriptionCategory;
  reminderDaysBefore: number[];
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  defaultCurrency: string;
  weekStartsOn: 0 | 1;
  notificationsEnabled: boolean;
  themePreference: ThemePreference;
}

export type ThemePreference = "system" | "light" | "dark";

export interface BackupFileV1 {
  version: "1.0";
  exportedAt: string;
  settings: AppSettings;
  subscriptions: Subscription[];
}

export interface AuthUser {
  id: string;
  email: string;
  profile: UserProfile;
  profileComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  fullName?: string;
  country?: string;
  timeZone?: string;
  phone?: string;
  bio?: string;
}

export interface UserProfilePatch {
  fullName?: string;
  country?: string;
  timeZone?: string | null;
  phone?: string | null;
  bio?: string | null;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface SubscriptionInput {
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

export const CATEGORY_OPTIONS = [
  "entertainment",
  "productivity",
  "utilities",
  "health",
  "other"
] as const;

export const BILLING_CYCLE_OPTIONS = [
  "weekly",
  "monthly",
  "yearly",
  "custom_days"
] as const;

export const DEFAULT_REMINDER_DAYS = [1, 3, 7];

export const DEFAULT_SETTINGS: AppSettings = {
  defaultCurrency: "USD",
  weekStartsOn: 0,
  notificationsEnabled: false,
  themePreference: "system"
};
