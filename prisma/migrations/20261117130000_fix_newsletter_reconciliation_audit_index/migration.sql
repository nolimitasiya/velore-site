-- Rename the index truncated by PostgreSQL's 63-byte identifier limit.
-- No index rebuild or data modification is required.

ALTER INDEX "NewsletterWelcomeReconciliationAudit_welcomeEventId_createdAt_i"
RENAME TO "NewsletterWelcomeReconciliationAudit_welcomeEventId_created_idx";