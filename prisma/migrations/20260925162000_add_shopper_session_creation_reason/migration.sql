-- CreateEnum
CREATE TYPE "ShopperSessionCreationReason" AS ENUM (
  'LOGIN',
  'REGISTRATION',
  'PASSWORD_CHANGE'
);

-- Add the column as nullable first so existing sessions remain valid.
ALTER TABLE "ShopperAuthSession"
ADD COLUMN "creationReason" "ShopperSessionCreationReason";

-- Historical sessions predate creation-reason tracking.
-- We cannot reliably reconstruct their original creation path,
-- so LOGIN is used as the historical baseline.
UPDATE "ShopperAuthSession"
SET "creationReason" = 'LOGIN'
WHERE "creationReason" IS NULL;

-- All sessions created after this migration must explicitly
-- provide their creation reason.
ALTER TABLE "ShopperAuthSession"
ALTER COLUMN "creationReason" SET NOT NULL;