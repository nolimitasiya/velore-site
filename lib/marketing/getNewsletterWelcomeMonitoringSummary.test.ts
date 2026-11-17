import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

vi.mock("server-only", () => ({}));

import { getNewsletterWelcomeMonitoringSummary } from "./getNewsletterWelcomeMonitoringSummary";

const cutoff = new Date("2026-11-13T12:00:00.000Z");

function makeDb(
  counts: [number, number, number] = [0, 0, 0],
  oldest: Date | null = null
) {
  const db = {
    newsletterWelcomeEvent: {
      count: vi.fn()
        .mockResolvedValueOnce(counts[0])
        .mockResolvedValueOnce(counts[1])
        .mockResolvedValueOnce(counts[2]),
      findFirst: vi.fn().mockResolvedValue(
        oldest ? { createdAt: oldest } : null
      ),
    },
  };

  return db;
}

function run(db: ReturnType<typeof makeDb>, staleBefore = cutoff) {
  return getNewsletterWelcomeMonitoringSummary(
    db as unknown as PrismaClient,
    { staleBefore }
  );
}

describe("newsletter welcome monitoring summary", () => {
  it("reports a clear queue", async () => {
    const result = await run(makeDb());

    expect(result).toEqual({
      unknownCount: 0,
      staleProcessingCount: 0,
      staleSubmittingCount: 0,
      oldestUnresolvedCreatedAt: null,
      requiresManualReconciliation: false,
    });
  });

  it("flags UNKNOWN events", async () => {
    const result = await run(makeDb([2, 0, 0]));

    expect(result.unknownCount).toBe(2);
    expect(result.requiresManualReconciliation).toBe(true);
  });

  it("detects stale PROCESSING events", async () => {
    const db = makeDb([0, 3, 0]);

    const result = await run(db);

    expect(result.staleProcessingCount).toBe(3);
    expect(result.requiresManualReconciliation).toBe(true);

    expect(db.newsletterWelcomeEvent.count).toHaveBeenNthCalledWith(
      2,
      {
        where: {
          status: "PROCESSING",
          claimedAt: { lt: cutoff },
        },
      }
    );
  });

  it("detects stale SUBMITTING events", async () => {
    const db = makeDb([0, 0, 4]);

    const result = await run(db);

    expect(result.staleSubmittingCount).toBe(4);
    expect(result.requiresManualReconciliation).toBe(true);

    expect(db.newsletterWelcomeEvent.count).toHaveBeenNthCalledWith(
      3,
      {
        where: {
          status: "SUBMITTING",
          claimedAt: { lt: cutoff },
        },
      }
    );
  });

  it("reports the oldest unresolved event", async () => {
    const oldest = new Date("2026-11-10T09:00:00.000Z");

    const result = await run(makeDb([1, 1, 0], oldest));

    expect(result.oldestUnresolvedCreatedAt).toEqual(oldest);
    expect(result.requiresManualReconciliation).toBe(true);
  });

  it("rejects invalid cutoffs before database access", async () => {
    const db = makeDb();

    await expect(
      run(db, new Date("invalid"))
    ).rejects.toThrow("Invalid newsletter monitoring cutoff.");

    expect(db.newsletterWelcomeEvent.count).not.toHaveBeenCalled();
    expect(db.newsletterWelcomeEvent.findFirst).not.toHaveBeenCalled();
  });
});