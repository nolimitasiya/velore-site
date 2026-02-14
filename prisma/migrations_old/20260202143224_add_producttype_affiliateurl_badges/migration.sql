-- AlterEnum
ALTER TYPE "Badge" ADD VALUE 'Next_Day';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "affiliateUrl" TEXT,
ADD COLUMN     "productType" TEXT;

-- CreateIndex
CREATE INDEX "Product_productType_idx" ON "Product"("productType");

-- CreateIndex
CREATE INDEX "Product_affiliateUrl_idx" ON "Product"("affiliateUrl");
