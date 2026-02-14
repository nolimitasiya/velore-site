-- CreateTable
CREATE TABLE "BrandInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "companyId" UUID NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'owner',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandInvite_tokenHash_key" ON "BrandInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "BrandInvite_email_idx" ON "BrandInvite"("email");

-- CreateIndex
CREATE INDEX "BrandInvite_companyId_idx" ON "BrandInvite"("companyId");

-- AddForeignKey
ALTER TABLE "BrandInvite" ADD CONSTRAINT "BrandInvite_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
