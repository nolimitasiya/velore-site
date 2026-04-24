-- AlterEnum
ALTER TYPE "NavigationPromoKey" ADD VALUE 'ACCESSORIES';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProductType" ADD VALUE 'HOODIE_SWEATSHIRT';
ALTER TYPE "ProductType" ADD VALUE 'PANTS';
ALTER TYPE "ProductType" ADD VALUE 'BLAZER';
ALTER TYPE "ProductType" ADD VALUE 'T_SHIRT';
ALTER TYPE "ProductType" ADD VALUE 'ACCESSORIES';
