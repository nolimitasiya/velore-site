-- CreateEnum
CREATE TYPE "ShopperSessionRevocationReason" AS ENUM ('LOGOUT', 'PASSWORD_CHANGED', 'SECURITY', 'ADMIN');

-- CreateTable
CREATE TABLE "ShopperAuthSession" (
    "id" TEXT NOT NULL,
    "shopperId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revocationReason" "ShopperSessionRevocationReason",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopperAuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopperAuthSession_tokenHash_key" ON "ShopperAuthSession"("tokenHash");

-- CreateIndex
CREATE INDEX "ShopperAuthSession_shopperId_idx" ON "ShopperAuthSession"("shopperId");

-- CreateIndex
CREATE INDEX "ShopperAuthSession_shopperId_revokedAt_idx" ON "ShopperAuthSession"("shopperId", "revokedAt");

-- CreateIndex
CREATE INDEX "ShopperAuthSession_expiresAt_idx" ON "ShopperAuthSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "ShopperAuthSession" ADD CONSTRAINT "ShopperAuthSession_shopperId_fkey" FOREIGN KEY ("shopperId") REFERENCES "Shopper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
