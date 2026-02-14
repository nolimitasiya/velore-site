/*
  Warnings:

  - Added the required column `updatedAt` to the `NewsletterSubscriber` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "NewsletterSubscriber" ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'subscribed',
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_status_idx" ON "NewsletterSubscriber"("status");
