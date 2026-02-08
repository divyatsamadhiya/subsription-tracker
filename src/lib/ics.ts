import type { Subscription } from "../types";

const cleanText = (value: string): string => {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
};

const formatUtcStamp = (date = new Date()): string => {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
};

const isoToIcsDate = (isoDate: string): string => {
  return isoDate.replace(/-/g, "");
};

const recurrenceRule = (subscription: Subscription): string => {
  switch (subscription.billingCycle) {
    case "weekly":
      return "FREQ=WEEKLY;INTERVAL=1";
    case "monthly":
      return "FREQ=MONTHLY;INTERVAL=1";
    case "yearly":
      return "FREQ=YEARLY;INTERVAL=1";
    case "custom_days":
      return `FREQ=DAILY;INTERVAL=${subscription.customIntervalDays ?? 30}`;
    default:
      return "FREQ=MONTHLY;INTERVAL=1";
  }
};

export const generateSubscriptionIcs = (subscription: Subscription): string => {
  const uid = `${subscription.id}@pulseboard.local`;
  const createdAt = formatUtcStamp();
  const reminders = subscription.reminderDaysBefore
    .filter((days) => days > 0)
    .map((days) => {
      return [
        "BEGIN:VALARM",
        `TRIGGER:-P${days}D`,
        "ACTION:DISPLAY",
        `DESCRIPTION:${cleanText(`Upcoming charge: ${subscription.name}`)}`,
        "END:VALARM"
      ].join("\r\n");
    })
    .join("\r\n");

  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pulseboard//Subscription Tracker//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${createdAt}`,
    `DTSTART;VALUE=DATE:${isoToIcsDate(subscription.nextBillingDate)}`,
    `RRULE:${recurrenceRule(subscription)}`,
    `SUMMARY:${cleanText(`${subscription.name} renewal`)}`,
    `DESCRIPTION:${cleanText(subscription.notes ?? "Subscription renewal")}`,
    reminders,
    "END:VEVENT",
    "END:VCALENDAR"
  ]
    .filter(Boolean)
    .join("\r\n");

  return `${body}\r\n`;
};

export const downloadTextFile = (filename: string, text: string, mimeType: string): void => {
  const blob = new Blob([text], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
};
