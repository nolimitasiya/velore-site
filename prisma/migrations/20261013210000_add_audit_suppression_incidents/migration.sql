-- Add a security event type for audit-ingestion suppression.
ALTER TYPE "SecurityEventType"
ADD VALUE 'AUDIT_INGESTION_SUPPRESSED';

-- Add an administrator notification type for audit-ingestion suppression.
ALTER TYPE "AdminNotificationType"
ADD VALUE 'SECURITY_AUDIT_INGESTION_SUPPRESSED';
