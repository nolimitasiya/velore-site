/*
  Warnings:

  - The values [Next_Day] on the enum `Badge` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Badge_new" AS ENUM ('bestseller', 'new_in', 'editor_pick', 'modest_essential', 'limited_stock', 'sale', 'ramadan_edit', 'eid_edit', 'workwear', 'next_day');
ALTER TABLE "public"."Product" ALTER COLUMN "badges" DROP DEFAULT;
ALTER TABLE "Product" ALTER COLUMN "badges" TYPE "Badge_new"[] USING ("badges"::text::"Badge_new"[]);
ALTER TYPE "Badge" RENAME TO "Badge_old";
ALTER TYPE "Badge_new" RENAME TO "Badge";
DROP TYPE "public"."Badge_old";
ALTER TABLE "Product" ALTER COLUMN "badges" SET DEFAULT ARRAY[]::"Badge"[];
COMMIT;
