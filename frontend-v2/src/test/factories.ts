import type { Subscription, AppSettings, AuthUser, UserProfile } from "@/lib/types";

let counter = 0;

export function buildSubscription(
  overrides: Partial<Subscription> = {}
): Subscription {
  counter++;
  return {
    id: `sub-${counter}`,
    name: `Test Sub ${counter}`,
    amountMinor: 999,
    currency: "USD",
    billingCycle: "monthly",
    nextBillingDate: "2026-04-01",
    category: "entertainment",
    reminderDaysBefore: [1, 3, 7],
    isActive: true,
    priceHistory: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function buildSettings(
  overrides: Partial<AppSettings> = {}
): AppSettings {
  return {
    defaultCurrency: "USD",
    weekStartsOn: 0,
    notificationsEnabled: false,
    themePreference: "system",
    ...overrides,
  };
}

export function buildUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "user-1",
    email: "test@example.com",
    role: "user",
    profile: { fullName: "Test User" },
    profileComplete: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function buildProfile(
  overrides: Partial<UserProfile> = {}
): UserProfile {
  return {
    fullName: "Test User",
    country: "US",
    timeZone: "America/New_York",
    ...overrides,
  };
}
