-- AlterTable
ALTER TABLE "StyleFeedPost" ADD COLUMN     "homepageOrder" INTEGER,
ADD COLUMN     "showOnHomepage" BOOLEAN NOT NULL DEFAULT false;
