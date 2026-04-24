-- CreateTable
CREATE TABLE "StorefrontHero" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "desktopImageUrl" TEXT NOT NULL,
    "mobileImageUrl" TEXT,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "overlayOpacity" INTEGER NOT NULL DEFAULT 20,
    "focalX" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "focalY" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorefrontHero_pkey" PRIMARY KEY ("id")
);
