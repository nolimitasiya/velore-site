-- ============================================================
-- Veilora Club Catalogue Health
-- ============================================================

-- CreateEnum
CREATE TYPE "CatalogueHealthTargetType" AS ENUM (
  'PRODUCT_SOURCE_URL',
  'PRODUCT_AFFILIATE_URL',
  'PRODUCT_IMAGE'
);

-- CreateEnum
CREATE TYPE "CatalogueHealthStatus" AS ENUM (
  'UNKNOWN',
  'HEALTHY',
  'DEGRADED',
  'BROKEN'
);

-- CreateEnum
CREATE TYPE "CatalogueHealthFailureType" AS ENUM (
  'INVALID_URL',
  'NOT_FOUND',
  'GONE',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'RATE_LIMITED',
  'SERVER_ERROR',
  'TIMEOUT',
  'NETWORK_ERROR',
  'REDIRECT_LOOP',
  'TOO_MANY_REDIRECTS',
  'INVALID_CONTENT_TYPE',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "CatalogueHealthIssueStatus" AS ENUM (
  'OPEN',
  'ACKNOWLEDGED',
  'RESOLVED',
  'IGNORED'
);

-- CreateEnum
CREATE TYPE "CatalogueHealthSeverity" AS ENUM (
  'WARNING',
  'CRITICAL'
);

-- Extend admin notification types
ALTER TYPE "AdminNotificationType"
ADD VALUE 'CATALOGUE_HEALTH_FAILURE';

ALTER TYPE "AdminNotificationType"
ADD VALUE 'CATALOGUE_HEALTH_RECOVERED';

-- ============================================================
-- CatalogueHealthTarget
-- Current health state for every monitored external resource
-- ============================================================

CREATE TABLE "CatalogueHealthTarget" (
  "id" TEXT NOT NULL,
  "targetType" "CatalogueHealthTargetType" NOT NULL,

  "productId" UUID,
  "productImageId" UUID,

  "url" TEXT NOT NULL,

  "status" "CatalogueHealthStatus" NOT NULL DEFAULT 'UNKNOWN',
  "failureType" "CatalogueHealthFailureType",

  "httpStatus" INTEGER,
  "finalUrl" TEXT,
  "contentType" TEXT,
  "responseTimeMs" INTEGER,

  "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
  "consecutiveSuccesses" INTEGER NOT NULL DEFAULT 0,

  "firstCheckedAt" TIMESTAMP(3),
  "lastCheckedAt" TIMESTAMP(3),
  "lastHealthyAt" TIMESTAMP(3),
  "lastFailedAt" TIMESTAMP(3),
  "nextCheckAt" TIMESTAMP(3),

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CatalogueHealthTarget_pkey"
  PRIMARY KEY ("id")
);

-- ============================================================
-- CatalogueHealthCheck
-- Individual health-check observations
-- ============================================================

CREATE TABLE "CatalogueHealthCheck" (
  "id" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,

  "status" "CatalogueHealthStatus" NOT NULL,
  "failureType" "CatalogueHealthFailureType",

  "httpStatus" INTEGER,
  "finalUrl" TEXT,
  "contentType" TEXT,
  "responseTimeMs" INTEGER,

  "errorMessage" TEXT,

  "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CatalogueHealthCheck_pkey"
  PRIMARY KEY ("id")
);

-- ============================================================
-- CatalogueHealthIssue
-- Durable incident record
-- ============================================================

CREATE TABLE "CatalogueHealthIssue" (
  "id" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,

  "status" "CatalogueHealthIssueStatus" NOT NULL DEFAULT 'OPEN',
  "severity" "CatalogueHealthSeverity" NOT NULL,

  "failureType" "CatalogueHealthFailureType" NOT NULL,

  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "ignoredAt" TIMESTAMP(3),

  "firstHttpStatus" INTEGER,
  "latestHttpStatus" INTEGER,

  "failureCount" INTEGER NOT NULL DEFAULT 1,
  "lastFailureAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CatalogueHealthIssue_pkey"
  PRIMARY KEY ("id")
);

-- Admin notifications can reference the incident that caused them
ALTER TABLE "AdminNotification"
ADD COLUMN "catalogueHealthIssueId" TEXT;

-- ============================================================
-- Target indexes
-- ============================================================

CREATE INDEX "CatalogueHealthTarget_status_nextCheckAt_idx"
ON "CatalogueHealthTarget"("status", "nextCheckAt");

CREATE INDEX "CatalogueHealthTarget_productId_idx"
ON "CatalogueHealthTarget"("productId");

CREATE INDEX "CatalogueHealthTarget_productImageId_idx"
ON "CatalogueHealthTarget"("productImageId");

CREATE INDEX "CatalogueHealthTarget_targetType_status_idx"
ON "CatalogueHealthTarget"("targetType", "status");

CREATE INDEX "CatalogueHealthTarget_lastCheckedAt_idx"
ON "CatalogueHealthTarget"("lastCheckedAt");

CREATE UNIQUE INDEX "CatalogueHealthTarget_targetType_productId_productImageId_key"
ON "CatalogueHealthTarget"("targetType", "productId", "productImageId");

-- ============================================================
-- Check history indexes
-- ============================================================

CREATE INDEX "CatalogueHealthCheck_targetId_checkedAt_idx"
ON "CatalogueHealthCheck"("targetId", "checkedAt");

CREATE INDEX "CatalogueHealthCheck_status_checkedAt_idx"
ON "CatalogueHealthCheck"("status", "checkedAt");

CREATE INDEX "CatalogueHealthCheck_failureType_checkedAt_idx"
ON "CatalogueHealthCheck"("failureType", "checkedAt");

-- ============================================================
-- Issue indexes
-- ============================================================

CREATE INDEX "CatalogueHealthIssue_status_severity_idx"
ON "CatalogueHealthIssue"("status", "severity");

CREATE INDEX "CatalogueHealthIssue_targetId_status_idx"
ON "CatalogueHealthIssue"("targetId", "status");

CREATE INDEX "CatalogueHealthIssue_openedAt_idx"
ON "CatalogueHealthIssue"("openedAt");

-- Prevent concurrent runners from creating multiple active
-- incidents for the same catalogue target.
CREATE UNIQUE INDEX "CatalogueHealthIssue_one_active_per_target"
ON "CatalogueHealthIssue"("targetId")
WHERE "status" IN ('OPEN', 'ACKNOWLEDGED');

-- ============================================================
-- Admin notification indexes
-- ============================================================

CREATE INDEX "AdminNotification_catalogueHealthIssueId_idx"
ON "AdminNotification"("catalogueHealthIssueId");

-- ============================================================
-- Foreign keys
-- ============================================================

ALTER TABLE "CatalogueHealthTarget"
ADD CONSTRAINT "CatalogueHealthTarget_productId_fkey"
FOREIGN KEY ("productId")
REFERENCES "Product"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "CatalogueHealthTarget"
ADD CONSTRAINT "CatalogueHealthTarget_productImageId_fkey"
FOREIGN KEY ("productImageId")
REFERENCES "ProductImage"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "CatalogueHealthCheck"
ADD CONSTRAINT "CatalogueHealthCheck_targetId_fkey"
FOREIGN KEY ("targetId")
REFERENCES "CatalogueHealthTarget"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "CatalogueHealthIssue"
ADD CONSTRAINT "CatalogueHealthIssue_targetId_fkey"
FOREIGN KEY ("targetId")
REFERENCES "CatalogueHealthTarget"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "AdminNotification"
ADD CONSTRAINT "AdminNotification_catalogueHealthIssueId_fkey"
FOREIGN KEY ("catalogueHealthIssueId")
REFERENCES "CatalogueHealthIssue"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;