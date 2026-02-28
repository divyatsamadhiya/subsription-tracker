-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('weekly', 'monthly', 'yearly', 'custom_days');

-- CreateEnum
CREATE TYPE "SubscriptionCategory" AS ENUM ('entertainment', 'productivity', 'utilities', 'health', 'other');

-- CreateEnum
CREATE TYPE "ThemePreference" AS ENUM ('system', 'light', 'dark');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT,
    "country" TEXT,
    "timeZone" TEXT,
    "phone" TEXT,
    "bio" TEXT,
    "passwordResetTokenHash" TEXT,
    "passwordResetExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultCurrency" VARCHAR(3) NOT NULL,
    "weekStartsOn" INTEGER NOT NULL DEFAULT 0,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "themePreference" "ThemePreference" NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "pk" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "customIntervalDays" INTEGER,
    "nextBillingDate" TEXT NOT NULL,
    "category" "SubscriptionCategory" NOT NULL,
    "reminderDaysBefore" INTEGER[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("pk")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "settings_userId_key" ON "settings"("userId");

-- CreateIndex
CREATE INDEX "subscriptions_userId_nextBillingDate_idx" ON "subscriptions"("userId", "nextBillingDate");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_userId_id_key" ON "subscriptions"("userId", "id");

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
