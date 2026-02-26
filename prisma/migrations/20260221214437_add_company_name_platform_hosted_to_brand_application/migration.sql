-- CreateEnum
CREATE TYPE "PlatformHosted" AS ENUM ('SHOPIFY', 'GODADDY', 'WIX', 'OTHER');

-- AlterTable
ALTER TABLE "BrandApplication" ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "platformHosted" "PlatformHosted";

-- CreateIndex
CREATE INDEX "BrandApplication_platformHosted_idx" ON "BrandApplication"("platformHosted");
