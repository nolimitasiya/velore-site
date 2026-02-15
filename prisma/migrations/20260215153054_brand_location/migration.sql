-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "baseCity" TEXT;

-- AlterTable
ALTER TABLE "BrandApplication" ADD COLUMN     "city" TEXT,
ADD COLUMN     "countryCode" CHAR(2);

-- CreateIndex
CREATE INDEX "BrandApplication_countryCode_idx" ON "BrandApplication"("countryCode");
