import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";

import { createShopperMarketingConsentSync } from "./createShopperMarketingConsentSync";

function createMockTransaction() {
  const create = vi.fn().mockImplementation(async ({ data }) => ({
    id: "sync-test-id",
    ...data,
  }));

  const tx = {
    shopperMarketingConsentSync: {
      create,
    },
  } as unknown as Prisma.TransactionClient;

  return { tx, create };
}

const baseInput = {
  shopperId: "shopper-test-id",
  email: "shopper@example.test",
  consentVersion: 1,
  desiredConsent: true,
  reason: "ACCOUNT_OPT_IN" as const,
};

describe("createShopperMarketingConsentSync", () => {
  it("creates a pending opt-in operation", async () => {
    const { tx, create } = createMockTransaction();

    const result = await createShopperMarketingConsentSync({
      tx,
      ...baseInput,
    });

    expect(create).toHaveBeenCalledExactlyOnceWith({
      data: {
        shopperId: "shopper-test-id",
        email: "shopper@example.test",
        consentVersion: 1,
        desiredConsent: true,
        reason: "ACCOUNT_OPT_IN",
        providerOperationType: "SUBSCRIBE",
        operationKey:
          "shopper-marketing-consent:shopper-test-id:1:ACCOUNT_OPT_IN",
        status: "PENDING",
      },
    });

    expect(result.status).toBe("PENDING");
  });

  it("creates a pending marketing withdrawal operation", async () => {
    const { tx, create } = createMockTransaction();

    await createShopperMarketingConsentSync({
      tx,
      ...baseInput,
      consentVersion: 2,
      desiredConsent: false,
      reason: "ACCOUNT_OPT_OUT",
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        desiredConsent: false,
        consentVersion: 2,
        reason: "ACCOUNT_OPT_OUT",
        status: "PENDING",
      }),
    });
  });

  it("supports an old-address email-change operation", async () => {
    const { tx, create } = createMockTransaction();

    await createShopperMarketingConsentSync({
      tx,
      ...baseInput,
      email: "old@example.test",
      consentVersion: 3,
      desiredConsent: false,
      reason: "EMAIL_CHANGE_OLD_ADDRESS",
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "old@example.test",
        desiredConsent: false,
        reason: "EMAIL_CHANGE_OLD_ADDRESS",
      }),
    });
  });

  it("supports a new-address email-change operation", async () => {
    const { tx, create } = createMockTransaction();

    await createShopperMarketingConsentSync({
      tx,
      ...baseInput,
      email: "new@example.test",
      consentVersion: 3,
      desiredConsent: false,
      reason: "EMAIL_CHANGE_NEW_ADDRESS",
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "new@example.test",
        desiredConsent: false,
        reason: "EMAIL_CHANGE_NEW_ADDRESS",
      }),
    });
  });

  it("normalises email addresses", async () => {
    const { tx, create } = createMockTransaction();

    await createShopperMarketingConsentSync({
      tx,
      ...baseInput,
      email: "  SHOPPER@EXAMPLE.TEST  ",
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "shopper@example.test",
      }),
    });
  });

  it("generates the same operation key for identical inputs", async () => {
    const first = createMockTransaction();
    const second = createMockTransaction();

    await createShopperMarketingConsentSync({
      tx: first.tx,
      ...baseInput,
    });

    await createShopperMarketingConsentSync({
      tx: second.tx,
      ...baseInput,
    });

    const firstKey = first.create.mock.calls[0][0].data.operationKey;
    const secondKey = second.create.mock.calls[0][0].data.operationKey;

    expect(firstKey).toBe(secondKey);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid consent version %s",
    async (consentVersion) => {
      const { tx, create } = createMockTransaction();

      await expect(
        createShopperMarketingConsentSync({
          tx,
          ...baseInput,
          consentVersion,
        }),
      ).rejects.toThrow("Invalid marketing consent version.");

      expect(create).not.toHaveBeenCalled();
    },
  );

  it("rejects an empty email address", async () => {
    const { tx, create } = createMockTransaction();

    await expect(
      createShopperMarketingConsentSync({
        tx,
        ...baseInput,
        email: "   ",
      }),
    ).rejects.toThrow("Invalid marketing consent email.");

    expect(create).not.toHaveBeenCalled();
  });

  it("rejects an email address longer than 320 characters", async () => {
    const { tx, create } = createMockTransaction();

    await expect(
      createShopperMarketingConsentSync({
        tx,
        ...baseInput,
        email: "a".repeat(321),
      }),
    ).rejects.toThrow("Invalid marketing consent email.");

    expect(create).not.toHaveBeenCalled();
  });

  it("rejects an empty shopper ID", async () => {
    const { tx, create } = createMockTransaction();

    await expect(
      createShopperMarketingConsentSync({
        tx,
        ...baseInput,
        shopperId: "   ",
      }),
    ).rejects.toThrow("Invalid shopper ID.");

    expect(create).not.toHaveBeenCalled();
  });

  it("propagates database errors", async () => {
    const { tx, create } = createMockTransaction();

    create.mockRejectedValueOnce(new Error("Mock database failure"));

    await expect(
      createShopperMarketingConsentSync({
        tx,
        ...baseInput,
      }),
    ).rejects.toThrow("Mock database failure");
  });
});
