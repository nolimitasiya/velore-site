-- CreateTable
CREATE TABLE "NewsletterWelcomeReconciliationAudit" (
    "id" TEXT NOT NULL,
    "welcomeEventId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "previousStatus" "NewsletterWelcomeEventStatus" NOT NULL,
    "resultingStatus" "NewsletterWelcomeEventStatus" NOT NULL,
    "evidenceOutcome" TEXT NOT NULL,
    "evidenceReference" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterWelcomeReconciliationAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NewsletterWelcomeReconciliationAudit_welcomeEventId_createdAt_idx"
ON "NewsletterWelcomeReconciliationAudit"("welcomeEventId", "createdAt");

-- CreateIndex
CREATE INDEX "NewsletterWelcomeReconciliationAudit_adminId_createdAt_idx"
ON "NewsletterWelcomeReconciliationAudit"("adminId", "createdAt");

-- AddForeignKey
ALTER TABLE "NewsletterWelcomeReconciliationAudit"
ADD CONSTRAINT "NewsletterWelcomeReconciliationAudit_welcomeEventId_fkey"
FOREIGN KEY ("welcomeEventId")
REFERENCES "NewsletterWelcomeEvent"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;