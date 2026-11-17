import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

vi.mock("server-only", () => ({}));

import {
  checkShopperMarketingProviderOrdering,
} from "./checkShopperMarketingProviderOrdering";

const count = vi.fn();

const db = {
  shopperMarketingConsentSync: { count },
} as unknown as PrismaClient;

const operation = {
  id: "operation-current",
  shopperId: "shopper-1",
  email: "shopper@example.com",
};

describe("shopper marketing provider ordering", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    count.mockResolvedValue(0);
  });

  it("allows operations without unresolved predecessors", async () => {
    expect(
      await checkShopperMarketingProviderOrdering(db, operation)
    ).toEqual({ status: "CLEAR" });
  });

  it("blocks unresolved operations belonging to the shopper", async () => {
    count.mockResolvedValueOnce(1);

    expect(
      await checkShopperMarketingProviderOrdering(db, operation)
    ).toEqual({
      status: "BLOCKED",
      reason: "SHOPPER_OPERATION_UNRESOLVED",
    });
  });

  it("blocks unresolved operations sharing the email", async () => {
    count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    expect(
      await checkShopperMarketingProviderOrdering(db, operation)
    ).toEqual({
      status: "BLOCKED",
      reason: "EMAIL_OPERATION_UNRESOLVED",
    });
  });

  it("excludes the current operation from both checks", async () => {
    await checkShopperMarketingProviderOrdering(db, operation);

    expect(count).toHaveBeenCalledTimes(2);

    for (const [query] of count.mock.calls) {
      expect(query.where.id).toEqual({
        not: "operation-current",
      });
    }
  });

  it("normalises the email before checking", async () => {
    await checkShopperMarketingProviderOrdering(db, {
      ...operation,
      email: " SHOPPER@EXAMPLE.COM ",
    });

    expect(count.mock.calls[1][0].where.email).toEqual({
      equals: "shopper@example.com",
      mode: "insensitive",
    });
  });

  it("rejects missing email addresses", async () => {
    await expect(
      checkShopperMarketingProviderOrdering(db, {
        ...operation,
        email: " ",
      })
    ).rejects.toThrow("Marketing sync email is required.");

    expect(count).not.toHaveBeenCalled();
  });

  it("propagates database failures", async () => {
    count.mockRejectedValueOnce(
      new Error("Simulated database failure")
    );

    await expect(
      checkShopperMarketingProviderOrdering(db, operation)
    ).rejects.toThrow("Simulated database failure");
  });
});
