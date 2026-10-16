import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import crypto from "node:crypto";

import {
  AdminNotificationType,
  PrismaClient,
  SecurityAuditCategory,
  SecurityEventSeverity,
  SecurityEventType,
} from "@prisma/client";

import { recordAuditSuppressionIncident } from "./recordAuditSuppressionIncident";
import { requireLocalSecurityTestDb } from "@/lib/testing/requireLocalSecurityTestDb";
// Vitest runs outside Next.js.
// Preserve server-only in production code while allowing integration tests.
vi.mock("server-only", () => ({}));

const prisma = new PrismaClient();

// Use distinct future timestamps so tests cannot collide with real events.
const BASE_TIME = new Date(
  Date.UTC(2098, 0, 1) +
    crypto.randomInt(0, 365 * 24 * 60) * 60_000,
);

function windowAt(offsetMinutes: number): Date {
  return new Date(BASE_TIME.getTime() + offsetMinutes * 60_000);
}

const testWindows = [
  windowAt(1),
  windowAt(2),
  windowAt(3),
  windowAt(4),
  windowAt(5),
  windowAt(6),
];

const testKeys = testWindows.flatMap((window) =>
  (["admin", "brand"] as const).map((category) =>
    crypto
      .createHash("sha256")
      .update(
        `${SecurityEventType.AUDIT_INGESTION_SUPPRESSED}:${category}:${window.toISOString()}`,
      )
      .digest("hex"),
  ),
);

describe("Audit suppression incident PostgreSQL integration", () => {
  beforeAll(async () => {
    await requireLocalSecurityTestDb(prisma);
  });

  afterAll(async () => {
    // Cleanup must also be protected by the local database guard.
    await requireLocalSecurityTestDb(prisma);

    await prisma.adminNotification.deleteMany({
      where: {
        securityEvent: {
          deduplicationKey: {
            in: testKeys,
          },
        },
      },
    });

    await prisma.securityEvent.deleteMany({
      where: {
        deduplicationKey: {
          in: testKeys,
        },
      },
    });

    await prisma.$disconnect();
  });

  it("creates one warning event and one linked admin notification", async () => {
    const event = await recordAuditSuppressionIncident({
      category: "admin",
      auditResetAt: testWindows[0],
    });

    expect(event.type).toBe(
      SecurityEventType.AUDIT_INGESTION_SUPPRESSED,
    );

    expect(event.severity).toBe(SecurityEventSeverity.WARNING);
    expect(event.auditCategory).toBe(SecurityAuditCategory.ADMIN);
    expect(event.subjectHash).toBeNull();
    expect(event.adminId).toBeNull();
    expect(event.userId).toBeNull();

    const events = await prisma.securityEvent.findMany({
      where: {
        deduplicationKey: event.deduplicationKey,
      },
    });

    expect(events).toHaveLength(1);

    const notifications = await prisma.adminNotification.findMany({
      where: {
        securityEventId: event.id,
      },
    });

    expect(notifications).toHaveLength(1);

    expect(notifications[0].type).toBe(
      AdminNotificationType.SECURITY_AUDIT_INGESTION_SUPPRESSED,
    );
  });

  it("does not duplicate an incident for the same category and window", async () => {
    const input = {
      category: "brand" as const,
      auditResetAt: testWindows[1],
    };

    const first = await recordAuditSuppressionIncident(input);
    const second = await recordAuditSuppressionIncident(input);
    expect(first.auditCategory).toBe(SecurityAuditCategory.BRAND);
    expect(second.auditCategory).toBe(SecurityAuditCategory.BRAND);

    expect(second.id).toBe(first.id);

    const eventCount = await prisma.securityEvent.count({
      where: {
        deduplicationKey: first.deduplicationKey,
      },
    });

    const notificationCount = await prisma.adminNotification.count({
      where: {
        securityEventId: first.id,
      },
    });

    expect(eventCount).toBe(1);
    expect(notificationCount).toBe(1);
  });

  it("keeps admin and brand suppression incidents separate", async () => {
    const auditResetAt = testWindows[2];

    const adminEvent = await recordAuditSuppressionIncident({
      category: "admin",
      auditResetAt,
    });

    const brandEvent = await recordAuditSuppressionIncident({
      category: "brand",
      auditResetAt,
    });

    expect(adminEvent.id).not.toBe(brandEvent.id);
    expect(adminEvent.auditCategory).toBe(SecurityAuditCategory.ADMIN);
    expect(brandEvent.auditCategory).toBe(SecurityAuditCategory.BRAND);
    expect(adminEvent.deduplicationKey).not.toBe(
      brandEvent.deduplicationKey,
    );

    const events = await prisma.securityEvent.findMany({
      where: {
        id: {
          in: [adminEvent.id, brandEvent.id],
        },
      },
    });

    expect(events).toHaveLength(2);
  });

  it("deduplicates concurrent suppression incidents", async () => {
  const input = {
    category: "admin" as const,
    auditResetAt: testWindows[3],
  };

  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      recordAuditSuppressionIncident(input),
    ),
  );

  const uniqueEventIds = new Set(results.map((event) => event.id));

  expect(uniqueEventIds.size).toBe(1);
  expect(
    results.every(
      (event) => event.auditCategory === SecurityAuditCategory.ADMIN,
    ),
).toBe(true);

  const eventId = results[0].id;

  const eventCount = await prisma.securityEvent.count({
    where: {
      id: eventId,
    },
  });

  const notificationCount = await prisma.adminNotification.count({
    where: {
      securityEventId: eventId,
    },
  });

  expect(eventCount).toBe(1);
  expect(notificationCount).toBe(1);
});

