import type { Subscription, SubscriptionInput } from "./types";

export function toSubscriptionInput(
  subscription: Subscription,
  overrides?: Partial<SubscriptionInput>
): SubscriptionInput {
  return {
    name: subscription.name,
    amountMinor: subscription.amountMinor,
    billingCycle: subscription.billingCycle,
    customIntervalDays: subscription.customIntervalDays,
    nextBillingDate: subscription.nextBillingDate,
    category: subscription.category,
    reminderDaysBefore: subscription.reminderDaysBefore,
    isActive: subscription.isActive,
    notes: subscription.notes,
    priorSpendingMinor: subscription.priorSpendingMinor,
    ...overrides,
  };
}
