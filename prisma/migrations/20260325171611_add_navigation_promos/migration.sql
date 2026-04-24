-- CreateEnum
CREATE TYPE "NavigationPromoKey" AS ENUM ('CLOTHING', 'OCCASION', 'NEW_IN', 'SHOP_BY_BRANDS', 'SALE');

-- CreateTable
CREATE TABLE "NavigationPromo" (
    "id" TEXT NOT NULL,
    "key" "NavigationPromoKey" NOT NULL,
    "title" TEXT NOT NULL,
    "kicker" TEXT,
    "blurb" TEXT,
    "imageUrl" TEXT,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NavigationPromo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NavigationPromo_key_key" ON "NavigationPromo"("key");
