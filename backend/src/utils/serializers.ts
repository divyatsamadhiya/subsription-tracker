import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type AuthUser,
  type Subscription,
  type UserProfile
} from "../domain/types.js";
import type {
  User as PrismaUser,
  Settings as PrismaSettings,
  Subscription as PrismaSubscription,
  PriceChange as PrismaPriceChange
} from "../generated/prisma/client.js";

export const toUserProfile = (user: PrismaUser): UserProfile => {
  return {
    fullName: user.fullName ?? undefined,
    country: user.country ?? undefined,
    timeZone: user.timeZone ?? undefined,
    phone: user.phone ?? undefined,
    bio: user.bio ?? undefined
  };
};

export const isProfileComplete = (profile: UserProfile): boolean => {
  return Boolean(profile.fullName && profile.country);
};

export const toAuthUser = (user: PrismaUser): AuthUser => {
  const profile = toUserProfile(user);
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    profile,
    profileComplete: isProfileComplete(profile),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
};

export const toSettings = (settings: PrismaSettings | null): AppSettings => {
  if (!settings) {
    return DEFAULT_SETTINGS;
  }

  return {
    defaultCurrency: settings.defaultCurrency,
    weekStartsOn: settings.weekStartsOn as 0 | 1,
    notificationsEnabled: settings.notificationsEnabled,
    themePreference: settings.themePreference
  };
};

export const toSubscription = (
  subscription: PrismaSubscription & { priceChanges?: PrismaPriceChange[] }
): Subscription => {
  return {
    id: subscription.id,
    name: subscription.name,
    amountMinor: subscription.amountMinor,
    currency: subscription.currency,
    billingCycle: subscription.billingCycle,
    customIntervalDays: subscription.customIntervalDays ?? undefined,
    nextBillingDate: subscription.nextBillingDate,
    category: subscription.category,
    reminderDaysBefore: subscription.reminderDaysBefore,
    isActive: subscription.isActive,
    notes: subscription.notes ?? undefined,
    priceHistory: (subscription.priceChanges ?? []).map((pc) => ({
      amountMinor: pc.amountMinor,
      currency: pc.currency,
      billingCycle: pc.billingCycle,
      customIntervalDays: pc.customIntervalDays ?? undefined,
      effectiveDate: pc.effectiveDate,
    })),
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString()
  };
};
