/*
  Warnings:

  - You are about to drop the column `unsubToken` on the `NewsletterSubscriber` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[unsubscribeToken]` on the table `NewsletterSubscriber` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "NewsletterSubscriber_createdAt_idx";

-- DropIndex
DROP INDEX "NewsletterSubscriber_status_idx";

-- DropIndex
DROP INDEX "NewsletterSubscriber_unsubToken_key";

-- AlterTable
ALTER TABLE "NewsletterSubscriber" DROP COLUMN "unsubToken",
ADD COLUMN     "unsubscribeToken" TEXT,
ADD COLUMN     "unsubscribedAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'pending';

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_unsubscribeToken_key" ON "NewsletterSubscriber"("unsubscribeToken");
