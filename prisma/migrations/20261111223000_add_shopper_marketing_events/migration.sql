-- CreateEnum
CREATE TYPE "ShopperMarketingEventType" AS ENUM (
    'SHOPPER_EMAIL_VERIFIED'
);

-- CreateEnum
CREATE TYPE "ShopperMarketingEventStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'SENT',
    'FAILED',
    'CANCELLED'
);

-- CreateTable
CREATE TABLE "ShopperMarketingEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shopperId" UUID NOT NULL,
    "eventType" "ShopperMarketingEventType" NOT NULL,
    "eventKey" TEXT NOT NULL,
    "status" "ShopperMarketingEventStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "claimedAt" TIMESTAMP(3),
    "claimToken" UUID,
    "nextAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopperMarketingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopperMarketingEvent_eventKey_key"
ON "ShopperMarketingEvent"("eventKey");

-- CreateIndex
CREATE INDEX "ShopperMarketingEvent_shopperId_eventType_idx"
ON "ShopperMarketingEvent"("shopperId", "eventType");

-- CreateIndex
CREATE INDEX "ShopperMarketingEvent_status_nextAttemptAt_createdAt_idx"
ON "ShopperMarketingEvent"("status", "nextAttemptAt", "createdAt");

-- CreateIndex
CREATE INDEX "ShopperMarketingEvent_status_claimedAt_idx"
ON "ShopperMarketingEvent"("status", "claimedAt");

-- AddForeignKey
ALTER TABLE "ShopperMarketingEvent"
ADD CONSTRAINT "ShopperMarketingEvent_shopperId_fkey"
FOREIGN KEY ("shopperId")
REFERENCES "Shopper"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
