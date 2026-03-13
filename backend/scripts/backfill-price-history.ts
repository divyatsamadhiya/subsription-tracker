/**
 * One-time script to backfill initial PriceChange records for existing
 * subscriptions that were created before the price history feature.
 *
 * Usage:
 *   cd backend && npx tsx scripts/backfill-price-history.ts
 *
 * Safe to run multiple times — skips subscriptions that already have
 * at least one price change record.
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Find subscriptions that have zero price change records
  const subscriptions = await prisma.subscription.findMany({
    where: {
      priceChanges: { none: {} },
    },
    select: {
      pk: true,
      amountMinor: true,
      currency: true,
      billingCycle: true,
      customIntervalDays: true,
      createdAt: true,
    },
  });

  if (subscriptions.length === 0) {
    console.log("All subscriptions already have price history. Nothing to backfill.");
    return;
  }

  console.log(`Backfilling ${subscriptions.length} subscription(s)...`);

  for (const sub of subscriptions) {
    const effectiveDate = sub.createdAt.toISOString().slice(0, 10);

    await prisma.priceChange.create({
      data: {
        subscriptionPk: sub.pk,
        amountMinor: sub.amountMinor,
        currency: sub.currency,
        billingCycle: sub.billingCycle,
        customIntervalDays: sub.customIntervalDays,
        effectiveDate,
      },
    });
  }

  console.log(`Done. Backfilled ${subscriptions.length} subscription(s) with initial price records.`);
}

main()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
