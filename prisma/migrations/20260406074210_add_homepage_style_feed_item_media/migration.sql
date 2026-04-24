-- AlterTable
ALTER TABLE "HomepageStyleFeedItem" ADD COLUMN     "imageAlt" TEXT,
ADD COLUMN     "imageFocalX" DOUBLE PRECISION NOT NULL DEFAULT 50,
ADD COLUMN     "imageFocalY" DOUBLE PRECISION NOT NULL DEFAULT 50,
ADD COLUMN     "imageHeight" INTEGER,
ADD COLUMN     "imagePath" TEXT,
ADD COLUMN     "imageWidth" INTEGER;
