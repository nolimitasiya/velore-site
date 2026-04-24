-- CreateEnum
CREATE TYPE "MerchPageKey" AS ENUM ('CLOTHING', 'SALE', 'OCCASION');

-- CreateEnum
CREATE TYPE "MerchBucket" AS ENUM ('TOP_PICKS', 'DISCOVER_MORE', 'EXPLORE_NEW');

-- CreateTable
CREATE TABLE "CollectionMerchItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pageKey" "MerchPageKey" NOT NULL,
    "bucket" "MerchBucket" NOT NULL,
    "productId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionMerchItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollectionMerchItem_pageKey_bucket_isActive_idx" ON "CollectionMerchItem"("pageKey", "bucket", "isActive");

-- CreateIndex
CREATE INDEX "CollectionMerchItem_productId_idx" ON "CollectionMerchItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionMerchItem_pageKey_bucket_productId_key" ON "CollectionMerchItem"("pageKey", "bucket", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionMerchItem_pageKey_bucket_position_key" ON "CollectionMerchItem"("pageKey", "bucket", "position");

-- AddForeignKey
ALTER TABLE "CollectionMerchItem" ADD CONSTRAINT "CollectionMerchItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
