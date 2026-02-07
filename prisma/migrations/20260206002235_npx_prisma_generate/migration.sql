/*
  Warnings:

  - Added the required column `productType` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('ABAYA', 'DRESS', 'SKIRT', 'TOP', 'HIJAB');

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "productType",
ADD COLUMN     "productType" "ProductType" NOT NULL;

-- CreateIndex
CREATE INDEX "BrandPayout_month_idx" ON "BrandPayout"("month");

-- CreateIndex
CREATE INDEX "Product_productType_idx" ON "Product"("productType");
