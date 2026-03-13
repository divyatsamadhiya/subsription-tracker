import { randomUUID } from "node:crypto";
import { subscriptionInputSchema, subscriptionSchema } from "../domain/schemas.js";
import type { Subscription, SubscriptionInput } from "../domain/types.js";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../prisma.js";
import { HttpError } from "../utils/http.js";
import { toSubscription } from "../utils/serializers.js";
import { logger } from "../logger/logger.js";

const priceChangeInclude = { priceChanges: { orderBy: { effectiveDate: "asc" as const } } };

const nowIsoDate = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const listSubscriptionsForUser = async (userId: string): Promise<Subscription[]> => {
  const docs = await prisma.subscription.findMany({
    where: { userId },
    orderBy: [{ nextBillingDate: "asc" }, { name: "asc" }],
    include: priceChangeInclude
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
  const currency = settings?.defaultCurrency ?? "USD";

  const created = await prisma.subscription.create({
    data: {
      userId,
      id: randomUUID(),
      ...payload,
      currency,
      priceChanges: {
        create: {
          amountMinor: payload.amountMinor,
          currency,
          billingCycle: payload.billingCycle,
          customIntervalDays: payload.customIntervalDays,
          effectiveDate: nowIsoDate(),
        }
      }
    },
    include: priceChangeInclude
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
  const currency = settings?.defaultCurrency ?? "USD";

  try {
    const existing = await prisma.subscription.findUnique({
      where: { userId_id: { userId, id: subscriptionId } }
    });

    if (!existing) {
      throw new HttpError(404, "Subscription not found");
    }

    const priceChanged =
      payload.amountMinor !== existing.amountMinor ||
      payload.billingCycle !== existing.billingCycle ||
      payload.customIntervalDays !== (existing.customIntervalDays ?? undefined);

    const updated = await prisma.subscription.update({
      where: { userId_id: { userId, id: subscriptionId } },
      data: {
        ...payload,
        currency,
        ...(priceChanged
          ? {
              priceChanges: {
                create: {
                  amountMinor: payload.amountMinor,
                  currency,
                  billingCycle: payload.billingCycle,
                  customIntervalDays: payload.customIntervalDays,
                  effectiveDate: nowIsoDate(),
                }
              }
            }
          : {})
      },
      include: priceChangeInclude
    });

    const subscription = subscriptionSchema.parse(toSubscription(updated));
    logger.info("Subscription updated", { userId, subscriptionId });
    return subscription;
  } catch (error) {
    if (error instanceof HttpError) throw error;
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
