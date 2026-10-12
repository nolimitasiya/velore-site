import "server-only";

import crypto from "node:crypto";

import {
  SecurityEventSeverity,
  SecurityEventType,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { recordRateLimitIncident } from "./recordRateLimitIncident";

type SecurityEventInput = {
  type: SecurityEventType;
  severity?: SecurityEventSeverity;
  email?: string;
  adminId?: string;
  userId?: string;
  rateLimitResetAt?: Date;
};

function getSubjectHash(email: string): string {
  const key = process.env.SECURITY_AUDIT_HMAC_KEY;

  if (!key || key.length < 32) {
    throw new Error("SECURITY_AUDIT_HMAC_KEY is not configured");
  }

  const normalizedEmail = email.trim().toLowerCase();

  return crypto.createHmac("sha256", key).update(normalizedEmail).digest("hex");
}
function getDeduplicationKey(
  type: SecurityEventType,
  subjectHash: string,
  resetAt: Date,
): string {
  return crypto
    .createHash("sha256")
    .update(`${type}:${subjectHash}:${resetAt.toISOString()}`)
    .digest("hex");
}

/**
 * Record a structured security event.
 *
 * Never pass passwords, session tokens, reset tokens,
 * raw request headers, or other authentication secrets.
 */
export async function recordSecurityEvent(
  input: SecurityEventInput,
  tx?: Prisma.TransactionClient,
) {
  const db = tx ?? prisma;

  const subjectHash = input.email ? getSubjectHash(input.email) : null;

  const isRateLimited =
    input.type === SecurityEventType.ADMIN_LOGIN_RATE_LIMITED ||
    input.type === SecurityEventType.BRAND_LOGIN_RATE_LIMITED;

  if (isRateLimited && (!subjectHash || !input.rateLimitResetAt)) {
    throw new Error(
      "Rate-limited security events require an email and reset time",
    );
  }

  const deduplicationKey =
    isRateLimited && subjectHash && input.rateLimitResetAt
      ? getDeduplicationKey(input.type, subjectHash, input.rateLimitResetAt)
      : null;

  if (deduplicationKey && subjectHash && isRateLimited) {
    return recordRateLimitIncident(
      {
        type: input.type as
          | typeof SecurityEventType.ADMIN_LOGIN_RATE_LIMITED
          | typeof SecurityEventType.BRAND_LOGIN_RATE_LIMITED,
        severity: input.severity ?? SecurityEventSeverity.WARNING,
        subjectHash,
        adminId: input.adminId ?? null,
        userId: input.userId ?? null,
        deduplicationKey,
      },
      tx,
    );
  }

  return db.securityEvent.create({
    data: {
      type: input.type,
      severity: input.severity ?? SecurityEventSeverity.INFO,
      subjectHash,
      adminId: input.adminId ?? null,
      userId: input.userId ?? null,
      deduplicationKey: null,
    },
  });
}
