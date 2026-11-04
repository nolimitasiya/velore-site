-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('ISSUE', 'IDEA');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'UNDER_REVIEW', 'RESOLVED', 'IMPLEMENTED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "FeedbackEmailStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'NOT_APPLICABLE');

-- CreateTable
CREATE TABLE "FeedbackSubmission" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "FeedbackType" NOT NULL,
    "category" TEXT,
    "message" TEXT NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
    "shopperId" UUID,
    "contactEmail" TEXT,
    "contactName" TEXT,
    "emailVerifiedBySession" BOOLEAN NOT NULL DEFAULT false,
    "productId" UUID,
    "productTitleSnapshot" TEXT,
    "brandNameSnapshot" TEXT,
    "productUrlSnapshot" TEXT,
    "pageUrl" TEXT,
    "adminEmailStatus" "FeedbackEmailStatus" NOT NULL DEFAULT 'PENDING',
    "shopperEmailStatus" "FeedbackEmailStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "adminEmailSentAt" TIMESTAMP(3),
    "shopperEmailSentAt" TIMESTAMP(3),
    "adminEmailAttempts" INTEGER NOT NULL DEFAULT 0,
    "shopperEmailAttempts" INTEGER NOT NULL DEFAULT 0,
    "adminEmailClaimedAt" TIMESTAMP(3),
    "shopperEmailClaimedAt" TIMESTAMP(3),
    "adminEmailNextAttemptAt" TIMESTAMP(3),
    "shopperEmailNextAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dedupeKey" TEXT,
    "dedupeExpiresAt" TIMESTAMP(3),
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FeedbackSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeedbackSubmission_type_status_createdAt_idx" ON "FeedbackSubmission"("type", "status", "createdAt");

-- CreateIndex
CREATE INDEX "FeedbackSubmission_shopperId_idx" ON "FeedbackSubmission"("shopperId");

-- CreateIndex
CREATE INDEX "FeedbackSubmission_productId_idx" ON "FeedbackSubmission"("productId");

-- CreateIndex
CREATE INDEX "FeedbackSubmission_createdAt_idx" ON "FeedbackSubmission"("createdAt");
CREATE UNIQUE INDEX "FeedbackSubmission_dedupeKey_key" ON "FeedbackSubmission"("dedupeKey");
-- AddForeignKey
ALTER TABLE "FeedbackSubmission" ADD CONSTRAINT "FeedbackSubmission_shopperId_fkey" FOREIGN KEY ("shopperId") REFERENCES "Shopper"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackSubmission" ADD CONSTRAINT "FeedbackSubmission_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
