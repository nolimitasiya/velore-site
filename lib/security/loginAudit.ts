import "server-only";

import { SecurityEventSeverity, SecurityEventType } from "@prisma/client";

import { recordSecurityEvent } from "@/lib/security/securityEvents";
import { checkUnauthenticatedLoginAudit } from "@/lib/security/auditIngestion";
import { reportAuditSuppression } from "@/lib/security/auditSuppressionReporter";

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
 * 1. The SecurityEvent migrations have been applied.
 * 2. Database-backed tests have passed.
 * 3. SECURITY_AUDIT_HMAC_KEY is configured.
 * 4. The production rollout is explicitly approved.
 */
export function isLoginAuditEnabled(): boolean {
  return process.env.SECURITY_AUDIT_ENABLED === "true";
}

/**
 * Best-effort login audit recording.
 *
 * Audit failures must never prevent authentication.
 * Sensitive details must not appear in error logs.
 */
export async function recordLoginAudit(
  input: LoginAuditInput,
): Promise<void> {
  if (!isLoginAuditEnabled()) {
    return;
  }

  try {
    const isUnauthenticatedEvent =
      input.type.endsWith("_FAILED") ||
      input.type.endsWith("_RATE_LIMITED");

    if (isUnauthenticatedEvent) {
      const category = input.type.startsWith("ADMIN_")
        ? "admin"
        : "brand";

      const decision = await checkUnauthenticatedLoginAudit(category);

      if (!decision.allowed) {
        await reportAuditSuppression(
          decision.category,
          decision.resetAt,
        );

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
    // Never expose emails, tokens or database error details.
    console.error("[security-audit] Failed to record login event");
  }
}