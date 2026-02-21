/*
  Warnings:

  - The `currency` column on the `AffiliateEarning` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `currency` column on the `FeatureBooking` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `currency` column on the `Product` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "AffiliateEarning" DROP COLUMN "currency",
ADD COLUMN     "currency" CHAR(3) NOT NULL DEFAULT 'GBP';

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "parentId" UUID;

-- AlterTable
ALTER TABLE "FeatureBooking" DROP COLUMN "currency",
ADD COLUMN     "currency" CHAR(3) NOT NULL DEFAULT 'GBP';

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "currency",
ADD COLUMN     "currency" CHAR(3) NOT NULL DEFAULT 'GBP';

-- DropEnum
DROP TYPE "Currency";

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
