-- CreateEnum
CREATE TYPE "MerchandisingScopeType" AS ENUM ('PRODUCT_TYPE', 'OCCASION');

-- CreateEnum
CREATE TYPE "MerchandisingVersion" AS ENUM ('DRAFT', 'LIVE');

-- CreateTable
CREATE TABLE "CategoryMerchPlacement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scopeType" "MerchandisingScopeType" NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "productId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "version" "MerchandisingVersion" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryMerchPlacement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CategoryMerchPlacement_scopeType_scopeKey_version_position_idx"
ON "CategoryMerchPlacement"("scopeType", "scopeKey", "version", "position");

CREATE INDEX "CategoryMerchPlacement_productId_idx"
ON "CategoryMerchPlacement"("productId");

CREATE UNIQUE INDEX "CategoryMerchPlacement_scopeType_scopeKey_version_productId_key"
ON "CategoryMerchPlacement"("scopeType", "scopeKey", "version", "productId");

CREATE UNIQUE INDEX "CategoryMerchPlacement_scopeType_scopeKey_version_position_key"
ON "CategoryMerchPlacement"("scopeType", "scopeKey", "version", "position");

ALTER TABLE "CategoryMerchPlacement"
ADD CONSTRAINT "CategoryMerchPlacement_productId_fkey"
FOREIGN KEY ("productId")
REFERENCES "Product"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;