-- CreateTable
CREATE TABLE "price_changes" (
    "id" TEXT NOT NULL,
    "subscriptionPk" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "customIntervalDays" INTEGER,
    "effectiveDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "price_changes_subscriptionPk_effectiveDate_idx" ON "price_changes"("subscriptionPk", "effectiveDate");

-- AddForeignKey
ALTER TABLE "price_changes" ADD CONSTRAINT "price_changes_subscriptionPk_fkey" FOREIGN KEY ("subscriptionPk") REFERENCES "subscriptions"("pk") ON DELETE CASCADE ON UPDATE CASCADE;
