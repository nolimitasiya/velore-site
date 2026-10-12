import "server-only";

import {
  SecurityEventSeverity,
  SecurityEventType,
  type Prisma,
  type SecurityEvent,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createSecurityNotification } from "./createSecurityNotification";


type RateLimitIncidentInput = {
  type:
    | typeof SecurityEventType.ADMIN_LOGIN_RATE_LIMITED
    | typeof SecurityEventType.BRAND_LOGIN_RATE_LIMITED;
  severity: SecurityEventSeverity;
  subjectHash: string;
  adminId: string | null;
  userId: string | null;
  deduplicationKey: string;
};

type InsertedEvent = {
  id: string;
};

type TransactionClient = Prisma.TransactionClient;

async function insertIncident(
  input: RateLimitIncidentInput,
  tx: TransactionClient,
): Promise<SecurityEvent> {
  const inserted = await tx.$queryRaw<InsertedEvent[]>`
    INSERT INTO "SecurityEvent" (
      "id",
      "type",
      "severity",
      "subjectHash",
      "adminId",
      "userId",
      "deduplicationKey",
      "createdAt"
    )
    VALUES (
      gen_random_uuid()::text,
      ${input.type}::"SecurityEventType",
      ${input.severity}::"SecurityEventSeverity",
      ${input.subjectHash},
      ${input.adminId},
      ${input.userId}::uuid,
      ${input.deduplicationKey},
      NOW()
    )
    ON CONFLICT ("deduplicationKey") DO NOTHING
    RETURNING "id";
  `;

  const insertedEvent = inserted[0] ?? null;

  // Duplicate incident: return the existing record.
  // Do not create another administrator notification.
  if (!insertedEvent) {
    const existing = await tx.securityEvent.findUnique({
      where: {
        deduplicationKey: input.deduplicationKey,
      },
    });

    if (!existing) {
      throw new Error(
        "Security incident deduplication failed: existing event not found",
      );
    }

    return existing;
  }

  // New incident: retrieve the complete database record.
  const event = await tx.securityEvent.findUnique({
    where: {
      id: insertedEvent.id,
    },
  });

  if (!event) {
    throw new Error("Security incident insertion failed: new event not found");
  }

  // Only newly inserted incidents reach this point.
  await createSecurityNotification(
    {
      securityEventId: event.id,
      securityEventType: input.type,
    },
    tx,
  );

  return event;
}

/**
 * Record a rate-limit incident atomically.
 *
 * If an existing transaction is supplied, reuse it.
 * Otherwise, create a transaction for the event and notification.
 */
export async function recordRateLimitIncident(
  input: RateLimitIncidentInput,
  tx?: TransactionClient,
): Promise<SecurityEvent> {
  if (tx) {
    return insertIncident(input, tx);
  }

  return prisma.$transaction(async (transaction) =>
    insertIncident(input, transaction),
  );
}
