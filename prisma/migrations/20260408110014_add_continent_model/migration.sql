-- CreateTable
CREATE TABLE "Continent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" "Region" NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Continent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Continent_slug_key" ON "Continent"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Continent_region_key" ON "Continent"("region");

-- CreateIndex
CREATE INDEX "Continent_isActive_sortOrder_idx" ON "Continent"("isActive", "sortOrder");
