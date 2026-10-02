-- CreateTable
CREATE TABLE "ShopperEmailChange" (
    "id" TEXT NOT NULL,
    "shopperId" UUID NOT NULL,
    "newEmail" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopperEmailChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopperEmailChange_shopperId_idx" ON "ShopperEmailChange"("shopperId");

-- CreateIndex
CREATE INDEX "ShopperEmailChange_newEmail_idx" ON "ShopperEmailChange"("newEmail");

-- CreateIndex
CREATE INDEX "ShopperEmailChange_expiresAt_idx" ON "ShopperEmailChange"("expiresAt");

-- AddForeignKey
ALTER TABLE "ShopperEmailChange" ADD CONSTRAINT "ShopperEmailChange_shopperId_fkey" FOREIGN KEY ("shopperId") REFERENCES "Shopper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
