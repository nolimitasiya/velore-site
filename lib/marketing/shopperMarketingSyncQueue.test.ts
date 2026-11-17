import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

import {
  inspectShopperMarketingSyncQueue,
} from "./shopperMarketingSyncQueue";

const verifiedAt = new Date("2026-11-12T12:00:00.000Z");

function operation(
  overrides: Record<string, unknown> = {}
) {
  return {
    shopperId: "shopper-1",
    email: "shopper@example.com",
    consentVersion: 3,
    desiredConsent: true,
    reason: "ACCOUNT_OPT_IN",
    ...overrides,
  };
}

function shopper(
  overrides: Record<string, unknown> = {}
) {
  return {
    email: "shopper@example.com",
    emailVerifiedAt: verifiedAt,
    marketingConsent: true,
    marketingConsentVersion: 3,
    ...overrides,
  };
}

function makeDb(
  operations: ReturnType<typeof operation>[],
  currentShopper: ReturnType<typeof shopper> | null = shopper(),
  sharedEmailCount = 0
) {
  const findMany = vi.fn().mockResolvedValue(operations);
  const findUnique = vi.fn().mockResolvedValue(currentShopper);
  const count = vi.fn().mockResolvedValue(sharedEmailCount);

  const db = {
    shopperMarketingConsentSync: {
      findMany,
    },
    shopper: {
      findUnique,
      count,
    },
  } as unknown as Pick<
    PrismaClient,
    "shopperMarketingConsentSync" | "shopper"
  >;

  return {
    db,
    findMany,
    findUnique,
    count,
  };
}

describe("shopper marketing consent queue inspection", () => {
  it("classifies a current opt-in as ready", async () => {
    const { db } = makeDb([operation()]);

    await expect(
      inspectShopperMarketingSyncQueue(db)
    ).resolves.toEqual({
      inspected: 1,
      ready: 1,
      superseded: 0,
      blocked: 0,
      reasons: { CURRENT_CONSENT: 1 },
    });
  });

  it("classifies a current opt-out as ready", async () => {
    const { db } = makeDb(
      [
        operation({
          desiredConsent: false,
          reason: "ACCOUNT_OPT_OUT",
        }),
      ],
      shopper({ marketingConsent: false })
    );

    const result =
      await inspectShopperMarketingSyncQueue(db);

    expect(result.ready).toBe(1);
  });

  it("supersedes outdated operations", async () => {
    const { db } = makeDb([
      operation({ consentVersion: 2 }),
    ]);

    const result =
      await inspectShopperMarketingSyncQueue(db);

    expect(result.superseded).toBe(1);
    expect(result.reasons.OLDER_VERSION).toBe(1);
  });

  it("blocks shared-email operations", async () => {
    const { db } = makeDb(
      [operation()],
      shopper(),
      1
    );

    const result =
      await inspectShopperMarketingSyncQueue(db);

    expect(result.blocked).toBe(1);
    expect(result.reasons.SHARED_EMAIL_REVIEW).toBe(1);
  });

  it("blocks operations with missing shoppers", async () => {
    const { db } = makeDb(
      [operation()],
      null
    );

    const result =
      await inspectShopperMarketingSyncQueue(db);

    expect(result.blocked).toBe(1);
  });

  it("normalises email comparisons through the decision engine", async () => {
    const { db } = makeDb([
      operation({ email: " SHOPPER@EXAMPLE.COM " }),
    ]);

    const result =
      await inspectShopperMarketingSyncQueue(db);

    expect(result.ready).toBe(1);
  });

  it("summarises multiple decisions", async () => {
    const { db } = makeDb([
      operation(),
      operation({ consentVersion: 2 }),
      operation({ consentVersion: 4 }),
    ]);

    const result =
      await inspectShopperMarketingSyncQueue(db);

    expect(result).toMatchObject({
      inspected: 3,
      ready: 1,
      superseded: 1,
      blocked: 1,
    });
  });

  it("returns an empty summary for an empty queue", async () => {
    const { db } = makeDb([]);

    const result =
      await inspectShopperMarketingSyncQueue(db);

    expect(result).toEqual({
      inspected: 0,
      ready: 0,
      superseded: 0,
      blocked: 0,
      reasons: {},
    });
  });

  it("rejects invalid inspection limits", async () => {
    const { db, findMany } = makeDb([]);

    for (const limit of [0, -1, 101, 1.5, NaN]) {
      await expect(
        inspectShopperMarketingSyncQueue(db, limit)
      ).rejects.toThrow(
        "Queue inspection limit must be 1-100"
      );
    }

    expect(findMany).not.toHaveBeenCalled();
  });

  it("uses the requested inspection limit", async () => {
    const { db, findMany } = makeDb([]);

    await inspectShopperMarketingSyncQueue(db, 12);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 12,
      })
    );
  });

  it("does not modify database records", async () => {
    const { db } = makeDb([operation()]);

    await inspectShopperMarketingSyncQueue(db);

    expect(
      Object.keys(db.shopperMarketingConsentSync)
    ).toEqual(["findMany"]);

    expect(
      Object.keys(db.shopper)
    ).toEqual(["findUnique", "count"]);
  });

  it("propagates database read failures", async () => {
    const { db, findMany } = makeDb([]);

    findMany.mockRejectedValueOnce(
      new Error("Simulated database read failure")
    );

    await expect(
      inspectShopperMarketingSyncQueue(db)
    ).rejects.toThrow(
      "Simulated database read failure"
    );
  });
});
