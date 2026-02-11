import { daysUntil, nowIsoDate } from "./date";
import type { Subscription } from "../types";

export interface ReminderHit {
  subscription: Subscription;
  daysBefore: number;
}

const storageKeyForReminder = (
  subscriptionId: string,
  nextBillingDate: string,
  daysBefore: number,
  todayIsoDate: string
): string => {
  return `pulseboard-reminder:${subscriptionId}:${nextBillingDate}:${daysBefore}:${todayIsoDate}`;
};

export const collectReminderHits = (
  subscriptions: Subscription[],
  todayIsoDate = nowIsoDate()
): ReminderHit[] => {
  return subscriptions
    .filter((subscription) => subscription.isActive)
    .flatMap((subscription) => {
      const daysLeft = daysUntil(subscription.nextBillingDate, todayIsoDate);
      if (daysLeft === 0) {
        return [{ subscription, daysBefore: 0 }];
      }
      return subscription.reminderDaysBefore
        .filter((daysBefore) => daysLeft === daysBefore)
        .map((daysBefore) => ({ subscription, daysBefore }));
    });
};

export const supportsNotifications = (): boolean => {
  return typeof window !== "undefined" && "Notification" in window;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!supportsNotifications()) {
    return "denied";
  }
  return Notification.requestPermission();
};

export const notificationPermission = (): NotificationPermission => {
  if (!supportsNotifications()) {
    return "denied";
  }
  return Notification.permission;
};

export const dispatchBrowserReminder = (hit: ReminderHit): void => {
  if (!supportsNotifications() || notificationPermission() !== "granted") {
    return;
  }

  const daysLeft = Math.max(0, daysUntil(hit.subscription.nextBillingDate));
  const body =
    daysLeft === 0
      ? `${hit.subscription.name} renews today.`
      : `${hit.subscription.name} renews in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`;

  const notifier = new Notification("Subscription reminder", {
    body,
    tag: `${hit.subscription.id}:${hit.subscription.nextBillingDate}`
  });

  setTimeout(() => {
    notifier.close();
  }, 8000);
};

export const shouldDispatchReminder = (hit: ReminderHit, todayIsoDate = nowIsoDate()): boolean => {
  const key = storageKeyForReminder(
    hit.subscription.id,
    hit.subscription.nextBillingDate,
    hit.daysBefore,
    todayIsoDate
  );

  if (localStorage.getItem(key)) {
    return false;
  }

  localStorage.setItem(key, "1");
  return true;
};
