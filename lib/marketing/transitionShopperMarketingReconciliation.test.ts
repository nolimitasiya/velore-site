import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  transitionShopperMarketingReconciliation,
} from "./transitionShopperMarketingReconciliation";

function createDb(overrides: {
  operation?: Record<string, unknown> | null;
  shopper?: Record<string, unknown> | null;
  locked?: boolean;
  updateCount?: number;
  otherShoppers?: number;
  newsletterSubscribers?: number;
  waitlistSubscribers?: number;
} = {}) {
  const operation = overrides.operation === undefined
    ? {
        id: "operation-1",
        shopperId: "shopper-1",
        email: "shopper@example.com",
        desiredConsent: true,
        reason: "ACCOUNT_OPT_IN",
        status: "SUBMITTED",
        providerJobId: "job-123",
        consentVersion: 3,
      }
    : overrides.operation;

  const shopper = overrides.shopper === undefined
    ? {
        email: "shopper@example.com",
        marketingConsent: true,
        marketingConsentVersion: 3,
      }
    : overrides.shopper;

  const queryRaw = vi.fn().mockResolvedValue(
    overrides.locked === false ? [] : [{ id: "operation-1" }]
  );

  const findOperation = vi.fn().mockResolvedValue(operation);
  const findShopper = vi.fn().mockResolvedValue(shopper);

  const updateMany = vi.fn().mockResolvedValue({
    count: overrides.updateCount ?? 1,
  });

  const tx = {
    $queryRaw: queryRaw,
    shopperMarketingConsentSync: {
      findUnique: findOperation,
      updateMany,
    },
    shopper: {
      findUnique: findShopper,
      count: vi.fn().mockResolvedValue(overrides.otherShoppers ?? 0),
    },
    newsletterSubscriber: {
      count: vi.fn().mockResolvedValue(
        overrides.newsletterSubscribers ?? 0
      ),
    },
    waitlistSubscriber: {
      count: vi.fn().mockResolvedValue(
        overrides.waitlistSubscribers ?? 0
      ),
    },
  };

  const transaction = vi.fn(async (callback) => callback(tx));

  const db = {
    $transaction: transaction,
  } as unknown as Parameters<
    typeof transitionShopperMarketingReconciliation
  >[0];

  return {
    db,
    queryRaw,
    findOperation,
    findShopper,
    updateMany,
    transaction,
  };
}

const applied = {
  decision: "APPLIED" as const,
  providerEvidenceVerified: true as const,
  providerJobId: "job-123",
};

