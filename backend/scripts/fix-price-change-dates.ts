/**
 * One-time script to fix effectiveDate on non-initial price change records.
 *
 * Before the fix, effectiveDate was set to "today" (when the edit happened).
 * It should be the subscription's nextBillingDate (when the new price kicks in).
 *
 * For non-initial records, this sets effectiveDate = subscription.nextBillingDate.
 *
 * Usage:
 *   cd backend && npx tsx scripts/fix-price-change-dates.ts
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
  const subs = await prisma.subscription.findMany({
    include: { priceChanges: { orderBy: { createdAt: "asc" } } },
  });

  let updated = 0;

  for (const sub of subs) {
    // Skip the first price change (initial record — its date is correct)
    for (let i = 1; i < sub.priceChanges.length; i++) {
      const pc = sub.priceChanges[i];
      if (pc.effectiveDate !== sub.nextBillingDate) {
        console.log(
          `Fixing: "${sub.name}" | old effectiveDate: ${pc.effectiveDate} → new: ${sub.nextBillingDate}`
        );
        await prisma.priceChange.update({
          where: { id: pc.id },
          data: { effectiveDate: sub.nextBillingDate },
        });
        updated++;
      }
    }
  }

  if (updated === 0) {
    console.log("All price change dates are already correct. Nothing to fix.");
  } else {
    console.log(`Done. Fixed ${updated} price change record(s).`);
  }
}

main()
  .catch((error) => {
    console.error("Fix failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
