-- Restore schema changes that exist in production but were absent
-- from the tracked Prisma migration history.
--
-- This migration is designed for:
-- 1. Fresh databases missing these definitions.
-- 2. Existing databases where these definitions already exist.
--
-- Existing definitions must be verified separately before deployment.

-- ============================================================
-- ENUM TYPES
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = current_schema()
          AND t.typname = 'ReturnsPaidBy'
    ) THEN
        CREATE TYPE "ReturnsPaidBy" AS ENUM (
            'BUYER', 'BRAND', 'NO_RETURNS'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = current_schema()
          AND t.typname = 'BrandApplicationSource'
    ) THEN
        CREATE TYPE "BrandApplicationSource" AS ENUM (
            'ORGANIC', 'MANUAL', 'INSTAGRAM_OUTREACH',
            'EMAIL_OUTREACH', 'REFERRAL', 'OTHER'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = current_schema()
          AND t.typname = 'LeadTemperature'
    ) THEN
        CREATE TYPE "LeadTemperature" AS ENUM (
            'HOT', 'WARM', 'COLD'
        );
    END IF;
END
$$;

-- ============================================================
-- ENUM VALUES
-- ============================================================

ALTER TYPE "AnalyticsSourcePage"
    ADD VALUE IF NOT EXISTS 'CONTINENT';

ALTER TYPE "AnalyticsSourcePage"
    ADD VALUE IF NOT EXISTS 'EMERGING_BRANDS';

ALTER TYPE "ClickSourcePage"
    ADD VALUE IF NOT EXISTS 'CATEGORY';

ALTER TYPE "ClickSourcePage"
    ADD VALUE IF NOT EXISTS 'PRODUCT';

ALTER TYPE "ClickSourcePage"
    ADD VALUE IF NOT EXISTS 'DIARY';

ALTER TYPE "ClickSourcePage"
    ADD VALUE IF NOT EXISTS 'STYLE_FEED';

ALTER TYPE "ClickSourcePage"
    ADD VALUE IF NOT EXISTS 'CONTINENT';

ALTER TYPE "ClickSourcePage"
    ADD VALUE IF NOT EXISTS 'EMERGING_BRANDS';

ALTER TYPE "ClickSourcePage"
    ADD VALUE IF NOT EXISTS 'OTHER';

ALTER TYPE "PasswordResetUserType"
    ADD VALUE IF NOT EXISTS 'SHOPPER';

-- ============================================================
-- AFFILIATE CLICK
-- ============================================================

ALTER TABLE "AffiliateClick"
    ADD COLUMN IF NOT EXISTS "diaryPostId" TEXT;

ALTER TABLE "AffiliateClick"
    ADD COLUMN IF NOT EXISTS "type"
    TEXT NOT NULL DEFAULT 'SHOP_AT';

-- ============================================================
-- BRAND
-- ============================================================

ALTER TABLE "Brand"
    ADD COLUMN IF NOT EXISTS "contactEmail" TEXT,
    ADD COLUMN IF NOT EXISTS "contactName" TEXT,
    ADD COLUMN IF NOT EXISTS "contactPhone" TEXT,
    ADD COLUMN IF NOT EXISTS "returnWindowDays" INTEGER,
    ADD COLUMN IF NOT EXISTS "returnsPaidBy" "ReturnsPaidBy",
    ADD COLUMN IF NOT EXISTS "shippingCountryCodes"
        TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "shippingDomestic" TEXT,
    ADD COLUMN IF NOT EXISTS "shippingInternational" TEXT;

-- ============================================================
-- BRAND APPLICATION
-- ============================================================

ALTER TABLE "BrandApplication"
    ADD COLUMN IF NOT EXISTS "applicationSource"
        "BrandApplicationSource" NOT NULL DEFAULT 'ORGANIC',
    ADD COLUMN IF NOT EXISTS "leadScore" INTEGER,
    ADD COLUMN IF NOT EXISTS "leadTemperature" "LeadTemperature",
    ADD COLUMN IF NOT EXISTS "nextFollowUpAt" TIMESTAMP(3);

-- ============================================================
-- PRODUCT
-- ============================================================

ALTER TABLE "Product"
    ADD COLUMN IF NOT EXISTS "polyesterFree"
    BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS
    "AffiliateClick_diaryPostId_clickedAt_idx"
    ON "AffiliateClick"("diaryPostId", "clickedAt");

CREATE INDEX IF NOT EXISTS
    "AffiliateClick_type_clickedAt_idx"
    ON "AffiliateClick"("type", "clickedAt");

-- ============================================================
-- FOREIGN KEY
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'AffiliateClick_diaryPostId_fkey'
          AND conrelid = '"AffiliateClick"'::regclass
    ) THEN
        ALTER TABLE "AffiliateClick"
            ADD CONSTRAINT "AffiliateClick_diaryPostId_fkey"
            FOREIGN KEY ("diaryPostId")
            REFERENCES "DiaryPost"("id")
            ON DELETE SET NULL
            ON UPDATE CASCADE;
    END IF;
END
$$;
