import { randomUUID } from "node:crypto";
import { subscriptionInputSchema, subscriptionSchema } from "../domain/schemas.js";
import type { Subscription, SubscriptionInput } from "../domain/types.js";
import { SettingsModel } from "../models/Settings.js";
import { SubscriptionModel } from "../models/Subscription.js";
import { HttpError } from "../utils/http.js";
import { toSubscription } from "../utils/serializers.js";
import { logger } from "../logger/logger.js";

export const listSubscriptionsForUser = async (userId: string): Promise<Subscription[]> => {
  const docs = await SubscriptionModel.find({ userId }).sort({ nextBillingDate: 1, name: 1 });
  const subscriptions = docs.map((document) => subscriptionSchema.parse(toSubscription(document)));

  logger.info("Subscriptions fetched", { userId, count: subscriptions.length });
  return subscriptions;
};

export const createSubscriptionForUser = async (
  userId: string,
  input: unknown
): Promise<Subscription> => {
  const payload = subscriptionInputSchema.parse(input);
  const settings = await SettingsModel.findOne({ userId });

  const created = await SubscriptionModel.create({
    userId,
    id: randomUUID(),
    ...payload,
    currency: settings?.defaultCurrency ?? "USD"
  });

  const subscription = subscriptionSchema.parse(toSubscription(created));
  logger.info("Subscription created", { userId, subscriptionId: subscription.id });
  return subscription;
};

export const updateSubscriptionForUser = async (
  userId: string,
  subscriptionId: string,
  input: unknown
): Promise<Subscription> => {
  const payload: SubscriptionInput = subscriptionInputSchema.parse(input);
  const settings = await SettingsModel.findOne({ userId });

  const updated = await SubscriptionModel.findOneAndUpdate(
    { userId, id: subscriptionId },
    {
      ...payload,
      currency: settings?.defaultCurrency ?? "USD"
    },
    { new: true, runValidators: true }
  );

  if (!updated) {
    logger.warn("Subscription update failed: not found", { userId, subscriptionId });
    throw new HttpError(404, "Subscription not found");
  }

  const subscription = subscriptionSchema.parse(toSubscription(updated));
  logger.info("Subscription updated", { userId, subscriptionId });
  return subscription;
};

export const deleteSubscriptionForUser = async (
  userId: string,
  subscriptionId: string
): Promise<void> => {
  const deleted = await SubscriptionModel.findOneAndDelete({ userId, id: subscriptionId });

  if (!deleted) {
    logger.warn("Subscription delete failed: not found", { userId, subscriptionId });
    throw new HttpError(404, "Subscription not found");
  }

  logger.info("Subscription deleted", { userId, subscriptionId });
};
