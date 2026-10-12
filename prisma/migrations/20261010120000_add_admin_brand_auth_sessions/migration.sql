-- CreateTable
CREATE TABLE "AdminAuthSession" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminAuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandAuthSession" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandAuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminAuthSession_tokenHash_key" ON "AdminAuthSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AdminAuthSession_adminId_idx" ON "AdminAuthSession"("adminId");

-- CreateIndex
CREATE INDEX "AdminAuthSession_adminId_revokedAt_idx" ON "AdminAuthSession"("adminId", "revokedAt");

-- CreateIndex
CREATE INDEX "AdminAuthSession_expiresAt_idx" ON "AdminAuthSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "BrandAuthSession_tokenHash_key" ON "BrandAuthSession"("tokenHash");

-- CreateIndex
CREATE INDEX "BrandAuthSession_userId_idx" ON "BrandAuthSession"("userId");

-- CreateIndex
CREATE INDEX "BrandAuthSession_userId_revokedAt_idx" ON "BrandAuthSession"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "BrandAuthSession_expiresAt_idx" ON "BrandAuthSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "AdminAuthSession" ADD CONSTRAINT "AdminAuthSession_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAuthSession" ADD CONSTRAINT "BrandAuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
