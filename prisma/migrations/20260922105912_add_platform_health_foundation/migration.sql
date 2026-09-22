-- CreateEnum
CREATE TYPE "PlatformHealthStatus" AS ENUM ('UNKNOWN', 'HEALTHY', 'DEGRADED', 'DOWN');

-- CreateEnum
CREATE TYPE "PlatformHealthCheckType" AS ENUM ('HTTP', 'DATABASE');

-- CreateEnum
CREATE TYPE "PlatformIncidentStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "PlatformIncidentSeverity" AS ENUM ('INFO', 'WARNING', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "PlatformIncidentType" AS ENUM ('DATABASE_CONNECTION_EXHAUSTED', 'DATABASE_ERROR', 'SERVER_ERROR', 'HEALTH_CHECK_FAILURE', 'PERFORMANCE_DEGRADATION');

-- CreateEnum
CREATE TYPE "PlatformIncidentSource" AS ENUM ('ACTIVE_HEALTH_CHECK', 'RUNTIME_ERROR', 'EXTERNAL_MONITOR', 'MANUAL');

-- CreateEnum
CREATE TYPE "PlatformHealthRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "PlatformHealthAggregatePeriod" AS ENUM ('HOURLY', 'DAILY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminNotificationType" ADD VALUE 'PLATFORM_INCIDENT_OPENED';
ALTER TYPE "AdminNotificationType" ADD VALUE 'PLATFORM_INCIDENT_ESCALATED';
ALTER TYPE "AdminNotificationType" ADD VALUE 'PLATFORM_INCIDENT_RECOVERED';

-- AlterTable
ALTER TABLE "AdminNotification" ADD COLUMN     "platformIncidentId" TEXT;

