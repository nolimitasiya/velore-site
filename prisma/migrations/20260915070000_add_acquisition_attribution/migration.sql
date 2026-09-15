ALTER TABLE "AnalyticsSession"
ADD COLUMN "acquisitionSource" TEXT,
ADD COLUMN "acquisitionMedium" TEXT,
ADD COLUMN "acquisitionCampaign" TEXT,
ADD COLUMN "acquisitionContent" TEXT,
ADD COLUMN "acquisitionTerm" TEXT,
ADD COLUMN "landingPath" TEXT,
ADD COLUMN "referrer" TEXT;

CREATE INDEX "AnalyticsSession_acquisitionSource_startedAt_idx"
ON "AnalyticsSession"("acquisitionSource", "startedAt");

CREATE INDEX "AnalyticsSession_acquisitionCampaign_startedAt_idx"
ON "AnalyticsSession"("acquisitionCampaign", "startedAt");


ALTER TABLE "WaitlistSubscriber"
ADD COLUMN "analyticsSessionId" TEXT,
ADD COLUMN "acquisitionSource" TEXT,
ADD COLUMN "acquisitionMedium" TEXT,
ADD COLUMN "acquisitionCampaign" TEXT,
ADD COLUMN "acquisitionContent" TEXT,
ADD COLUMN "acquisitionTerm" TEXT,
ADD COLUMN "landingPath" TEXT,
ADD COLUMN "referrer" TEXT;

CREATE INDEX "WaitlistSubscriber_acquisitionSource_createdAt_idx"
ON "WaitlistSubscriber"("acquisitionSource", "createdAt");

CREATE INDEX "WaitlistSubscriber_acquisitionCampaign_createdAt_idx"
ON "WaitlistSubscriber"("acquisitionCampaign", "createdAt");