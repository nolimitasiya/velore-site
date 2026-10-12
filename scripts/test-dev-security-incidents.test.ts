import { assertDevelopmentDatabase } from "./assertDevelopmentDatabase";
import { randomUUID } from "node:crypto";
import { test, vi, expect } from "vitest";
import {
  SecurityEventSeverity,
  SecurityEventType,
  AdminNotificationType,
} from "@prisma/client";

vi.mock("server-only", () => ({}));

import { prisma } from "@/lib/prisma";
import { recordRateLimitIncident } from "@/lib/security/recordRateLimitIncident";

test.skipIf(process.env.VEILORA_DEV_INTEGRATION_TEST !== "true")("development PostgreSQL security incidents", async () => {
  assertDevelopmentDatabase();

  const prefix = `integration:security:${randomUUID()}`;

  const adminKey = `${prefix}:admin`;
  const brandKey = `${prefix}:brand`;
  const rollbackKey = `${prefix}:rollback`;

  const subjectHash = "a".repeat(64);

  try {
    console.log("TEST 1: Administrator security incident");

    const adminInput = {
      type: SecurityEventType.ADMIN_LOGIN_RATE_LIMITED,
      severity: SecurityEventSeverity.WARNING,
      subjectHash,
      adminId: null,
      userId: null,
      deduplicationKey: adminKey,
    };

    const first = await recordRateLimitIncident(adminInput);

    const adminEvents = await prisma.securityEvent.findMany({
      where: { deduplicationKey: adminKey },
    });

    expect(adminEvents).toHaveLength(1);
    expect(first.id).toBe(adminEvents[0].id);

    const adminNotifications = await prisma.adminNotification.findMany({
      where: { securityEventId: first.id },
    });

    expect(adminNotifications).toHaveLength(1);
    expect(adminNotifications[0].type).toBe(
      AdminNotificationType.SECURITY_ADMIN_LOGIN_RATE_LIMITED,
    );

    console.log("PASS: Administrator incident and notification created.");

    console.log("TEST 2: Duplicate incident");

    const second = await recordRateLimitIncident(adminInput);

    expect(second.id).toBe(first.id);

    expect(
      await prisma.securityEvent.count({
        where: { deduplicationKey: adminKey },
      }),
    ).toBe(1);

    expect(
      await prisma.adminNotification.count({
        where: { securityEventId: first.id },
      }),
    ).toBe(1);

    console.log("PASS: Duplicate incident did not create duplicate records.");

    console.log("TEST 3: Brand security incident");

    const brand = await recordRateLimitIncident({
      ...adminInput,
      type: SecurityEventType.BRAND_LOGIN_RATE_LIMITED,
      deduplicationKey: brandKey,
    });

    expect(
      await prisma.securityEvent.count({
        where: { deduplicationKey: brandKey },
      }),
    ).toBe(1);

    expect(
      await prisma.adminNotification.count({
        where: { securityEventId: brand.id },
      }),
    ).toBe(0);

    console.log("PASS: Brand incident created without admin notification.");

    console.log("TEST 4: Transaction rollback");

    await expect(
      prisma.$transaction(async (tx) => {
        await recordRateLimitIncident(
          {
            ...adminInput,
            deduplicationKey: rollbackKey,
          },
          tx,
        );

        throw new Error("Intentional integration-test rollback");
      }),
    ).rejects.toThrow("Intentional integration-test rollback");

    expect(
      await prisma.securityEvent.count({
        where: { deduplicationKey: rollbackKey },
      }),
    ).toBe(0);

    expect(
      await prisma.adminNotification.count({
        where: {
          securityEvent: {
            is: {
              deduplicationKey: rollbackKey,
            },
          },
        },
      }),
    ).toBe(0);

    console.log("PASS: Transaction rollback removed the event and notification.");

    console.log("ALL SECURITY INCIDENT INTEGRATION TESTS PASSED.");
  } finally {
    const events = await prisma.securityEvent.findMany({
      where: {
        deduplicationKey: {
          startsWith: prefix,
        },
      },
      select: { id: true },
    });

    const ids = events.map((event) => event.id);

    if (ids.length > 0) {
      await prisma.adminNotification.deleteMany({
        where: { securityEventId: { in: ids } },
      });

      await prisma.securityEvent.deleteMany({
        where: { id: { in: ids } },
      });
    }

    await prisma.$disconnect();
  }
}, 60000);
