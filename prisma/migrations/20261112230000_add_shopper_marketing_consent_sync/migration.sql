-- CreateEnum
CREATE TYPE "ShopperMarketingConsentSyncReason" AS ENUM ('REGISTRATION', 'ACCOUNT_OPT_IN', 'ACCOUNT_OPT_OUT', 'EMAIL_CHANGE_OLD_ADDRESS', 'EMAIL_CHANGE_NEW_ADDRESS', 'RECONCILIATION');

-- CreateEnum
CREATE TYPE "ShopperMarketingConsentSyncStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUBMITTED', 'APPLIED', 'FAILED', 'UNKNOWN', 'SUPERSEDED');

-- AlterTable
ALTER TABLE "Shopper" ADD COLUMN     "marketingConsentVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ShopperMarketingConsentSync" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shopperId" UUID NOT NULL,
    "operationKey" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "consentVersion" INTEGER NOT NULL,
    "desiredConsent" BOOLEAN NOT NULL,
    "reason" "ShopperMarketingConsentSyncReason" NOT NULL,
    "status" "ShopperMarketingConsentSyncStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "claimedAt" TIMESTAMP(3),
    "claimToken" UUID,
    "nextAttemptAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "providerJobId" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "reconciledAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopperMarketingConsentSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopperMarketingConsentSync_operationKey_key" ON "ShopperMarketingConsentSync"("operationKey");

-- CreateIndex
CREATE INDEX "ShopperMarketingConsentSync_shopperId_consentVersion_idx" ON "ShopperMarketingConsentSync"("shopperId", "consentVersion");

-- CreateIndex
CREATE INDEX "ShopperMarketingConsentSync_email_status_idx" ON "ShopperMarketingConsentSync"("email", "status");

-- CreateIndex
CREATE INDEX "ShopperMarketingConsentSync_status_nextAttemptAt_createdAt_idx" ON "ShopperMarketingConsentSync"("status", "nextAttemptAt", "createdAt");

-- CreateIndex
CREATE INDEX "ShopperMarketingConsentSync_status_claimedAt_idx" ON "ShopperMarketingConsentSync"("status", "claimedAt");

-- AddForeignKey
ALTER TABLE "ShopperMarketingConsentSync" ADD CONSTRAINT "ShopperMarketingConsentSync_shopperId_fkey" FOREIGN KEY ("shopperId") REFERENCES "Shopper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
