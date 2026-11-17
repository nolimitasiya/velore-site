import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

vi.mock("server-only", () => ({}));

import {
  quarantineStaleShopperMarketingClaims,
} from "./quarantineStaleShopperMarketingClaims";

const findMany = vi.fn();
const updateMany = vi.fn();

const db = {
  shopperMarketingConsentSync: {
    findMany,
    updateMany,
  },
} as unknown as PrismaClient;

const now = new Date("2026-11-12T12:00:00.000Z");
const claimedAt = new Date("2026-11-12T11:50:00.000Z");

const candidate = {
  id: "operation-1",
  status: "PROCESSING",
  claimToken: "claim-token-1",
  claimedAt,
  submittedAt: null,
  providerJobId: null,
  lastCheckedAt: null,
};

const run = (overrides = {}) =>
  quarantineStaleShopperMarketingClaims(db, {
    now,
    timeoutMs: 300000,
    ...overrides,
  });

describe("stale marketing consent claim quarantine", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    findMany.mockResolvedValue([candidate]);
    updateMany.mockResolvedValue({ count: 1 });
  });

  it("quarantines an expired claim", async () => {
    expect(await run()).toEqual({
      inspected: 1,
      quarantined: 1,
      conflicts: 0,
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "operation-1",
        status: "PROCESSING",
        claimToken: "claim-token-1",
        claimedAt,
      },
      data: {
        status: "UNKNOWN",
        claimToken: null,
        claimedAt: null,
        lastError:
          "Stale claim: provider submission cannot be ruled out.",
      },
    });
  });

  it("preserves provider metadata when quarantining", async () => {
    findMany.mockResolvedValueOnce([
      {
        ...candidate,
        providerJobId: "provider-job-123",
      },
    ]);

    await run();

    const update = updateMany.mock.calls[0][0];

    expect(update.data).not.toHaveProperty("providerJobId");
    expect(update.data).not.toHaveProperty("submittedAt");
    expect(update.data).not.toHaveProperty("lastCheckedAt");

    expect(update.data.lastError).toContain(
      "provider outcome requires reconciliation"
    );
  });

  it("detects claim ownership conflicts", async () => {
    updateMany.mockResolvedValueOnce({ count: 0 });

    expect(await run()).toEqual({
      inspected: 1,
      quarantined: 0,
      conflicts: 1,
    });
  });

  it("does not update claims without tokens", async () => {
    findMany.mockResolvedValueOnce([
      { ...candidate, claimToken: null },
    ]);

    expect(await run()).toEqual({
      inspected: 1,
      quarantined: 0,
      conflicts: 1,
    });

    expect(updateMany).not.toHaveBeenCalled();
  });

  it("ignores claims that are no longer stale", async () => {
    findMany.mockResolvedValueOnce([
      {
        ...candidate,
        claimedAt: new Date("2026-11-12T11:59:00.000Z"),
      },
    ]);

    expect(await run()).toEqual({
      inspected: 1,
      quarantined: 0,
      conflicts: 0,
    });

    expect(updateMany).not.toHaveBeenCalled();
  });

  it("handles an empty queue", async () => {
    findMany.mockResolvedValueOnce([]);

    expect(await run()).toEqual({
      inspected: 0,
      quarantined: 0,
      conflicts: 0,
    });
  });

  it("rejects invalid timeouts", async () => {
    await expect(run({ timeoutMs: 0 }))
      .rejects.toThrow("Invalid stale-claim recovery options.");

    expect(findMany).not.toHaveBeenCalled();
  });

  it("rejects invalid batch limits", async () => {
    await expect(run({ limit: 101 }))
      .rejects.toThrow("Invalid stale-claim recovery options.");

    expect(findMany).not.toHaveBeenCalled();
  });

  it("limits database queries to expired processing claims", async () => {
    await run({ limit: 10 });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        status: "PROCESSING",
        claimedAt: {
          lte: new Date("2026-11-12T11:55:00.000Z"),
        },
      },
      orderBy: [
        { claimedAt: "asc" },
        { id: "asc" },
      ],
      take: 10,
    });
  });

  it("propagates database errors", async () => {
    findMany.mockRejectedValueOnce(
      new Error("Simulated database failure")
    );

    await expect(run())
      .rejects.toThrow("Simulated database failure");
  });
});
