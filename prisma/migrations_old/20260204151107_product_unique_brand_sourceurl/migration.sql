/*
  Warnings:

  - A unique constraint covering the columns `[brandId,sourceUrl]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Product_brandId_idx";

-- DropIndex
DROP INDEX "Product_slug_key";

-- CreateIndex
CREATE INDEX "Product_brandId_slug_idx" ON "Product"("brandId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_brandId_sourceUrl_key" ON "Product"("brandId", "sourceUrl");