-- CreateTable
CREATE TABLE "PlatformHealthCheck" (
    "id" TEXT NOT NULL,
    "checkKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "checkType" "PlatformHealthCheckType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "path" TEXT,
    "httpMethod" TEXT,
    "intervalSeconds" INTEGER NOT NULL,
    "timeoutMs" INTEGER NOT NULL,
    "staleAfterSeconds" INTEGER NOT NULL,
    "failureThreshold" INTEGER NOT NULL DEFAULT 3,
    "recoveryThreshold" INTEGER NOT NULL DEFAULT 3,
    "status" "PlatformHealthStatus" NOT NULL DEFAULT 'UNKNOWN',
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "consecutiveSuccesses" INTEGER NOT NULL DEFAULT 0,
    "firstCheckedAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "lastHealthyAt" TIMESTAMP(3),
    "lastFailedAt" TIMESTAMP(3),
    "nextCheckAt" TIMESTAMP(3),
    "lastHttpStatus" INTEGER,
    "lastResponseTimeMs" INTEGER,
    "lastFailureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformHealthCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformHealthMeasurement" (
    "id" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "runId" TEXT,
    "status" "PlatformHealthStatus" NOT NULL,
    "httpStatus" INTEGER,
    "responseTimeMs" INTEGER,
    "failureReason" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformHealthMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformHealthRun" (
    "id" TEXT NOT NULL,
    "status" "PlatformHealthRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "checksSelected" INTEGER NOT NULL DEFAULT 0,
    "checksSucceeded" INTEGER NOT NULL DEFAULT 0,
    "checksFailed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformHealthRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformIncident" (
    "id" TEXT NOT NULL,
    "type" "PlatformIncidentType" NOT NULL,
    "source" "PlatformIncidentSource" NOT NULL,
    "status" "PlatformIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "PlatformIncidentSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformIncidentOccurrence" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "source" "PlatformIncidentSource" NOT NULL,
    "errorName" TEXT,
    "digest" TEXT,
    "method" TEXT,
    "path" TEXT,
    "routerKind" TEXT,
    "routePath" TEXT,
    "routeType" TEXT,
    "httpStatus" INTEGER,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformIncidentOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformIncidentRoute" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "routeKey" TEXT NOT NULL,
    "method" TEXT,
    "path" TEXT,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformIncidentRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformIncidentCheck" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "checkId" TEXT,
    "firstAffectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAffectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failureCount" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PlatformIncidentCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformHealthAggregate" (
    "id" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "period" "PlatformHealthAggregatePeriod" NOT NULL,
    "bucketStart" TIMESTAMP(3) NOT NULL,
    "bucketEnd" TIMESTAMP(3) NOT NULL,
    "measurementCount" INTEGER NOT NULL,
    "healthyCount" INTEGER NOT NULL DEFAULT 0,
    "degradedCount" INTEGER NOT NULL DEFAULT 0,
    "downCount" INTEGER NOT NULL DEFAULT 0,
    "unknownCount" INTEGER NOT NULL DEFAULT 0,
    "availabilityPercent" DOUBLE PRECISION,
    "responseTimeAvgMs" INTEGER,
    "responseTimeP50Ms" INTEGER,
    "responseTimeP95Ms" INTEGER,
    "responseTimeMaxMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformHealthAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformHealthCheck_checkKey_key" ON "PlatformHealthCheck"("checkKey");

-- CreateIndex
CREATE INDEX "PlatformHealthCheck_isActive_nextCheckAt_idx" ON "PlatformHealthCheck"("isActive", "nextCheckAt");

-- CreateIndex
CREATE INDEX "PlatformHealthCheck_status_nextCheckAt_idx" ON "PlatformHealthCheck"("status", "nextCheckAt");

-- CreateIndex
CREATE INDEX "PlatformHealthCheck_checkType_status_idx" ON "PlatformHealthCheck"("checkType", "status");

-- CreateIndex
CREATE INDEX "PlatformHealthCheck_lastCheckedAt_idx" ON "PlatformHealthCheck"("lastCheckedAt");

-- CreateIndex
CREATE INDEX "PlatformHealthMeasurement_checkId_checkedAt_idx" ON "PlatformHealthMeasurement"("checkId", "checkedAt");

-- CreateIndex
CREATE INDEX "PlatformHealthMeasurement_runId_idx" ON "PlatformHealthMeasurement"("runId");

-- CreateIndex
CREATE INDEX "PlatformHealthMeasurement_status_checkedAt_idx" ON "PlatformHealthMeasurement"("status", "checkedAt");

-- CreateIndex
CREATE INDEX "PlatformHealthMeasurement_checkedAt_idx" ON "PlatformHealthMeasurement"("checkedAt");

-- CreateIndex
CREATE INDEX "PlatformHealthRun_startedAt_idx" ON "PlatformHealthRun"("startedAt");

-- CreateIndex
CREATE INDEX "PlatformHealthRun_status_startedAt_idx" ON "PlatformHealthRun"("status", "startedAt");

-- CreateIndex
CREATE INDEX "PlatformIncident_status_severity_idx" ON "PlatformIncident"("status", "severity");

-- CreateIndex
CREATE INDEX "PlatformIncident_type_status_idx" ON "PlatformIncident"("type", "status");

-- CreateIndex
CREATE INDEX "PlatformIncident_openedAt_idx" ON "PlatformIncident"("openedAt");

-- CreateIndex
CREATE INDEX "PlatformIncident_lastSeenAt_idx" ON "PlatformIncident"("lastSeenAt");

-- CreateIndex
CREATE INDEX "PlatformIncidentOccurrence_incidentId_occurredAt_idx" ON "PlatformIncidentOccurrence"("incidentId", "occurredAt");

-- CreateIndex
CREATE INDEX "PlatformIncidentOccurrence_occurredAt_idx" ON "PlatformIncidentOccurrence"("occurredAt");

-- CreateIndex
CREATE INDEX "PlatformIncidentRoute_incidentId_occurrenceCount_idx" ON "PlatformIncidentRoute"("incidentId", "occurrenceCount");

-- CreateIndex
CREATE INDEX "PlatformIncidentRoute_lastSeenAt_idx" ON "PlatformIncidentRoute"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformIncidentRoute_incidentId_routeKey_key" ON "PlatformIncidentRoute"("incidentId", "routeKey");

-- CreateIndex
CREATE INDEX "PlatformIncidentCheck_checkId_lastAffectedAt_idx" ON "PlatformIncidentCheck"("checkId", "lastAffectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformIncidentCheck_incidentId_checkId_key" ON "PlatformIncidentCheck"("incidentId", "checkId");

-- CreateIndex
CREATE INDEX "PlatformHealthAggregate_period_bucketStart_idx" ON "PlatformHealthAggregate"("period", "bucketStart");

-- CreateIndex
CREATE INDEX "PlatformHealthAggregate_checkId_bucketStart_idx" ON "PlatformHealthAggregate"("checkId", "bucketStart");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformHealthAggregate_checkId_period_bucketStart_key" ON "PlatformHealthAggregate"("checkId", "period", "bucketStart");

-- CreateIndex
CREATE INDEX "AdminNotification_platformIncidentId_idx" ON "AdminNotification"("platformIncidentId");

-- AddForeignKey
ALTER TABLE "PlatformHealthMeasurement" ADD CONSTRAINT "PlatformHealthMeasurement_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "PlatformHealthCheck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformHealthMeasurement" ADD CONSTRAINT "PlatformHealthMeasurement_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PlatformHealthRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformIncidentOccurrence" ADD CONSTRAINT "PlatformIncidentOccurrence_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "PlatformIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformIncidentRoute" ADD CONSTRAINT "PlatformIncidentRoute_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "PlatformIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformIncidentCheck" ADD CONSTRAINT "PlatformIncidentCheck_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "PlatformIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformIncidentCheck" ADD CONSTRAINT "PlatformIncidentCheck_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "PlatformHealthCheck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformHealthAggregate" ADD CONSTRAINT "PlatformHealthAggregate_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "PlatformHealthCheck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNotification" ADD CONSTRAINT "AdminNotification_platformIncidentId_fkey" FOREIGN KEY ("platformIncidentId") REFERENCES "PlatformIncident"("id") ON DELETE SET NULL ON UPDATE CASCADE;
