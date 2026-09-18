-- Catalogue Health target lifecycle + durable history.
-- Intentionally excludes unrelated StyleFeedPost schema drift.

-- DropForeignKey
ALTER TABLE "CatalogueHealthTarget"
DROP CONSTRAINT "CatalogueHealthTarget_productId_fkey";

-- DropForeignKey
ALTER TABLE "CatalogueHealthTarget"
DROP CONSTRAINT "CatalogueHealthTarget_productImageId_fkey";

-- Remove the nullable composite uniqueness strategy.
DROP INDEX "CatalogueHealthTarget_targetType_productId_productImageId_key";

-- Preserve the exact URL that was checked.
ALTER TABLE "CatalogueHealthCheck"
ADD COLUMN "requestedUrl" TEXT NOT NULL;

-- Preserve the URL responsible for an incident.
ALTER TABLE "CatalogueHealthIssue"
ADD COLUMN "urlAtOpen" TEXT NOT NULL;

-- Give targets a stable unique identity and lifecycle.
ALTER TABLE "CatalogueHealthTarget"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "retiredAt" TIMESTAMP(3),
ADD COLUMN "targetKey" TEXT NOT NULL;

-- targetKey is now the authoritative uniqueness guarantee.
CREATE UNIQUE INDEX "CatalogueHealthTarget_targetKey_key"
ON "CatalogueHealthTarget"("targetKey");

-- Efficiently select active targets that are due for checking.
CREATE INDEX "CatalogueHealthTarget_isActive_nextCheckAt_idx"
ON "CatalogueHealthTarget"("isActive", "nextCheckAt");

-- Preserve health history when a product is deleted.
ALTER TABLE "CatalogueHealthTarget"
ADD CONSTRAINT "CatalogueHealthTarget_productId_fkey"
FOREIGN KEY ("productId")
REFERENCES "Product"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Preserve health history when an image is deleted.
ALTER TABLE "CatalogueHealthTarget"
ADD CONSTRAINT "CatalogueHealthTarget_productImageId_fkey"
FOREIGN KEY ("productImageId")
REFERENCES "ProductImage"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;