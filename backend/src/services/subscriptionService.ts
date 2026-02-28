import { randomUUID } from "node:crypto";
import { subscriptionInputSchema, subscriptionSchema } from "../domain/schemas.js";
import type { Subscription, SubscriptionInput } from "../domain/types.js";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../prisma.js";
import { HttpError } from "../utils/http.js";
import { toSubscription } from "../utils/serializers.js";
import { logger } from "../logger/logger.js";

export const listSubscriptionsForUser = async (userId: string): Promise<Subscription[]> => {
  const docs = await prisma.subscription.findMany({
    where: { userId },
    orderBy: [{ nextBillingDate: "asc" }, { name: "asc" }]
  });
  const subscriptions = docs.map((document) => subscriptionSchema.parse(toSubscription(document)));

  logger.info("Subscriptions fetched", { userId, count: subscriptions.length });
  return subscriptions;
};

export const createSubscriptionForUser = async (
  userId: string,
  input: unknown
): Promise<Subscription> => {
  const payload = subscriptionInputSchema.parse(input);
  const settings = await prisma.settings.findUnique({ where: { userId } });

  const created = await prisma.subscription.create({
    data: {
      userId,
      id: randomUUID(),
      ...payload,
      currency: settings?.defaultCurrency ?? "USD"
    }
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
  const settings = await prisma.settings.findUnique({ where: { userId } });

  try {
    const updated = await prisma.subscription.update({
      where: { userId_id: { userId, id: subscriptionId } },
      data: {
        ...payload,
        currency: settings?.defaultCurrency ?? "USD"
      }
    });

    const subscription = subscriptionSchema.parse(toSubscription(updated));
    logger.info("Subscription updated", { userId, subscriptionId });
    return subscription;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      logger.warn("Subscription update failed: not found", { userId, subscriptionId });
      throw new HttpError(404, "Subscription not found");
    }
    throw error;
  }
};

export const deleteSubscriptionForUser = async (
  userId: string,
  subscriptionId: string
): Promise<void> => {
  try {
    await prisma.subscription.delete({
      where: { userId_id: { userId, id: subscriptionId } }
    });

    logger.info("Subscription deleted", { userId, subscriptionId });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      logger.warn("Subscription delete failed: not found", { userId, subscriptionId });
      throw new HttpError(404, "Subscription not found");
    }
    throw error;
  }
};
