import "server-only";

import { SecurityEventSeverity, SecurityEventType } from "@prisma/client";

import { recordSecurityEvent } from "@/lib/security/securityEvents";
import { allowUnauthenticatedLoginAudit } from "@/lib/security/auditIngestion";

type LoginAuditInput = {
  type:
    | "ADMIN_LOGIN_FAILED"
    | "ADMIN_LOGIN_RATE_LIMITED"
    | "ADMIN_LOGIN_SUCCEEDED"
    | "BRAND_LOGIN_FAILED"
    | "BRAND_LOGIN_RATE_LIMITED"
    | "BRAND_LOGIN_SUCCEEDED";

  email: string;
  adminId?: string;
  userId?: string;
  rateLimitResetAt?: Date;
};

/**
 * Explicit deployment gate.
 *
 * Keep disabled until:
 * 1. The SecurityEvent migration has been applied.
 * 2. Database-backed tests have passed.
 * 3. SECURITY_AUDIT_HMAC_KEY is configured in the deployment.
 */
export function isLoginAuditEnabled(): boolean {
  return process.env.SECURITY_AUDIT_ENABLED === "true";
}

/**
 * Best-effort login audit recording.
 *
 * Audit failures must not expose internal errors or credentials.
 */
export async function recordLoginAudit(input: LoginAuditInput): Promise<void> {
  if (!isLoginAuditEnabled()) {
    return;
  }

  try {
    const isUnauthenticatedEvent =
      input.type.endsWith("_FAILED") || input.type.endsWith("_RATE_LIMITED");

    if (isUnauthenticatedEvent) {
      const allowed = await allowUnauthenticatedLoginAudit();

      if (!allowed) {
        return;
      }
    }

    await recordSecurityEvent({
      type: SecurityEventType[input.type],
      severity: isUnauthenticatedEvent
        ? SecurityEventSeverity.WARNING
        : SecurityEventSeverity.INFO,
      email: input.email,
      adminId: input.adminId,
      userId: input.userId,
      rateLimitResetAt: input.rateLimitResetAt,
    });
  } catch {
    // Audit failures must never prevent authentication.
    console.error("[security-audit] Failed to record login event");
  }
}
