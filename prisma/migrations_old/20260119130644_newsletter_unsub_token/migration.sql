/*
  Warnings:

  - A unique constraint covering the columns `[unsubToken]` on the table `NewsletterSubscriber` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "NewsletterSubscriber" ADD COLUMN     "unsubToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_unsubToken_key" ON "NewsletterSubscriber"("unsubToken");
