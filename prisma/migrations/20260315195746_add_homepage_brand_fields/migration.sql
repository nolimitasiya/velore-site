-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "homepageOrder" INTEGER,
ADD COLUMN     "showOnHomepage" BOOLEAN NOT NULL DEFAULT false;
