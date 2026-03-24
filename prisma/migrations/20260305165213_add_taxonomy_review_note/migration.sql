/*
  Warnings:

  - A unique constraint covering the columns `[brandId,type,slug]` on the table `TaxonomyRequest` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "TaxonomyRequest_type_slug_key";

-- AlterTable
ALTER TABLE "TaxonomyRequest" ADD COLUMN     "reviewNote" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TaxonomyRequest_brandId_type_slug_key" ON "TaxonomyRequest"("brandId", "type", "slug");
