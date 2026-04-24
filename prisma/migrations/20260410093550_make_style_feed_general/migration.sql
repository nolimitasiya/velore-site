/*
  Warnings:

  - You are about to drop the column `brandId` on the `HomepageStyleFeedItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "HomepageStyleFeedItem" DROP CONSTRAINT "HomepageStyleFeedItem_brandId_fkey";

-- DropIndex
DROP INDEX "HomepageStyleFeedItem_brandId_idx";

-- AlterTable
ALTER TABLE "HomepageStyleFeedItem" DROP COLUMN "brandId",
ADD COLUMN     "instagramHandle" TEXT,
ADD COLUMN     "title" TEXT;
