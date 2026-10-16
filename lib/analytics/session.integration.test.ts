import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("server-only", () => ({}));

import { prisma } from "@/lib/prisma";
import { requireLocalSecurityTestDb } from "@/lib/testing/requireLocalSecurityTestDb";

describe("Analytics session timestamp integration", () => {
  let sessionId: string | null = null;

  const baseTime = new Date("2026-10-14T10:00:00.000Z");

  async function updateLastSeenAt(
  timestamp: Date,
  id: string,
  shopperId: string | null = null,
): Promise<number> {
  return prisma.$executeRaw`
    UPDATE "AnalyticsSession"
    SET "lastSeenAt" = GREATEST(
      "lastSeenAt",
      ${timestamp} AT TIME ZONE 'UTC'
    )
    WHERE "id" = ${id}
      AND "shopperId" IS NOT DISTINCT FROM ${shopperId}::uuid
  `;
}

  beforeAll(async () => {
    await requireLocalSecurityTestDb(prisma);

    const session = await prisma.analyticsSession.create({
      data: {
        startedAt: baseTime,
        lastSeenAt: baseTime,
      },
      select: {
        id: true,
      },
    });

    sessionId = session.id;
  });

  afterAll(async () => {
    if (sessionId) {
      await requireLocalSecurityTestDb(prisma);

      await prisma.analyticsSession.deleteMany({
        where: {
          id: sessionId,
        },
      });
    }

    await prisma.$disconnect();
  });

  it("never moves lastSeenAt backwards", async () => {
    const id = sessionId!;

    const newer = new Date("2026-10-14T10:05:00.000Z");
    const older = new Date("2026-10-14T10:03:00.000Z");

    expect(await updateLastSeenAt(newer, id)).toBe(1);
    expect(await updateLastSeenAt(older, id)).toBe(1);

    const session = await prisma.analyticsSession.findUniqueOrThrow({
      where: { id },
      select: { lastSeenAt: true },
    });

    expect(session.lastSeenAt.getTime()).toBe(newer.getTime());
  });

  it("preserves the latest timestamp during concurrent updates", async () => {
    const id = sessionId!;

    const earlier = new Date("2026-10-14T10:10:00.000Z");
    const later = new Date("2026-10-14T10:12:00.000Z");

    const results = await Promise.all([
      updateLastSeenAt(later, id),
      updateLastSeenAt(earlier, id),
    ]);

    expect(results).toEqual([1, 1]);

    const session = await prisma.analyticsSession.findUniqueOrThrow({
      where: { id },
      select: { lastSeenAt: true },
    });

    expect(session.lastSeenAt.getTime()).toBe(later.getTime());
  });

  it("reports zero updated rows for a missing session", async () => {
    const result = await updateLastSeenAt(
      new Date("2026-10-14T10:15:00.000Z"),
      "missing-security-test-session",
    );

    expect(result).toBe(0);
  });

  it("allows anonymous sessions when both shopper IDs are null", async () => {
  const result = await updateLastSeenAt(
    new Date("2026-10-14T10:20:00.000Z"),
    sessionId!,
    null,
  );

  expect(result).toBe(1);
});

it("rejects an update when the shopper identity does not match", async () => {
  const before = await prisma.analyticsSession.findUniqueOrThrow({
    where: { id: sessionId! },
    select: { lastSeenAt: true },
  });

  const result = await updateLastSeenAt(
    new Date("2026-10-14T10:25:00.000Z"),
    sessionId!,
    "00000000-0000-4000-8000-000000000001",
  );

  expect(result).toBe(0);

  const after = await prisma.analyticsSession.findUniqueOrThrow({
    where: { id: sessionId! },
    select: { lastSeenAt: true },
  });

  expect(after.lastSeenAt.getTime()).toBe(
    before.lastSeenAt.getTime(),
  );
});

});