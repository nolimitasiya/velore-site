import "server-only";

import { rateLimit } from "@/lib/rateLimit";

export type AuditCategory = "admin" | "brand";

const AUDIT_INGESTION_LIMIT = 300;
const AUDIT_INGESTION_WINDOW_MS = 60_000;

export type AuditIngestionDecision = {
  allowed: boolean;
  category: AuditCategory;
  resetAt: Date;
};

/**
 * Returns an audit-ingestion decision.
 *
 * This controls audit recording only.
 * It does not control authentication.
 */
export async function checkUnauthenticatedLoginAudit(
  category: AuditCategory,
): Promise<AuditIngestionDecision> {
  const result = await rateLimit({
    key: `security_audit:unauthenticated_login:${category}`,
    limit: AUDIT_INGESTION_LIMIT,
    windowMs: AUDIT_INGESTION_WINDOW_MS,
  });

  return {
    allowed: result.ok,
    category,
    resetAt: result.resetAt,
  };
}

/**
 * Compatibility helper for existing callers.
 */
export async function allowUnauthenticatedLoginAudit(
  category: AuditCategory,
): Promise<boolean> {
  const decision = await checkUnauthenticatedLoginAudit(category);

  return decision.allowed;
}