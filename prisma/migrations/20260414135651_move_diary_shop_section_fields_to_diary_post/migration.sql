/*
  Warnings:

  - You are about to drop the column `shopSectionEyebrow` on the `DiaryPostProduct` table. All the data in the column will be lost.
  - You are about to drop the column `shopSectionSubtitle` on the `DiaryPostProduct` table. All the data in the column will be lost.
  - You are about to drop the column `shopSectionTitle` on the `DiaryPostProduct` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DiaryPost" ADD COLUMN     "shopSectionEyebrow" TEXT,
ADD COLUMN     "shopSectionSubtitle" TEXT,
ADD COLUMN     "shopSectionTitle" TEXT;

-- AlterTable
ALTER TABLE "DiaryPostProduct" DROP COLUMN "shopSectionEyebrow",
DROP COLUMN "shopSectionSubtitle",
DROP COLUMN "shopSectionTitle";
