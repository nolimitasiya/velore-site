-- CreateTable
CREATE TABLE "HomepageStyleFeedItem" (
    "id" TEXT NOT NULL,
    "brandId" UUID NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageStyleFeedItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomepageStyleFeedItem_brandId_idx" ON "HomepageStyleFeedItem"("brandId");

-- CreateIndex
CREATE INDEX "HomepageStyleFeedItem_isActive_sortOrder_idx" ON "HomepageStyleFeedItem"("isActive", "sortOrder");

-- AddForeignKey
ALTER TABLE "HomepageStyleFeedItem" ADD CONSTRAINT "HomepageStyleFeedItem_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
