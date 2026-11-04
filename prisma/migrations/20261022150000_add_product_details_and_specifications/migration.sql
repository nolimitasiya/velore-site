-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "careInstructions" TEXT,
ADD COLUMN     "colourDescription" TEXT,
ADD COLUMN     "countryOfOrigin" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "liningStatus" TEXT,
ADD COLUMN     "transparency" TEXT;

-- CreateTable
CREATE TABLE "ProductSpecification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "productId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductSpecification_productId_sortOrder_idx" ON "ProductSpecification"("productId", "sortOrder");

-- AddForeignKey
ALTER TABLE "ProductSpecification" ADD CONSTRAINT "ProductSpecification_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
