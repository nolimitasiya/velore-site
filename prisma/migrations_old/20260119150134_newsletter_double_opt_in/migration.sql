/*
  Warnings:

  - You are about to drop the column `firstName` on the `NewsletterSubscriber` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[confirmToken]` on the table `NewsletterSubscriber` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "NewsletterSubscriber" DROP COLUMN "firstName",
ADD COLUMN     "confirmToken" TEXT,
ADD COLUMN     "confirmedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_confirmToken_key" ON "NewsletterSubscriber"("confirmToken");
