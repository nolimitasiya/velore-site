-- Add wishlist attribution to both analytics source enums.
ALTER TYPE "AnalyticsSourcePage" ADD VALUE IF NOT EXISTS 'WISHLIST';
ALTER TYPE "ClickSourcePage" ADD VALUE IF NOT EXISTS 'WISHLIST';