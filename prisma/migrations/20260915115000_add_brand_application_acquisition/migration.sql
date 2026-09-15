ALTER TABLE "BrandApplication"
ADD COLUMN "analyticsSessionId" TEXT,
ADD COLUMN "acquisitionSource" TEXT,
ADD COLUMN "acquisitionMedium" TEXT,
ADD COLUMN "acquisitionCampaign" TEXT,
ADD COLUMN "acquisitionContent" TEXT,
ADD COLUMN "acquisitionTerm" TEXT,
ADD COLUMN "landingPath" TEXT,
ADD COLUMN "referrer" TEXT;

CREATE INDEX "BrandApplication_acquisitionSource_createdAt_idx"
ON "BrandApplication"("acquisitionSource", "createdAt");

CREATE INDEX "BrandApplication_acquisitionCampaign_createdAt_idx"
ON "BrandApplication"("acquisitionCampaign", "createdAt");