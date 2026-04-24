-- AlterTable
ALTER TABLE "AffiliateClick" ADD COLUMN     "contextType" TEXT,
ADD COLUMN     "isExpandedPageOne" BOOLEAN,
ADD COLUMN     "pageNumber" INTEGER;

-- CreateIndex
CREATE INDEX "AffiliateClick_pageNumber_clickedAt_idx" ON "AffiliateClick"("pageNumber", "clickedAt");

-- CreateIndex
CREATE INDEX "AffiliateClick_contextType_clickedAt_idx" ON "AffiliateClick"("contextType", "clickedAt");
