-- CreateEnum
CREATE TYPE "ShopperEmailVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'LOCKED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ShopperWelcomeEmailStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "Shopper" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "welcomeEmailAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "welcomeEmailClaimedAt" TIMESTAMP(3),
ADD COLUMN     "welcomeEmailNextAttemptAt" TIMESTAMP(3),
ADD COLUMN     "welcomeEmailProviderId" TEXT,
ADD COLUMN     "welcomeEmailSentAt" TIMESTAMP(3),
ADD COLUMN     "welcomeEmailStatus" "ShopperWelcomeEmailStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "ShopperEmailVerification" (
    "id" TEXT NOT NULL,
    "shopperId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "status" "ShopperEmailVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopperEmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopperEmailVerification_shopperId_idx" ON "ShopperEmailVerification"("shopperId");

-- CreateIndex
CREATE INDEX "ShopperEmailVerification_shopperId_status_idx" ON "ShopperEmailVerification"("shopperId", "status");

-- CreateIndex
CREATE INDEX "ShopperEmailVerification_email_idx" ON "ShopperEmailVerification"("email");

-- CreateIndex
CREATE INDEX "ShopperEmailVerification_expiresAt_idx" ON "ShopperEmailVerification"("expiresAt");

-- AddForeignKey
ALTER TABLE "ShopperEmailVerification" ADD CONSTRAINT "ShopperEmailVerification_shopperId_fkey" FOREIGN KEY ("shopperId") REFERENCES "Shopper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
