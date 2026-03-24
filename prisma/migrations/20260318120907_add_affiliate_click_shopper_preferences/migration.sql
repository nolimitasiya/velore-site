-- AlterTable
ALTER TABLE "AffiliateClick" ADD COLUMN     "shopperCountryCode" CHAR(2),
ADD COLUMN     "shopperCurrencyCode" CHAR(3);

-- CreateIndex
CREATE INDEX "AffiliateClick_shopperCountryCode_clickedAt_idx" ON "AffiliateClick"("shopperCountryCode", "clickedAt");

-- CreateIndex
CREATE INDEX "AffiliateClick_shopperCurrencyCode_clickedAt_idx" ON "AffiliateClick"("shopperCurrencyCode", "clickedAt");
