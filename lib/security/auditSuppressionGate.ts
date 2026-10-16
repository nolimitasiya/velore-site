import "server-only";

import crypto from "node:crypto";

import { rateLimit } from "@/lib/rateLimit";
import type { AuditCategory } from "./auditIngestion";

const SUPPRESSION_REPORTING_WINDOW_MS = 60_000;

/**
 * Allows one suppression-reporting attempt per category
 * and audit-ingestion window.
 *
 * The gate controls reporting only, never authentication.
 */
export async function shouldReportAuditSuppression(
  category: AuditCategory,
  auditResetAt: Date,
): Promise<boolean> {
  if (Number.isNaN(auditResetAt.getTime())) {
    throw new Error("Invalid audit suppression window");
  }

  const windowKey = crypto
    .createHash("sha256")
    .update(`${category}:${auditResetAt.toISOString()}`)
    .digest("hex");

  const result = await rateLimit({
    key: `security_audit:suppression_report:${windowKey}`,
    limit: 1,
    windowMs: SUPPRESSION_REPORTING_WINDOW_MS,
  });

  return result.ok;
}