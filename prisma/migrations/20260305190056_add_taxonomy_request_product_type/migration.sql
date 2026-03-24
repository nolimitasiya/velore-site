-- AlterTable
ALTER TABLE "TaxonomyRequest" ADD COLUMN     "productTypes" "ProductType"[] DEFAULT ARRAY[]::"ProductType"[];
