-- Bring the database in line with the existing StyleFeedPost Prisma schema.

ALTER TABLE "StyleFeedPost"
ADD COLUMN "brandsMenuOrder" INTEGER,
ADD COLUMN "showInBrandsMenu" BOOLEAN NOT NULL DEFAULT false;
