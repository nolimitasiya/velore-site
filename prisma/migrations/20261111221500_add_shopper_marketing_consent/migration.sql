-- Add optional shopper marketing consent tracking.
-- Existing shoppers remain opted out by default.
-- This migration does not subscribe anyone to Klaviyo.

ALTER TABLE "Shopper"
    ADD COLUMN "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "marketingConsentAt" TIMESTAMP(3),
    ADD COLUMN "marketingConsentSource" TEXT;