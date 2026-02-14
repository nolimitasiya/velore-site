-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('pending', 'approved', 'paid');

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "aovEstimate" DECIMAL(12,2),
ADD COLUMN     "defaultCommissionRate" DECIMAL(5,4);

-- CreateTable
CREATE TABLE "AffiliateClick" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "productId" UUID,
    "brandId" UUID NOT NULL,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateEarning" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "brandId" UUID NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'GBP',
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateEarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandPayout" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "brandId" UUID NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'pending',
    "method" TEXT,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AffiliateClick_brandId_clickedAt_idx" ON "AffiliateClick"("brandId", "clickedAt");

-- CreateIndex
CREATE INDEX "AffiliateClick_productId_clickedAt_idx" ON "AffiliateClick"("productId", "clickedAt");

-- CreateIndex
CREATE INDEX "AffiliateEarning_month_idx" ON "AffiliateEarning"("month");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateEarning_brandId_month_key" ON "AffiliateEarning"("brandId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "BrandPayout_brandId_month_key" ON "BrandPayout"("brandId", "month");

-- AddForeignKey
ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateEarning" ADD CONSTRAINT "AffiliateEarning_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandPayout" ADD CONSTRAINT "BrandPayout_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
