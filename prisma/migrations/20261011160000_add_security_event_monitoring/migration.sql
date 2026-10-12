-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM (
    'ADMIN_LOGIN_FAILED',
    'ADMIN_LOGIN_RATE_LIMITED',
    'ADMIN_LOGIN_SUCCEEDED',
    'BRAND_LOGIN_FAILED',
    'BRAND_LOGIN_RATE_LIMITED',
    'BRAND_LOGIN_SUCCEEDED',
    'PASSWORD_RESET_COMPLETED',
    'SESSION_REVOKED'
);

-- CreateEnum
CREATE TYPE "SecurityEventSeverity" AS ENUM (
    'INFO',
    'WARNING',
    'CRITICAL'
);

-- AlterEnum
ALTER TYPE "AdminNotificationType"
ADD VALUE 'SECURITY_ADMIN_LOGIN_RATE_LIMITED';

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "type" "SecurityEventType" NOT NULL,
    "severity" "SecurityEventSeverity" NOT NULL DEFAULT 'INFO',
    "subjectHash" TEXT,
    "adminId" TEXT,
    "userId" UUID,
    "deduplicationKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "AdminNotification"
ADD COLUMN "securityEventId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SecurityEvent_deduplicationKey_key"
ON "SecurityEvent"("deduplicationKey");

-- CreateIndex
CREATE INDEX "SecurityEvent_type_createdAt_idx"
ON "SecurityEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_subjectHash_createdAt_idx"
ON "SecurityEvent"("subjectHash", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_severity_createdAt_idx"
ON "SecurityEvent"("severity", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_adminId_createdAt_idx"
ON "SecurityEvent"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_userId_createdAt_idx"
ON "SecurityEvent"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdminNotification_securityEventId_key"
ON "AdminNotification"("securityEventId");

-- AddForeignKey
ALTER TABLE "AdminNotification"
ADD CONSTRAINT "AdminNotification_securityEventId_fkey"
FOREIGN KEY ("securityEventId")
REFERENCES "SecurityEvent"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;