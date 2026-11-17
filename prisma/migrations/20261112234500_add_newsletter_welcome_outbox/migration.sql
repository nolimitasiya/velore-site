-- CreateEnum
CREATE TYPE "NewsletterWelcomeEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUBMITTING', 'SENT', 'FAILED', 'CANCELLED', 'UNKNOWN');

-- AlterTable
ALTER TABLE "NewsletterSubscriber" ADD COLUMN     "subscriptionGeneration" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "NewsletterWelcomeEvent" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "subscriptionGeneration" INTEGER NOT NULL,
    "eventKey" TEXT NOT NULL,
    "status" "NewsletterWelcomeEventStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "claimToken" TEXT,
    "claimedAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "providerMessageId" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterWelcomeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterWelcomeEvent_eventKey_key" ON "NewsletterWelcomeEvent"("eventKey");

-- CreateIndex
CREATE INDEX "NewsletterWelcomeEvent_status_nextAttemptAt_createdAt_idx" ON "NewsletterWelcomeEvent"("status", "nextAttemptAt", "createdAt");

-- CreateIndex
CREATE INDEX "NewsletterWelcomeEvent_subscriberId_status_idx" ON "NewsletterWelcomeEvent"("subscriberId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterWelcomeEvent_subscriberId_subscriptionGeneration_key" ON "NewsletterWelcomeEvent"("subscriberId", "subscriptionGeneration");

-- AddForeignKey
ALTER TABLE "NewsletterWelcomeEvent" ADD CONSTRAINT "NewsletterWelcomeEvent_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "NewsletterSubscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;
