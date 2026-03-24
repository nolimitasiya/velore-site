-- CreateEnum
CREATE TYPE "ClickSourcePage" AS ENUM ('HOME', 'SEARCH', 'BRAND');

-- AlterTable
ALTER TABLE "AffiliateClick" ADD COLUMN     "position" INTEGER,
ADD COLUMN     "sectionId" UUID,
ADD COLUMN     "sectionKey" TEXT,
ADD COLUMN     "sourcePage" "ClickSourcePage";

-- CreateIndex
CREATE INDEX "AffiliateClick_sourcePage_clickedAt_idx" ON "AffiliateClick"("sourcePage", "clickedAt");

-- CreateIndex
CREATE INDEX "AffiliateClick_sectionId_clickedAt_idx" ON "AffiliateClick"("sectionId", "clickedAt");

-- CreateIndex
CREATE INDEX "AffiliateClick_sectionKey_clickedAt_idx" ON "AffiliateClick"("sectionKey", "clickedAt");
