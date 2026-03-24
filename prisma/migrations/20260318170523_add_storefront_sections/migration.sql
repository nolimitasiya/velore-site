-- CreateTable
CREATE TABLE "StorefrontSection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetCountryCode" CHAR(2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "maxItems" INTEGER NOT NULL DEFAULT 4,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorefrontSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorefrontSectionItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sectionId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorefrontSectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StorefrontSection_key_key" ON "StorefrontSection"("key");

-- CreateIndex
CREATE INDEX "StorefrontSection_targetCountryCode_idx" ON "StorefrontSection"("targetCountryCode");

-- CreateIndex
CREATE INDEX "StorefrontSection_isActive_idx" ON "StorefrontSection"("isActive");

-- CreateIndex
CREATE INDEX "StorefrontSection_sortOrder_idx" ON "StorefrontSection"("sortOrder");

-- CreateIndex
CREATE INDEX "StorefrontSection_isActive_targetCountryCode_idx" ON "StorefrontSection"("isActive", "targetCountryCode");

-- CreateIndex
CREATE INDEX "StorefrontSectionItem_sectionId_idx" ON "StorefrontSectionItem"("sectionId");

-- CreateIndex
CREATE INDEX "StorefrontSectionItem_productId_idx" ON "StorefrontSectionItem"("productId");

-- CreateIndex
CREATE INDEX "StorefrontSectionItem_sectionId_position_idx" ON "StorefrontSectionItem"("sectionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "StorefrontSectionItem_sectionId_productId_key" ON "StorefrontSectionItem"("sectionId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "StorefrontSectionItem_sectionId_position_key" ON "StorefrontSectionItem"("sectionId", "position");

-- AddForeignKey
ALTER TABLE "StorefrontSectionItem" ADD CONSTRAINT "StorefrontSectionItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "StorefrontSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorefrontSectionItem" ADD CONSTRAINT "StorefrontSectionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
