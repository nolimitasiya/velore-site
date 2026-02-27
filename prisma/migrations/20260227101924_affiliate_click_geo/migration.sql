-- AlterTable
ALTER TABLE "AffiliateClick" ADD COLUMN     "city" TEXT,
ADD COLUMN     "countryCode" CHAR(2),
ADD COLUMN     "region" TEXT;

-- AlterTable
ALTER TABLE "NewsletterSubscriber" ADD COLUMN     "countryCode" CHAR(2);

-- AlterTable
ALTER TABLE "WaitlistSubscriber" ADD COLUMN     "countryCode" CHAR(2);

-- CreateIndex
CREATE INDEX "AffiliateClick_countryCode_clickedAt_idx" ON "AffiliateClick"("countryCode", "clickedAt");
