-- Restore tables that exist in the original database but were absent
-- from the committed migration history.
--
-- This migration must run before analytics_foundation, which references Shopper.
-- Production migration-history reconciliation is handled separately.

-- =========================================================
-- Independent tables
-- =========================================================

CREATE TABLE IF NOT EXISTS "Shopper" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "countryCode" CHAR(2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Shopper_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PlatformSnapshot" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "brandCount" INTEGER NOT NULL,
    "productCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AdminCalendarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT 'burgundy',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdminCalendarEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AdminNote" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdminNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AdminTodo" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "tag" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdminTodo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WellnessJournalEntry" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WellnessJournalEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WellnessPrayerRecord" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "fajr" BOOLEAN NOT NULL DEFAULT false,
    "dhuhr" BOOLEAN NOT NULL DEFAULT false,
    "asr" BOOLEAN NOT NULL DEFAULT false,
    "maghrib" BOOLEAN NOT NULL DEFAULT false,
    "isha" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WellnessPrayerRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WellnessAyatRecord" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WellnessAyatRecord_pkey" PRIMARY KEY ("id")
);

-- =========================================================
-- Dependent tables
-- =========================================================

CREATE TABLE IF NOT EXISTS "BrandApplicationNote" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrandApplicationNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BrandApplicationActivity" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrandApplicationActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WishlistItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shopperId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProductProductType" (
    "productId" UUID NOT NULL,
    "productType" "ProductType" NOT NULL,
    CONSTRAINT "ProductProductType_pkey" PRIMARY KEY ("productId", "productType")
);

-- =========================================================
-- Unique indexes
-- =========================================================

CREATE UNIQUE INDEX IF NOT EXISTS "Shopper_email_key"
    ON "Shopper"("email");

CREATE UNIQUE INDEX IF NOT EXISTS "WishlistItem_shopperId_productId_key"
    ON "WishlistItem"("shopperId", "productId");

CREATE UNIQUE INDEX IF NOT EXISTS "PlatformSnapshot_date_key"
    ON "PlatformSnapshot"("date");

CREATE UNIQUE INDEX IF NOT EXISTS "WellnessJournalEntry_date_key"
    ON "WellnessJournalEntry"("date");

CREATE UNIQUE INDEX IF NOT EXISTS "WellnessPrayerRecord_date_key"
    ON "WellnessPrayerRecord"("date");

CREATE UNIQUE INDEX IF NOT EXISTS "WellnessAyatRecord_date_key"
    ON "WellnessAyatRecord"("date");

-- =========================================================
-- Non-unique indexes
-- =========================================================

CREATE INDEX IF NOT EXISTS "BrandApplicationNote_applicationId_idx"
    ON "BrandApplicationNote"("applicationId");

CREATE INDEX IF NOT EXISTS "BrandApplicationActivity_applicationId_idx"
    ON "BrandApplicationActivity"("applicationId");

CREATE INDEX IF NOT EXISTS "WishlistItem_shopperId_idx"
    ON "WishlistItem"("shopperId");

CREATE INDEX IF NOT EXISTS "WishlistItem_productId_idx"
    ON "WishlistItem"("productId");

CREATE INDEX IF NOT EXISTS "ProductProductType_productType_idx"
    ON "ProductProductType"("productType");

CREATE INDEX IF NOT EXISTS "ProductProductType_productId_idx"
    ON "ProductProductType"("productId");

CREATE INDEX IF NOT EXISTS "AdminCalendarEvent_date_idx"
    ON "AdminCalendarEvent"("date");

CREATE INDEX IF NOT EXISTS "AdminTodo_completed_idx"
    ON "AdminTodo"("completed");

CREATE INDEX IF NOT EXISTS "WellnessJournalEntry_date_idx"
    ON "WellnessJournalEntry"("date");

CREATE INDEX IF NOT EXISTS "WellnessPrayerRecord_date_idx"
    ON "WellnessPrayerRecord"("date");

CREATE INDEX IF NOT EXISTS "WellnessAyatRecord_date_idx"
    ON "WellnessAyatRecord"("date");

-- =========================================================
-- Foreign keys
-- =========================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'BrandApplicationNote_applicationId_fkey'
          AND conrelid = '"BrandApplicationNote"'::regclass
    ) THEN
        ALTER TABLE "BrandApplicationNote"
            ADD CONSTRAINT "BrandApplicationNote_applicationId_fkey"
            FOREIGN KEY ("applicationId")
            REFERENCES "BrandApplication"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'BrandApplicationActivity_applicationId_fkey'
          AND conrelid = '"BrandApplicationActivity"'::regclass
    ) THEN
        ALTER TABLE "BrandApplicationActivity"
            ADD CONSTRAINT "BrandApplicationActivity_applicationId_fkey"
            FOREIGN KEY ("applicationId")
            REFERENCES "BrandApplication"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'WishlistItem_shopperId_fkey'
          AND conrelid = '"WishlistItem"'::regclass
    ) THEN
        ALTER TABLE "WishlistItem"
            ADD CONSTRAINT "WishlistItem_shopperId_fkey"
            FOREIGN KEY ("shopperId")
            REFERENCES "Shopper"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'WishlistItem_productId_fkey'
          AND conrelid = '"WishlistItem"'::regclass
    ) THEN
        ALTER TABLE "WishlistItem"
            ADD CONSTRAINT "WishlistItem_productId_fkey"
            FOREIGN KEY ("productId")
            REFERENCES "Product"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ProductProductType_productId_fkey'
          AND conrelid = '"ProductProductType"'::regclass
    ) THEN
        ALTER TABLE "ProductProductType"
            ADD CONSTRAINT "ProductProductType_productId_fkey"
            FOREIGN KEY ("productId")
            REFERENCES "Product"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
