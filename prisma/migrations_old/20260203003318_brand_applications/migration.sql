/*
  Warnings:

  - You are about to drop the column `brandName` on the `BrandApplication` table. All the data in the column will be lost.
  - You are about to drop the column `productTypes` on the `BrandApplication` table. All the data in the column will be lost.
  - Added the required column `firstName` to the `BrandApplication` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `BrandApplication` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BrandApplication" DROP COLUMN "brandName",
DROP COLUMN "productTypes",
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "socialMedia" TEXT;
