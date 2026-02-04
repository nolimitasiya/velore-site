/*
  Warnings:

  - You are about to drop the column `companyId` on the `Brand` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `BrandInvite` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `ImportJob` table. All the data in the column will be lost.
  - You are about to drop the `Company` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Membership` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `brandId` to the `BrandInvite` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Brand" DROP CONSTRAINT "Brand_companyId_fkey";

-- DropForeignKey
ALTER TABLE "BrandInvite" DROP CONSTRAINT "BrandInvite_companyId_fkey";

-- DropForeignKey
ALTER TABLE "ImportJob" DROP CONSTRAINT "ImportJob_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Membership" DROP CONSTRAINT "Membership_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Membership" DROP CONSTRAINT "Membership_userId_fkey";

-- DropIndex
DROP INDEX "BrandInvite_companyId_idx";

-- DropIndex
DROP INDEX "ImportJob_companyId_idx";

-- AlterTable
ALTER TABLE "Brand" DROP COLUMN "companyId";

-- AlterTable
ALTER TABLE "BrandInvite" DROP COLUMN "companyId",
ADD COLUMN     "brandId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "ImportJob" DROP COLUMN "companyId",
ADD COLUMN     "brandId" UUID;

-- DropTable
DROP TABLE "Company";

-- DropTable
DROP TABLE "Membership";

-- CreateTable
CREATE TABLE "BrandMembership" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'viewer',

    CONSTRAINT "BrandMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrandMembership_brandId_idx" ON "BrandMembership"("brandId");

-- CreateIndex
CREATE INDEX "BrandMembership_userId_idx" ON "BrandMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandMembership_userId_brandId_key" ON "BrandMembership"("userId", "brandId");

-- CreateIndex
CREATE INDEX "BrandInvite_brandId_idx" ON "BrandInvite"("brandId");

-- CreateIndex
CREATE INDEX "ImportJob_brandId_idx" ON "ImportJob"("brandId");

-- AddForeignKey
ALTER TABLE "BrandMembership" ADD CONSTRAINT "BrandMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandMembership" ADD CONSTRAINT "BrandMembership_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandInvite" ADD CONSTRAINT "BrandInvite_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
