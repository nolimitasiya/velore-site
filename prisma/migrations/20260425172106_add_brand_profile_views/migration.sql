-- This migration was already applied to the database.
-- Recreated locally to restore Prisma migration history sync.

CREATE TABLE IF NOT EXISTS "BrandProfileView" (
  "id" TEXT NOT NULL,
  "brandId" UUID NOT NULL,
  "sourcePath" TEXT,
  "countryCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BrandProfileView_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BrandProfileView_brandId_idx" ON "BrandProfileView"("brandId");
CREATE INDEX IF NOT EXISTS "BrandProfileView_createdAt_idx" ON "BrandProfileView"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BrandProfileView_brandId_fkey'
  ) THEN
    ALTER TABLE "BrandProfileView"
    ADD CONSTRAINT "BrandProfileView_brandId_fkey"
    FOREIGN KEY ("brandId") REFERENCES "Brand"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;