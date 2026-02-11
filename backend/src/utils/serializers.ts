import { DEFAULT_SETTINGS, type AppSettings, type AuthUser, type Subscription } from "../domain/types.js";
import type { SubscriptionDocument } from "../models/Subscription.js";
import type { SettingsDocument } from "../models/Settings.js";
import type { UserDocument } from "../models/User.js";

type WithId<T> = T & { _id: { toString(): string } };

export const toAuthUser = (user: WithId<UserDocument>): AuthUser => {
  return {
    id: user._id.toString(),
    email: user.email,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
};

export const toSettings = (settings: SettingsDocument | null): AppSettings => {
  if (!settings) {
    return DEFAULT_SETTINGS;
  }

  return {
    defaultCurrency: settings.defaultCurrency,
    weekStartsOn: settings.weekStartsOn,
    notificationsEnabled: settings.notificationsEnabled
  };
};

export const toSubscription = (subscription: SubscriptionDocument): Subscription => {
  return {
    id: subscription.id,
    name: subscription.name,
    amountMinor: subscription.amountMinor,
    currency: subscription.currency,
    billingCycle: subscription.billingCycle,
    customIntervalDays: subscription.customIntervalDays,
    nextBillingDate: subscription.nextBillingDate,
    category: subscription.category,
    reminderDaysBefore: subscription.reminderDaysBefore,
    isActive: subscription.isActive,
    notes: subscription.notes,
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString()
  };
};
