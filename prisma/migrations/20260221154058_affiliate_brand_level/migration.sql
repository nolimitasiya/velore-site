-- CreateEnum
CREATE TYPE "AffiliateProvider" AS ENUM ('SHOPIFY_COLLABS', 'OTHER');

-- CreateEnum
CREATE TYPE "AffiliateStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED');

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "affiliateBaseUrl" TEXT,
ADD COLUMN     "affiliateProvider" "AffiliateProvider",
ADD COLUMN     "affiliateStatus" "AffiliateStatus" NOT NULL DEFAULT 'PENDING';
