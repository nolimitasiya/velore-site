import "server-only";

import crypto from "node:crypto";

import {
  SecurityAuditCategory,
  SecurityEventSeverity,
  SecurityEventType,
  type SecurityEvent,
} from "@prisma/client";

import { recordRateLimitIncident } from "./recordRateLimitIncident";
import type { AuditCategory } from "./auditIngestion";

type AuditSuppressionIncidentInput = {
  category: AuditCategory;
  auditResetAt: Date;
};

/**
 * Record a category-level audit suppression incident.
 *
 * Does not include email addresses or account identifiers.
 * Repeated calls for the same category/window are deduplicated
 * by the SecurityEvent unique deduplicationKey constraint.
 */
export async function recordAuditSuppressionIncident(
  input: AuditSuppressionIncidentInput,
): Promise<SecurityEvent> {
  if (Number.isNaN(input.auditResetAt.getTime())) {
    throw new Error("Invalid audit suppression window");
  }

  const deduplicationKey = crypto
    .createHash("sha256")
    .update(
      `${SecurityEventType.AUDIT_INGESTION_SUPPRESSED}:${input.category}:${input.auditResetAt.toISOString()}`,
    )
    .digest("hex");

  if (input.category !== "admin" && input.category !== "brand") {
    throw new Error("Invalid audit suppression category");
  }

  return recordRateLimitIncident({
    type: SecurityEventType.AUDIT_INGESTION_SUPPRESSED,
    auditCategory:
      input.category === "admin"
        ? SecurityAuditCategory.ADMIN
        : SecurityAuditCategory.BRAND,
    severity: SecurityEventSeverity.WARNING,
    subjectHash: null,
    adminId: null,
    userId: null,
    deduplicationKey,
  });
}