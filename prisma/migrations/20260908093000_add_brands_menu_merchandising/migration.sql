ALTER TABLE "Brand"
ADD COLUMN IF NOT EXISTS "showInBrandsMenu" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "brandsMenuOrder" INTEGER;

CREATE INDEX IF NOT EXISTS "Brand_showInBrandsMenu_brandsMenuOrder_idx"
ON "Brand"("showInBrandsMenu", "brandsMenuOrder");