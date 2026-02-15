/*
  Warnings:

  - A unique constraint covering the columns `[stripeCustomerId]` on the table `Brand` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeSubscriptionId]` on the table `Brand` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "BrandAccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "FeatureType" AS ENUM ('TREND_SPOTLIGHT', 'STYLE_FEED');

-- CreateEnum
CREATE TYPE "FeatureBookingStatus" AS ENUM ('RESERVED', 'PAID', 'CANCELLED');

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "accountStatus" "BrandAccountStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "contractAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "contractAcceptedIp" TEXT,
ADD COLUMN     "contractVersion" TEXT,
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "lastInvoiceId" TEXT,
ADD COLUMN     "lastInvoiceStatus" TEXT,
ADD COLUMN     "pastDueSince" TIMESTAMP(3),
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "stripeSubscriptionStatus" TEXT;

-- CreateTable
CREATE TABLE "FeatureSlot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "FeatureType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "bookedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FeatureSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureBooking" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "brandId" UUID NOT NULL,
    "slotId" UUID NOT NULL,
    "type" "FeatureType" NOT NULL,
    "status" "FeatureBookingStatus" NOT NULL DEFAULT 'RESERVED',
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "amountCents" INTEGER,
    "currency" "Currency" NOT NULL DEFAULT 'GBP',
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StyleFeedPost" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "brandId" UUID,
    "igMediaId" TEXT,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT,
    "permalink" TEXT,
    "postedAt" TIMESTAMP(3),
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StyleFeedPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeatureSlot_type_startDate_idx" ON "FeatureSlot"("type", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureSlot_type_startDate_key" ON "FeatureSlot"("type", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureBooking_stripeCheckoutSessionId_key" ON "FeatureBooking"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureBooking_stripePaymentIntentId_key" ON "FeatureBooking"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "FeatureBooking_status_createdAt_idx" ON "FeatureBooking"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureBooking_brandId_slotId_key" ON "FeatureBooking"("brandId", "slotId");

-- CreateIndex
CREATE UNIQUE INDEX "StyleFeedPost_igMediaId_key" ON "StyleFeedPost"("igMediaId");

-- CreateIndex
CREATE INDEX "StyleFeedPost_isActive_postedAt_idx" ON "StyleFeedPost"("isActive", "postedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_stripeCustomerId_key" ON "Brand"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_stripeSubscriptionId_key" ON "Brand"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "FeatureBooking" ADD CONSTRAINT "FeatureBooking_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureBooking" ADD CONSTRAINT "FeatureBooking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "FeatureSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StyleFeedPost" ADD CONSTRAINT "StyleFeedPost_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
