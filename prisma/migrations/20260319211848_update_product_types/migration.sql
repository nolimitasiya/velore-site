/*
  Warnings:

  - The values [CO_ORDS] on the enum `ProductType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ProductType_new" AS ENUM ('ABAYA', 'DRESS', 'SKIRT', 'TOP', 'HIJAB', 'ACTIVEWEAR', 'SETS', 'MATERNITY', 'KHIMAR', 'JILBAB', 'COATS_JACKETS');
ALTER TABLE "public"."TaxonomyRequest" ALTER COLUMN "productTypes" DROP DEFAULT;
ALTER TABLE "MaterialAllowedProductType" ALTER COLUMN "productType" TYPE "ProductType_new" USING ("productType"::text::"ProductType_new");
ALTER TABLE "Product" ALTER COLUMN "productType" TYPE "ProductType_new" USING ("productType"::text::"ProductType_new");
ALTER TABLE "TaxonomyRequest" ALTER COLUMN "productTypes" TYPE "ProductType_new"[] USING ("productTypes"::text::"ProductType_new"[]);
ALTER TABLE "StyleAllowedProductType" ALTER COLUMN "productType" TYPE "ProductType_new" USING ("productType"::text::"ProductType_new");
ALTER TYPE "ProductType" RENAME TO "ProductType_old";
ALTER TYPE "ProductType_new" RENAME TO "ProductType";
DROP TYPE "public"."ProductType_old";
ALTER TABLE "TaxonomyRequest" ALTER COLUMN "productTypes" SET DEFAULT ARRAY[]::"ProductType"[];
COMMIT;
