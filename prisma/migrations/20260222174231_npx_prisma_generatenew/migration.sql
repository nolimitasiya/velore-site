-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "adminNotes" TEXT;

-- CreateTable
CREATE TABLE "BrandNote" (
    "id" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrandNote_brandId_idx" ON "BrandNote"("brandId");

-- AddForeignKey
ALTER TABLE "BrandNote" ADD CONSTRAINT "BrandNote_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
