-- CreateEnum
CREATE TYPE "ProductLengthStructure" AS ENUM ('INDEPENDENT', 'SIZE_DEPENDENT', 'LENGTH_BASED_SIZE');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "lengthStructure" "ProductLengthStructure";

-- AlterTable
ALTER TABLE "ProductSizeFitMeasurement" ADD COLUMN     "measurementBasis" "FitMeasurementBasis";

-- CreateTable
CREATE TABLE "ProductLengthOption" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "productId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "valueCm" DECIMAL(8,2),
    "sourceValue" DECIMAL(8,2),
    "sourceUnit" "FitUnit",
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "source" "FitDataSource",
    "sourceUrl" TEXT,
    "sourceNotes" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductLengthOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductLengthOption_productId_sortOrder_idx" ON "ProductLengthOption"("productId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProductLengthOption_productId_label_key" ON "ProductLengthOption"("productId", "label");

-- AddForeignKey
ALTER TABLE "ProductLengthOption" ADD CONSTRAINT "ProductLengthOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
