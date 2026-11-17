import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

import {
  transitionShopperMarketingSync,
} from "./transitionShopperMarketingSync";

function makeDb(updatedCount = 1) {
  const updateMany = vi.fn().mockResolvedValue({
    count: updatedCount,
  });

  const db = {
    shopperMarketingConsentSync: {
      updateMany,
    },
  } as unknown as Pick<
    PrismaClient,
    "shopperMarketingConsentSync"
  >;

  return { db, updateMany };
}

describe("shopper marketing consent status transitions", () => {
  it("supersedes an operation using its claim token", async () => {
    const { db, updateMany } = makeDb();

    const result = await transitionShopperMarketingSync(
      db,
      "operation-1",
      "token-1",
      { status: "SUPERSEDED" }
    );

    expect(result).toBe(true);

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "operation-1",
        status: "PROCESSING",
        claimToken: "token-1",
      },
      data: expect.objectContaining({
        status: "SUPERSEDED",
        claimToken: null,
        claimedAt: null,
      }),
    });
  });

  it("records accepted asynchronous submissions", async () => {
    const { db, updateMany } = makeDb();

    const result = await transitionShopperMarketingSync(
      db,
      "operation-1",
      "token-1",
      {
        status: "SUBMITTED",
        providerJobId: "klaviyo-job-123",
      }
    );

    expect(result).toBe(true);

    expect(updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: "PROCESSING",
        claimToken: "token-1",
      }),
      data: expect.objectContaining({
        status: "SUBMITTED",
        providerJobId: "klaviyo-job-123",
        submittedAt: expect.any(Date),
        claimToken: null,
      }),
    });
  });

  it("rejects submissions without a provider job ID", async () => {
    const { db, updateMany } = makeDb();

    await expect(
      transitionShopperMarketingSync(
        db,
        "operation-1",
        "token-1",
        {
          status: "SUBMITTED",
          providerJobId: " ",
        }
      )
    ).rejects.toThrow("Provider job ID is required");

    expect(updateMany).not.toHaveBeenCalled();
  });

  it("records confirmed failures and retry dates", async () => {
    const { db, updateMany } = makeDb();

    const retryAt = new Date("2026-11-13T12:00:00.000Z");

    await transitionShopperMarketingSync(
      db,
      "operation-1",
      "token-1",
      {
        status: "FAILED",
        error: "Provider rejected request",
        nextAttemptAt: retryAt,
      }
    );

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          lastError: "Provider rejected request",
          nextAttemptAt: retryAt,
          claimToken: null,
        }),
      })
    );
  });

  it("records HTTP 202 acceptance without marking the operation applied", async () => {
    const { db, updateMany } = makeDb();

    const result = await transitionShopperMarketingSync(
      db,
      "operation-1",
      "token-1",
      {
        status: "UNKNOWN",
        providerAccepted: true,
        error: "Klaviyo accepted HTTP 202 without a job ID",
      }
    );

    expect(result).toBe(true);

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "operation-1",
        status: "PROCESSING",
        claimToken: "token-1",
      },
      data: expect.objectContaining({
        status: "UNKNOWN",
        submittedAt: expect.any(Date),
        lastError: "Klaviyo accepted HTTP 202 without a job ID",
        claimToken: null,
        claimedAt: null,
        nextAttemptAt: null,
      }),
    });
  });

  it("does not record acceptance for an uncertain network outcome", async () => {
    const { db, updateMany } = makeDb();

    const result = await transitionShopperMarketingSync(
      db,
      "operation-1",
      "token-1",
      {
        status: "UNKNOWN",
        error: "Network timeout",
      }
    );

    expect(result).toBe(true);

    expect(updateMany).toHaveBeenCalledTimes(1);

    const update = updateMany.mock.calls[0][0];

    expect(update.where).toEqual({
      id: "operation-1",
      status: "PROCESSING",
      claimToken: "token-1",
    });

    expect(update.data).toEqual({
      status: "UNKNOWN",
      lastError: "Network timeout",
      claimToken: null,
      claimedAt: null,
      nextAttemptAt: null,
    });

    expect(update.data).not.toHaveProperty("submittedAt");
  });
  it("records uncertain provider outcomes separately", async () => {
    const { db, updateMany } = makeDb();

    await transitionShopperMarketingSync(
      db,
      "operation-1",
      "token-1",
      {
        status: "UNKNOWN",
        error: "Request timed out after submission",
      }
    );

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "UNKNOWN",
          lastError: "Request timed out after submission",
          claimToken: null,
        }),
      })
    );
  });

  it("rejects failures without a reason", async () => {
    const { db, updateMany } = makeDb();

    await expect(
      transitionShopperMarketingSync(
        db,
        "operation-1",
        "token-1",
        {
          status: "FAILED",
          error: " ",
          nextAttemptAt: null,
        }
      )
    ).rejects.toThrow("Failure reason is required");

    expect(updateMany).not.toHaveBeenCalled();
  });

  it("rejects unknown outcomes without a reason", async () => {
    const { db, updateMany } = makeDb();

    await expect(
      transitionShopperMarketingSync(
        db,
        "operation-1",
        "token-1",
        {
          status: "UNKNOWN",
          error: " ",
        }
      )
    ).rejects.toThrow("Unknown-outcome reason is required");

    expect(updateMany).not.toHaveBeenCalled();
  });

  it("rejects an empty operation ID", async () => {
    const { db, updateMany } = makeDb();

    await expect(
      transitionShopperMarketingSync(
        db,
        "",
        "token-1",
        { status: "SUPERSEDED" }
      )
    ).rejects.toThrow(
      "Operation ID and claim token are required"
    );

    expect(updateMany).not.toHaveBeenCalled();
  });

  it("rejects an empty claim token", async () => {
    const { db, updateMany } = makeDb();

    await expect(
      transitionShopperMarketingSync(
        db,
        "operation-1",
        "",
        { status: "SUPERSEDED" }
      )
    ).rejects.toThrow(
      "Operation ID and claim token are required"
    );

    expect(updateMany).not.toHaveBeenCalled();
  });

  it("returns false when the claim is no longer valid", async () => {
    const { db } = makeDb(0);

    const result = await transitionShopperMarketingSync(
      db,
      "operation-1",
      "expired-token",
      { status: "SUPERSEDED" }
    );

    expect(result).toBe(false);
  });

  it("propagates database update failures", async () => {
    const { db, updateMany } = makeDb();

    updateMany.mockRejectedValueOnce(
      new Error("Simulated database failure")
    );

    await expect(
      transitionShopperMarketingSync(
        db,
        "operation-1",
        "token-1",
        { status: "SUPERSEDED" }
      )
    ).rejects.toThrow("Simulated database failure");
  });
});
