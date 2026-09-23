-- AlterTable
ALTER TABLE "PlatformIncident" ADD COLUMN     "mergedIntoId" TEXT;

-- CreateIndex
CREATE INDEX "PlatformIncident_mergedIntoId_idx" ON "PlatformIncident"("mergedIntoId");

-- AddForeignKey
ALTER TABLE "PlatformIncident" ADD CONSTRAINT "PlatformIncident_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "PlatformIncident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

