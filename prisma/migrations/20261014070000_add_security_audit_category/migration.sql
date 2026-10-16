CREATE TYPE "SecurityAuditCategory" AS ENUM ('ADMIN', 'BRAND');

ALTER TABLE "SecurityEvent"
ADD COLUMN "auditCategory" "SecurityAuditCategory";

CREATE INDEX "SecurityEvent_auditCategory_createdAt_idx"
ON "SecurityEvent"("auditCategory", "createdAt");