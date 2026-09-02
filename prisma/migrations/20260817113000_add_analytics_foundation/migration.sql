-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('SEARCH', 'PRODUCT_IMPRESSION', 'PRODUCT_VIEW', 'BRAND_VIEW', 'WISHLIST_ADD', 'WISHLIST_REMOVE', 'SHOP_CLICK', 'FILTER_APPLY', 'SORT_CHANGE', 'STYLE_FEED_VIEW', 'STYLE_FEED_OPEN', 'STYLE_FEED_PRODUCT_CLICK');

-- CreateEnum
CREATE TYPE "AnalyticsSourcePage" AS ENUM ('HOME', 'SEARCH', 'BRAND', 'CATEGORY', 'PRODUCT', 'DIARY', 'STYLE_FEED', 'OTHER');

-- CreateTable
CREATE TABLE "AnalyticsSession" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shopperId" UUID,
    "shopperCountryCode" CHAR(2),
    "shopperCurrencyCode" CHAR(3),

    CONSTRAINT "AnalyticsSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventType" "AnalyticsEventType" NOT NULL,
    "productId" UUID,
    "brandId" UUID,
    "query" TEXT,
    "normalizedQuery" TEXT,
    "resultsCount" INTEGER,
    "filters" JSONB,
    "metadata" JSONB,
    "sourcePage" "AnalyticsSourcePage",
    "sourcePath" TEXT,
    "sectionId" UUID,
    "sectionKey" TEXT,
    "position" INTEGER,
    "pageNumber" INTEGER,
    "contextType" TEXT,
    "shopperCountryCode" CHAR(2),
    "shopperCurrencyCode" CHAR(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsSession_startedAt_idx" ON "AnalyticsSession"("startedAt");

-- CreateIndex
CREATE INDEX "AnalyticsSession_lastSeenAt_idx" ON "AnalyticsSession"("lastSeenAt");

-- CreateIndex
CREATE INDEX "AnalyticsSession_shopperId_idx" ON "AnalyticsSession"("shopperId");

-- CreateIndex
CREATE INDEX "AnalyticsSession_shopperCountryCode_startedAt_idx" ON "AnalyticsSession"("shopperCountryCode", "startedAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_sessionId_createdAt_idx" ON "AnalyticsEvent"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventType_createdAt_idx" ON "AnalyticsEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_productId_createdAt_idx" ON "AnalyticsEvent"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_brandId_createdAt_idx" ON "AnalyticsEvent"("brandId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_normalizedQuery_createdAt_idx" ON "AnalyticsEvent"("normalizedQuery", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_shopperCountryCode_createdAt_idx" ON "AnalyticsEvent"("shopperCountryCode", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_sourcePage_createdAt_idx" ON "AnalyticsEvent"("sourcePage", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_sectionId_createdAt_idx" ON "AnalyticsEvent"("sectionId", "createdAt");

-- AddForeignKey
ALTER TABLE "AnalyticsSession" ADD CONSTRAINT "AnalyticsSession_shopperId_fkey" FOREIGN KEY ("shopperId") REFERENCES "Shopper"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AnalyticsSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
