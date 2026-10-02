-- CreateEnum
CREATE TYPE "ShopperEmailChangeStatus" AS ENUM ('PENDING', 'VERIFIED', 'SUPERSEDED', 'EXPIRED', 'LOCKED');

-- AlterTable
ALTER TABLE "ShopperEmailChange" ADD COLUMN     "status" "ShopperEmailChangeStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "ShopperEmailChange_shopperId_status_idx" ON "ShopperEmailChange"("shopperId", "status");
