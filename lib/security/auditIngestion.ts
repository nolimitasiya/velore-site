import "server-only";

import { rateLimit } from "@/lib/rateLimit";

const AUDIT_INGESTION_LIMIT = 300;
const AUDIT_INGESTION_WINDOW_MS = 60_000;

/**
 * Shared PostgreSQL-backed ingestion allowance.
 *
 * This protects SecurityEvent storage from excessive
 * unauthenticated login audit writes.
 *
 * It does not rate-limit authentication requests.
 */
export async function allowUnauthenticatedLoginAudit(): Promise<boolean> {
  const result = await rateLimit({
    key: "security_audit:unauthenticated_login:global",
    limit: AUDIT_INGESTION_LIMIT,
    windowMs: AUDIT_INGESTION_WINDOW_MS,
  });

  return result.ok;
}