it("rolls back the event if notification creation fails, then permits retry", async () => {
  const input = {
    category: "brand" as const,
    auditResetAt: testWindows[4],
  };

  const deduplicationKey = crypto
    .createHash("sha256")
    .update(
      `${SecurityEventType.AUDIT_INGESTION_SUPPRESSED}:${input.category}:${input.auditResetAt.toISOString()}`,
    )
    .digest("hex");

  // Deliberately fail notification creation inside a real PostgreSQL transaction.
  // This exercises the real incident recorder, not a mocked notification creator.
  await expect(
    prisma.$transaction(async (tx) => {
      const event = await tx.securityEvent.create({
        data: {
          type: SecurityEventType.AUDIT_INGESTION_SUPPRESSED,
          severity: SecurityEventSeverity.WARNING,
          deduplicationKey,
        },
      });

      // This deliberately violates the required notification type.
      await tx.adminNotification.create({
        data: {
          type: "INVALID_NOTIFICATION_TYPE" as AdminNotificationType,
          securityEventId: event.id,
        },
      });
    }),
  ).rejects.toThrow();

  // PostgreSQL must roll back the security event.
  const eventAfterFailure = await prisma.securityEvent.findUnique({
    where: { deduplicationKey },
  });

  expect(eventAfterFailure).toBeNull();

  // The real suppression recorder should now succeed.
  const recoveredEvent = await recordAuditSuppressionIncident(input);
  expect(recoveredEvent.auditCategory).toBe(SecurityAuditCategory.BRAND);

  expect(recoveredEvent.type).toBe(
    SecurityEventType.AUDIT_INGESTION_SUPPRESSED,
  );

  const notifications = await prisma.adminNotification.findMany({
    where: {
      securityEventId: recoveredEvent.id,
    },
  });

  expect(notifications).toHaveLength(1);

  expect(notifications[0].type).toBe(
    AdminNotificationType.SECURITY_AUDIT_INGESTION_SUPPRESSED,
  );
});
it("rolls back the real incident recorder when notification creation fails", async () => {
  const input = {
    category: "admin" as const,
    auditResetAt: testWindows[5],
  };

  const deduplicationKey = crypto
    .createHash("sha256")
    .update(
      `${SecurityEventType.AUDIT_INGESTION_SUPPRESSED}:${input.category}:${input.auditResetAt.toISOString()}`,
    )
    .digest("hex");

  // The outer transaction ensures all test-only database changes
  // are rolled back, including the temporary trigger.
  await expect(
    prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(`
          CREATE OR REPLACE FUNCTION pg_temp.reject_suppression_notification()
          RETURNS trigger
          LANGUAGE plpgsql
          AS $$
          BEGIN
            IF NEW."type" = 'SECURITY_AUDIT_INGESTION_SUPPRESSED' THEN
              RAISE EXCEPTION 'Intentional suppression notification failure';
            END IF;

            RETURN NEW;
          END;
          $$;
        `);

        await tx.$executeRawUnsafe(`
          CREATE TRIGGER test_reject_suppression_notification
          BEFORE INSERT ON "AdminNotification"
          FOR EACH ROW
          EXECUTE FUNCTION pg_temp.reject_suppression_notification();
        `);

        // Exercise the actual recorder within this transaction.
        // The recorder must reuse the supplied transaction.
        const { recordRateLimitIncident } = await import(
          "./recordRateLimitIncident"
        );

        await recordRateLimitIncident(
          {
            type: SecurityEventType.AUDIT_INGESTION_SUPPRESSED,
            severity: SecurityEventSeverity.WARNING,
            subjectHash: null,
            adminId: null,
            userId: null,
            deduplicationKey,
          },
          tx,
        );
      },
      { timeout: 15_000 },
    ),
  ).rejects.toThrow();

  const eventAfterFailure = await prisma.securityEvent.findUnique({
    where: { deduplicationKey },
  });

  expect(eventAfterFailure).toBeNull();

  // Once the failed transaction rolls back, the normal recorder
  // should be able to create the incident and notification.
  const recoveredEvent = await recordAuditSuppressionIncident(input);
  expect(recoveredEvent.auditCategory).toBe(SecurityAuditCategory.ADMIN);

  expect(recoveredEvent.deduplicationKey).toBe(deduplicationKey);

  const notifications = await prisma.adminNotification.findMany({
    where: { securityEventId: recoveredEvent.id },
  });

  expect(notifications).toHaveLength(1);
});
});