describe("atomic marketing reconciliation transitions", () => {
  it("applies matching current consent", async () => {
    const { db, updateMany, transaction } = createDb();

    expect(
      await transitionShopperMarketingReconciliation(
        db, "operation-1", applied
      )
    ).toEqual({ outcome: "UPDATED" });

    expect(transaction).toHaveBeenCalledOnce();
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "APPLIED",
        }),
      })
    );
  });

  it("does not update when locks cannot find the records", async () => {
    const { db, updateMany } = createDb({ locked: false });

    expect(
      await transitionShopperMarketingReconciliation(
        db, "operation-1", applied
      )
    ).toEqual({ outcome: "NOT_UPDATED" });

    expect(updateMany).not.toHaveBeenCalled();
  });

  it("rejects an outdated consent version", async () => {
    const { db, updateMany } = createDb({
      shopper: {
        email: "shopper@example.com",
        marketingConsent: true,
        marketingConsentVersion: 4,
      },
    });

    expect(
      await transitionShopperMarketingReconciliation(
        db, "operation-1", applied
      )
    ).toEqual({ outcome: "NOT_UPDATED" });

    expect(updateMany).not.toHaveBeenCalled();
  });

  it("rejects changed email addresses", async () => {
    const { db } = createDb({
      shopper: {
        email: "new@example.com",
        marketingConsent: true,
        marketingConsentVersion: 3,
      },
    });

    expect(
      await transitionShopperMarketingReconciliation(
        db, "operation-1", applied
      )
    ).toEqual({ outcome: "NOT_UPDATED" });
  });

  it("rejects changed marketing consent", async () => {
    const { db } = createDb({
      shopper: {
        email: "shopper@example.com",
        marketingConsent: false,
        marketingConsentVersion: 3,
      },
    });

    expect(
      await transitionShopperMarketingReconciliation(
        db, "operation-1", applied
      )
    ).toEqual({ outcome: "NOT_UPDATED" });
  });

  it("rejects old-address operations when the email has not changed", async () => {
    const { db, updateMany } = createDb({
      operation: {
        id: "operation-1",
        shopperId: "shopper-1",
        email: "shopper@example.com",
        desiredConsent: false,
        reason: "EMAIL_CHANGE_OLD_ADDRESS",
        status: "SUBMITTED",
        providerJobId: "job-123",
        consentVersion: 3,
      },
    });

    expect(
      await transitionShopperMarketingReconciliation(
        db, "operation-1", applied
      )
    ).toEqual({ outcome: "NOT_UPDATED" });

    expect(updateMany).not.toHaveBeenCalled();
  });

  it("rejects mismatched provider jobs", async () => {
    const { db } = createDb();

    expect(
      await transitionShopperMarketingReconciliation(
        db, "operation-1", {
          ...applied,
          providerJobId: "different-job",
        }
      )
    ).toEqual({ outcome: "NOT_UPDATED" });
  });

  it("rejects pending operations", async () => {
    const { db, updateMany } = createDb({
      operation: {
        status: "PENDING",
      },
    });

    expect(
      await transitionShopperMarketingReconciliation(
        db, "operation-1", applied
      )
    ).toEqual({ outcome: "NOT_UPDATED" });

    expect(updateMany).not.toHaveBeenCalled();
  });

  it("records uncertain provider outcomes", async () => {
    const { db, updateMany } = createDb();

    expect(
      await transitionShopperMarketingReconciliation(
        db, "operation-1", {
          decision: "UNKNOWN",
          reason: "Provider evidence unavailable.",
        }
      )
    ).toEqual({ outcome: "UPDATED" });

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "UNKNOWN",
        }),
      })
    );
  });

  it("does not report success when conditional update fails", async () => {
    const { db } = createDb({ updateCount: 0 });

    expect(
      await transitionShopperMarketingReconciliation(
        db, "operation-1", applied
      )
    ).toEqual({ outcome: "NOT_UPDATED" });
  });
  it("applies an uncontested old-address opt-out", async () => {
    const { db, updateMany } = createDb({
      operation: {
        id: "operation-1",
        shopperId: "shopper-1",
        email: "old@example.com",
        desiredConsent: false,
        reason: "EMAIL_CHANGE_OLD_ADDRESS",
        status: "SUBMITTED",
        providerJobId: "job-123",
        consentVersion: 3,
      },
      shopper: {
        email: "new@example.com",
        marketingConsent: false,
        marketingConsentVersion: 3,
      },
    });

    expect(
      await transitionShopperMarketingReconciliation(
        db, "operation-1", applied
      )
    ).toEqual({ outcome: "UPDATED" });

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "APPLIED" }),
      })
    );
  });

  it("rejects old-address opt-outs with another shopper", async () => {
    const { db } = createDb({
      operation: {
        id: "operation-1",
        shopperId: "shopper-1",
        email: "old@example.com",
        desiredConsent: false,
        reason: "EMAIL_CHANGE_OLD_ADDRESS",
        status: "SUBMITTED",
        providerJobId: "job-123",
        consentVersion: 3,
      },
      shopper: {
        email: "new@example.com",
        marketingConsent: false,
        marketingConsentVersion: 3,
      },
      otherShoppers: 1,
    });

    expect(
      await transitionShopperMarketingReconciliation(
        db, "operation-1", applied
      )
    ).toEqual({ outcome: "NOT_UPDATED" });
  });

  it("rejects old-address opt-outs with newsletter subscribers", async () => {
    const { db } = createDb({
      operation: {
        id: "operation-1",
        shopperId: "shopper-1",
        email: "old@example.com",
        desiredConsent: false,
        reason: "EMAIL_CHANGE_OLD_ADDRESS",
        status: "SUBMITTED",
        providerJobId: "job-123",
        consentVersion: 3,
      },
      shopper: {
        email: "new@example.com",
        marketingConsent: false,
        marketingConsentVersion: 3,
      },
      newsletterSubscribers: 1,
    });

    expect(
      await transitionShopperMarketingReconciliation(
        db, "operation-1", applied
      )
    ).toEqual({ outcome: "NOT_UPDATED" });
  });

  it("rejects old-address opt-outs with waitlist subscribers", async () => {
    const { db } = createDb({
      operation: {
        id: "operation-1",
        shopperId: "shopper-1",
        email: "old@example.com",
        desiredConsent: false,
        reason: "EMAIL_CHANGE_OLD_ADDRESS",
        status: "SUBMITTED",
        providerJobId: "job-123",
        consentVersion: 3,
      },
      shopper: {
        email: "new@example.com",
        marketingConsent: false,
        marketingConsentVersion: 3,
      },
      waitlistSubscribers: 1,
    });

    expect(
      await transitionShopperMarketingReconciliation(
        db, "operation-1", applied
      )
    ).toEqual({ outcome: "NOT_UPDATED" });
  });

  it("rejects an old-address operation requesting opt-in", async () => {
    const { db } = createDb({
      operation: {
        id: "operation-1",
        shopperId: "shopper-1",
        email: "old@example.com",
        desiredConsent: true,
        reason: "EMAIL_CHANGE_OLD_ADDRESS",
        status: "SUBMITTED",
        providerJobId: "job-123",
        consentVersion: 3,
      },
      shopper: {
        email: "new@example.com",
        marketingConsent: false,
        marketingConsentVersion: 3,
      },
    });

    expect(
      await transitionShopperMarketingReconciliation(
        db, "operation-1", applied
      )
    ).toEqual({ outcome: "NOT_UPDATED" });
  });

});
