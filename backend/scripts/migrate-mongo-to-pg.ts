/**
 * One-time data migration script: MongoDB -> PostgreSQL
 *
 * Reads all documents from the MongoDB pulseboard database and writes them
 * to the PostgreSQL pulseboard database via Prisma.
 *
 * Usage:
 *   npx tsx scripts/migrate-mongo-to-pg.ts           # fails if PG has data
 *   npx tsx scripts/migrate-mongo-to-pg.ts --force    # clears PG data first
 *
 * Required env vars (in backend/.env):
 *   MONGODB_URI   - e.g. mongodb://127.0.0.1:27017/pulseboard
 *   DATABASE_URL  - e.g. postgresql://user@localhost:5432/pulseboard
 */

import "dotenv/config";
import { randomUUID } from "node:crypto";
import { MongoClient, type ObjectId, type Document } from "mongodb";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import type {
  BillingCycle,
  SubscriptionCategory,
  ThemePreference,
} from "../src/generated/prisma/client.js";

// ---------------------------------------------------------------------------
// MongoDB document interfaces (old Mongoose shapes)
// ---------------------------------------------------------------------------

interface MongoUser extends Document {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  fullName?: string;
  country?: string;
  timeZone?: string;
  phone?: string;
  bio?: string;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface MongoSettings extends Document {
  _id: ObjectId;
  userId: ObjectId;
  defaultCurrency: string;
  weekStartsOn: number;
  notificationsEnabled: boolean;
  themePreference: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MongoSubscription extends Document {
  _id: ObjectId;
  userId: ObjectId;
  id: string;
  name: string;
  amountMinor: number;
  currency: string;
  billingCycle: string;
  customIntervalDays?: number;
  nextBillingDate: string;
  category: string;
  reminderDaysBefore: number[];
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Enum validation sets (must match prisma/schema.prisma)
// ---------------------------------------------------------------------------

const VALID_BILLING_CYCLES = new Set<string>([
  "weekly",
  "monthly",
  "yearly",
  "custom_days",
]);
const VALID_CATEGORIES = new Set<string>([
  "entertainment",
  "productivity",
  "utilities",
  "health",
  "other",
]);
const VALID_THEMES = new Set<string>(["system", "light", "dark"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg: string) {
  console.log(`[migrate] ${msg}`);
}

function warn(msg: string) {
  console.warn(`[migrate] WARNING: ${msg}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // ---- 1. Validate environment ----
  const mongoUri = process.env.MONGODB_URI;
  const databaseUrl = process.env.DATABASE_URL;

  if (!mongoUri) {
    throw new Error(
      "MONGODB_URI environment variable is required.\n" +
        'Add it to backend/.env, e.g.: MONGODB_URI="mongodb://127.0.0.1:27017/pulseboard"'
    );
  }
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL environment variable is required.\n" +
        'Add it to backend/.env, e.g.: DATABASE_URL="postgresql://user@localhost:5432/pulseboard"'
    );
  }

  const force = process.argv.includes("--force");

  // ---- 2. Connect to MongoDB ----
  log(`Connecting to MongoDB: ${mongoUri.replace(/\/\/.*@/, "//***@")}`);
  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  const mongoDb = mongoClient.db(); // uses db name from connection string
  log(`Connected to MongoDB database: "${mongoDb.databaseName}"`);

  // ---- 3. Connect to PostgreSQL via Prisma ----
  log(`Connecting to PostgreSQL...`);
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();
  log("Connected to PostgreSQL");

  try {
    // ---- 4. Pre-flight check ----
    const existingUsers = await prisma.user.count();
    const existingSettings = await prisma.settings.count();
    const existingSubs = await prisma.subscription.count();

    if (existingUsers > 0 || existingSettings > 0 || existingSubs > 0) {
      warn(
        `PostgreSQL already contains data: ` +
          `Users=${existingUsers}, Settings=${existingSettings}, Subscriptions=${existingSubs}`
      );

      if (!force) {
        console.error(
          "\nAborting to prevent duplicates. Use --force to clear existing data and re-migrate."
        );
        process.exit(1);
      }

      log("--force flag detected. Clearing existing PostgreSQL data...");
      // Delete in reverse FK order to respect foreign key constraints
      await prisma.subscription.deleteMany();
      await prisma.settings.deleteMany();
      await prisma.user.deleteMany();
      log("Existing data cleared.");
    }

    // ---- 5. Phase 1: Migrate Users ----
    log("\n--- Phase 1: Users ---");
    const mongoUsers = await mongoDb
      .collection<MongoUser>("users")
      .find()
      .toArray();
    log(`Found ${mongoUsers.length} users in MongoDB`);

    const userIdMap = new Map<string, string>(); // mongoId hex -> new UUID

    const pgUsers = mongoUsers.map((mu) => {
      const newId = randomUUID();
      userIdMap.set(mu._id.toHexString(), newId);
      return {
        id: newId,
        email: mu.email,
        passwordHash: mu.passwordHash,
        fullName: mu.fullName ?? null,
        country: mu.country ?? null,
        timeZone: mu.timeZone ?? null,
        phone: mu.phone ?? null,
        bio: mu.bio ?? null,
        passwordResetTokenHash: mu.passwordResetTokenHash ?? null,
        passwordResetExpiresAt: mu.passwordResetExpiresAt ?? null,
        createdAt: mu.createdAt,
        updatedAt: mu.updatedAt,
      };
    });

    if (pgUsers.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.user.createMany({ data: pgUsers });
      });
    }
    log(`Migrated ${pgUsers.length} users`);

    // ---- 6. Phase 2: Migrate Settings ----
    log("\n--- Phase 2: Settings ---");
    const mongoSettings = await mongoDb
      .collection<MongoSettings>("settings")
      .find()
      .toArray();
    log(`Found ${mongoSettings.length} settings in MongoDB`);

    let settingsSkipped = 0;
    const pgSettings: Array<{
      id: string;
      userId: string;
      defaultCurrency: string;
      weekStartsOn: number;
      notificationsEnabled: boolean;
      themePreference: ThemePreference;
      createdAt: Date;
      updatedAt: Date;
    }> = [];

    for (const ms of mongoSettings) {
      const userId = userIdMap.get(ms.userId.toHexString());
      if (!userId) {
        warn(
          `Skipping orphaned settings for mongo userId: ${ms.userId.toHexString()}`
        );
        settingsSkipped++;
        continue;
      }

      const theme = ms.themePreference ?? "system";
      if (!VALID_THEMES.has(theme)) {
        warn(
          `Invalid themePreference "${theme}" for settings of user ${userId}, defaulting to "system"`
        );
      }

      pgSettings.push({
        id: randomUUID(),
        userId,
        defaultCurrency: ms.defaultCurrency,
        weekStartsOn: ms.weekStartsOn ?? 0,
        notificationsEnabled: ms.notificationsEnabled ?? false,
        themePreference: (
          VALID_THEMES.has(theme) ? theme : "system"
        ) as ThemePreference,
        createdAt: ms.createdAt,
        updatedAt: ms.updatedAt,
      });
    }

    if (pgSettings.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.settings.createMany({ data: pgSettings });
      });
    }
    log(
      `Migrated ${pgSettings.length} settings (${settingsSkipped} skipped)`
    );

    // ---- 7. Phase 3: Migrate Subscriptions ----
    log("\n--- Phase 3: Subscriptions ---");
    const mongoSubs = await mongoDb
      .collection<MongoSubscription>("subscriptions")
      .find()
      .toArray();
    log(`Found ${mongoSubs.length} subscriptions in MongoDB`);

    let subsSkipped = 0;
    const pgSubs: Array<{
      pk: string;
      userId: string;
      id: string;
      name: string;
      amountMinor: number;
      currency: string;
      billingCycle: BillingCycle;
      customIntervalDays: number | null;
      nextBillingDate: string;
      category: SubscriptionCategory;
      reminderDaysBefore: number[];
      isActive: boolean;
      notes: string | null;
      createdAt: Date;
      updatedAt: Date;
    }> = [];

    for (const ms of mongoSubs) {
      const userId = userIdMap.get(ms.userId.toHexString());
      if (!userId) {
        warn(
          `Skipping orphaned subscription "${ms.name}" for mongo userId: ${ms.userId.toHexString()}`
        );
        subsSkipped++;
        continue;
      }

      if (!VALID_BILLING_CYCLES.has(ms.billingCycle)) {
        warn(
          `Invalid billingCycle "${ms.billingCycle}" for subscription "${ms.name}", skipping`
        );
        subsSkipped++;
        continue;
      }

      if (!VALID_CATEGORIES.has(ms.category)) {
        warn(
          `Invalid category "${ms.category}" for subscription "${ms.name}", skipping`
        );
        subsSkipped++;
        continue;
      }

      pgSubs.push({
        pk: randomUUID(),
        userId,
        id: ms.id, // preserve app-level UUID
        name: ms.name,
        amountMinor: ms.amountMinor,
        currency: ms.currency,
        billingCycle: ms.billingCycle as BillingCycle,
        customIntervalDays: ms.customIntervalDays ?? null,
        nextBillingDate: ms.nextBillingDate,
        category: ms.category as SubscriptionCategory,
        reminderDaysBefore: ms.reminderDaysBefore ?? [1, 3, 7],
        isActive: ms.isActive ?? true,
        notes: ms.notes ?? null,
        createdAt: ms.createdAt,
        updatedAt: ms.updatedAt,
      });
    }

    if (pgSubs.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.subscription.createMany({ data: pgSubs });
      });
    }
    log(
      `Migrated ${pgSubs.length} subscriptions (${subsSkipped} skipped)`
    );

    // ---- 8. Verification ----
    const pgUserCount = await prisma.user.count();
    const pgSettingsCount = await prisma.settings.count();
    const pgSubsCount = await prisma.subscription.count();

    console.log("\n========================================");
    console.log("       Migration Summary");
    console.log("========================================");
    console.log(
      `Users:         ${mongoUsers.length} (MongoDB) -> ${pgUserCount} (PostgreSQL)`
    );
    console.log(
      `Settings:      ${mongoSettings.length} (MongoDB) -> ${pgSettingsCount} (PostgreSQL)` +
        (settingsSkipped > 0 ? ` [${settingsSkipped} skipped]` : "")
    );
    console.log(
      `Subscriptions: ${mongoSubs.length} (MongoDB) -> ${pgSubsCount} (PostgreSQL)` +
        (subsSkipped > 0 ? ` [${subsSkipped} skipped]` : "")
    );
    console.log("========================================");

    const allMatch =
      pgUserCount === pgUsers.length &&
      pgSettingsCount === pgSettings.length &&
      pgSubsCount === pgSubs.length;

    if (allMatch) {
      console.log("\nMigration completed successfully!");
    } else {
      console.error(
        "\nWARNING: Count mismatch detected. Please investigate."
      );
      process.exit(1);
    }
  } finally {
    // ---- 9. Disconnect ----
    await prisma.$disconnect();
    await mongoClient.close();
    log("Disconnected from both databases.");
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error(
      "\nMigration failed:",
      error instanceof Error ? error.message : error
    );
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  });
