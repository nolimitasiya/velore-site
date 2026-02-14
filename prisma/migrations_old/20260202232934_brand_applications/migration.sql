-- CreateEnum
CREATE TYPE "BrandApplicationStatus" AS ENUM ('new', 'contacted', 'invited', 'onboarded', 'rejected');

-- CreateTable
CREATE TABLE "BrandApplication" (
    "id" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "website" TEXT,
    "email" TEXT NOT NULL,
    "productTypes" TEXT[],
    "notes" TEXT,
    "status" "BrandApplicationStatus" NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrandApplication_status_createdAt_idx" ON "BrandApplication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BrandApplication_email_idx" ON "BrandApplication"("email");
