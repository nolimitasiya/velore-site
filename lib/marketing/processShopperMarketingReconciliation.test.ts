import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("../klaviyo/readShopperMarketingConsent", () => ({
  readShopperMarketingConsentFromKlaviyo: vi.fn(),
  readShopperListMembershipFromKlaviyo: vi.fn(),
}));

vi.mock("./transitionShopperMarketingReconciliation", () => ({
  transitionShopperMarketingReconciliation: vi.fn(),
}));

import type { PrismaClient } from "@prisma/client";

import {
  readShopperMarketingConsentFromKlaviyo,
  readShopperListMembershipFromKlaviyo,
} from "../klaviyo/readShopperMarketingConsent";

import {
  transitionShopperMarketingReconciliation,
} from "./transitionShopperMarketingReconciliation";

import {
  processShopperMarketingReconciliation,
} from "./processShopperMarketingReconciliation";

const readConsent = vi.mocked(
  readShopperMarketingConsentFromKlaviyo
);

const readMembership = vi.mocked(
  readShopperListMembershipFromKlaviyo
);

const transition = vi.mocked(
  transitionShopperMarketingReconciliation
);

function createFixture() {
  const operation = {
    id: "operation-1",
    shopperId: "shopper-1",
    email: "shopper@example.com",
    consentVersion: 3,
    desiredConsent: true,
    status: "SUBMITTED",
    providerJobId: "job-123",
    submittedAt: new Date("2026-11-15T22:58:00.000Z"),
  };

  const shopper = {
    email: "shopper@example.com",
    marketingConsent: true,
    marketingConsentVersion: 3,
  };

  const findOperation = vi.fn().mockResolvedValue(operation);
  const findShopper = vi.fn().mockResolvedValue(shopper);

  const db = {
    shopperMarketingConsentSync: {
      findUnique: findOperation,
    },
    shopper: {
      findUnique: findShopper,
    },
  } as unknown as PrismaClient;

  return {
    db,
    operation,
    shopper,
    findOperation,
    findShopper,
  };
}

describe("Shopper-list removal reconciliation", () => {
  function createRemovalFixture() {
    const operation = {
      id: "removal-operation",
      shopperId: "shopper-1",
      email: "shopper@example.com",
      consentVersion: 3,
      desiredConsent: false,
      status: "UNKNOWN",
      providerOperationType: "REMOVE_FROM_SHOPPER_LIST",
      providerJobId: null,
      submittedAt: null,
    };

    const findOperation = vi.fn().mockResolvedValue(operation);
    const findShopper = vi.fn().mockResolvedValue({
      email: operation.email,
      marketingConsent: false,
      marketingConsentVersion: 3,
    });

    const newsletterCount = vi.fn().mockResolvedValue(1);

    const db = {
      shopperMarketingConsentSync: {
        findUnique: findOperation,
      },
      shopper: {
        findUnique: findShopper,
      },
      newsletterSubscriber: {
        count: newsletterCount,
      },
    } as unknown as PrismaClient;

    return {
      db,
      operation,
      newsletterCount,
    };
  }

  beforeEach(() => {
    vi.resetAllMocks();

    readConsent.mockResolvedValue({
      state: "SUBSCRIBED",
      profileId: "profile-1",
    });

    readMembership.mockResolvedValue("NOT_MEMBER");

    transition.mockResolvedValue({
      outcome: "UPDATED",
    });
  });

  it("keeps confirmed removal unresolved without flow suppression evidence", async () => {
    const { db, operation, newsletterCount } = createRemovalFixture();

    const result = await processShopperMarketingReconciliation(
      db,
      operation.id
    );

    expect(result).toEqual({
      status: "UNRESOLVED",
      reason: "SHOPPER_LIST_REMOVAL_RECONCILIATION_REQUIRED",
    });

    expect(newsletterCount).toHaveBeenCalledTimes(1);

    expect(readMembership).toHaveBeenCalledWith("profile-1");

    expect(transition).toHaveBeenCalledWith(
      db,
      operation.id,
      {
        decision: "UNKNOWN",
        reason: "Shopper promotional-flow suppression is unverified.",
      }
    );

    expect(transition).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ decision: "APPLIED" })
    );
  });

  it("keeps removal unresolved while shopper remains on the list", async () => {
    const { db, operation } = createRemovalFixture();

    readMembership.mockResolvedValue("MEMBER");

    await processShopperMarketingReconciliation(db, operation.id);

    expect(transition).toHaveBeenCalledWith(
      db,
      operation.id,
      {
        decision: "UNKNOWN",
        reason: "Shopper remains on the Klaviyo shopper list.",
      }
    );
  });

  it("keeps removal unresolved when independent newsletter consent is missing", async () => {
    const { db, operation, newsletterCount } = createRemovalFixture();

    newsletterCount.mockResolvedValue(0);

    await processShopperMarketingReconciliation(db, operation.id);

    expect(transition).toHaveBeenCalledWith(
      db,
      operation.id,
      {
        decision: "UNKNOWN",
        reason: "Independent newsletter consent preservation is unverified.",
      }
    );
  });

  it("keeps removal unresolved when Klaviyo membership lookup fails", async () => {
    const { db, operation } = createRemovalFixture();

    readMembership.mockRejectedValue(
      new Error("Provider unavailable")
    );

    await processShopperMarketingReconciliation(db, operation.id);

    expect(transition).toHaveBeenCalledWith(
      db,
      operation.id,
      {
        decision: "UNKNOWN",
        reason: "Shopper-list membership could not be verified.",
      }
    );
  });
});
describe("processShopperMarketingReconciliation", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    readConsent.mockResolvedValue({
      state: "SUBSCRIBED",
      profileId: "profile-1",
      consentTimestamp: "2026-11-15T22:58:28.828457+00:00",
    });

    readMembership.mockResolvedValue("MEMBER");

    transition.mockResolvedValue({
      outcome: "UPDATED",
    });
  });

  it("rejects an empty operation ID", async () => {
    const { db } = createFixture();

    await expect(
      processShopperMarketingReconciliation(db, " ")
    ).rejects.toThrow(
      "Missing marketing reconciliation operation ID"
    );

    expect(readConsent).not.toHaveBeenCalled();
    expect(transition).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND for a missing operation", async () => {
    const { db, findOperation } = createFixture();

    findOperation.mockResolvedValue(null);

    await expect(
      processShopperMarketingReconciliation(db, "operation-1")
    ).resolves.toEqual({ status: "NOT_FOUND" });

    expect(readConsent).not.toHaveBeenCalled();
  });

  it("does not reconcile an ineligible operation", async () => {
    const { db, findOperation, operation } = createFixture();

    findOperation.mockResolvedValue({
      ...operation,
      status: "APPLIED",
    });

    await expect(
      processShopperMarketingReconciliation(db, "operation-1")
    ).resolves.toEqual({ status: "NOT_ELIGIBLE" });

    expect(readConsent).not.toHaveBeenCalled();
    expect(transition).not.toHaveBeenCalled();
  });

  it("keeps matching provider consent unresolved", async () => {
    const { db } = createFixture();

    await expect(
      processShopperMarketingReconciliation(db, "operation-1")
    ).resolves.toEqual({
      status: "UNRESOLVED",
      reason: "JOB_COMPLETION_UNVERIFIED",
    });

    expect(transition).toHaveBeenCalledWith(
      db,
      "operation-1",
      {
        decision: "UNKNOWN",
        reason:
          "Provider consent matches, but job completion is unverified.",
      }
    );

    expect(transition).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ decision: "APPLIED" })
    );
  });

  it("keeps mismatched provider consent unresolved", async () => {
    const { db } = createFixture();

    readConsent.mockResolvedValue({
      state: "UNSUBSCRIBED",
      profileId: "profile-1",
      consentTimestamp: "2026-11-15T22:58:28.828457+00:00",
    });

    await expect(
      processShopperMarketingReconciliation(db, "operation-1")
    ).resolves.toEqual({
      status: "UNRESOLVED",
      reason: "PROVIDER_CONSENT_UNVERIFIED",
    });

    expect(transition).toHaveBeenCalledWith(
      db,
      "operation-1",
      expect.objectContaining({
        decision: "UNKNOWN",
      })
    );
  });

  it("quarantines an outdated consent version", async () => {
    const { db, findShopper, shopper } = createFixture();

    findShopper.mockResolvedValue({
      ...shopper,
      marketingConsentVersion: 4,
    });

    await expect(
      processShopperMarketingReconciliation(db, "operation-1")
    ).resolves.toEqual({
      status: "UNRESOLVED",
      reason: "STALE_OPERATION",
    });

    expect(readConsent).not.toHaveBeenCalled();
  });

  it("quarantines an operation after an email change", async () => {
    const { db, findShopper, shopper } = createFixture();

    findShopper.mockResolvedValue({
      ...shopper,
      email: "new@example.com",
    });

    await expect(
      processShopperMarketingReconciliation(db, "operation-1")
    ).resolves.toEqual({
      status: "UNRESOLVED",
      reason: "STALE_OPERATION",
    });

    expect(readConsent).not.toHaveBeenCalled();
  });

  it("verifies provider state without a job ID but remains unresolved", async () => {
    const { db, findOperation, operation } = createFixture();

    findOperation.mockResolvedValue({
      ...operation,
      providerJobId: null,
    });

    await expect(
      processShopperMarketingReconciliation(db, "operation-1")
    ).resolves.toEqual({
      status: "UNRESOLVED",
      reason: "MISSING_PROVIDER_JOB_ID",
    });

    expect(readConsent).toHaveBeenCalledWith("shopper@example.com");
    expect(readMembership).toHaveBeenCalledWith("profile-1");

    expect(transition).toHaveBeenCalledWith(
      db,
      "operation-1",
      expect.objectContaining({
        decision: "UNKNOWN",
      })
    );

    expect(transition).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        decision: "APPLIED",
      })
    );
  });

  it("handles Klaviyo lookup failures without retrying", async () => {
    const { db } = createFixture();

    readConsent.mockRejectedValue(
      new Error("Provider unavailable")
    );

    await expect(
      processShopperMarketingReconciliation(db, "operation-1")
    ).resolves.toEqual({
      status: "UNRESOLVED",
      reason: "PROVIDER_LOOKUP_UNAVAILABLE",
    });

    expect(readConsent).toHaveBeenCalledTimes(1);
    expect(transition).toHaveBeenCalledTimes(1);
  });

  it("reports database transition conflicts", async () => {
    const { db } = createFixture();

    transition.mockResolvedValue({
      outcome: "NOT_UPDATED",
    });

    await expect(
      processShopperMarketingReconciliation(db, "operation-1")
    ).resolves.toEqual({
      status: "TRANSITION_CONFLICT",
    });
  });

  it("does not contact Klaviyo when the shopper is missing", async () => {
    const { db, findShopper } = createFixture();

    findShopper.mockResolvedValue(null);

    await expect(
      processShopperMarketingReconciliation(db, "operation-1")
    ).resolves.toEqual({
      status: "UNRESOLVED",
      reason: "SHOPPER_NOT_FOUND",
    });

    expect(readConsent).not.toHaveBeenCalled();
    expect(transition).not.toHaveBeenCalled();
  });

  it("keeps consent predating submission unresolved", async () => {
    const { db } = createFixture();

    readConsent.mockResolvedValue({
      state: "SUBSCRIBED",
      profileId: "profile-1",
      consentTimestamp: "2026-11-15T22:57:00.000Z",
    });

    await expect(
      processShopperMarketingReconciliation(db, "operation-1")
    ).resolves.toEqual({
      status: "UNRESOLVED",
      reason: "PROVIDER_CONSENT_PREDATES_SUBMISSION",
    });

    expect(transition).toHaveBeenCalledWith(
      db,
      "operation-1",
      expect.objectContaining({
        decision: "UNKNOWN",
        reason: "Provider consent predates this submission.",
      })
    );
  });

  it("keeps missing provider timestamps unresolved", async () => {
    const { db } = createFixture();

    readConsent.mockResolvedValue({
      state: "SUBSCRIBED",
      profileId: "profile-1",
    });

    await expect(
      processShopperMarketingReconciliation(db, "operation-1")
    ).resolves.toEqual({
      status: "UNRESOLVED",
      reason: "TIMESTAMP_UNVERIFIED",
    });

    expect(transition).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ decision: "APPLIED" })
    );
  });

  it("keeps invalid provider timestamps unresolved", async () => {
    const { db } = createFixture();

    readConsent.mockResolvedValue({
      state: "SUBSCRIBED",
      profileId: "profile-1",
      consentTimestamp: "not-a-date",
    });

    await expect(
      processShopperMarketingReconciliation(db, "operation-1")
    ).resolves.toEqual({
      status: "UNRESOLVED",
      reason: "TIMESTAMP_UNVERIFIED",
    });
  });

  it("keeps missing submission timestamps unresolved", async () => {
    const { db, findOperation, operation } = createFixture();

    findOperation.mockResolvedValue({
      ...operation,
      submittedAt: null,
    });

    await expect(
      processShopperMarketingReconciliation(db, "operation-1")
    ).resolves.toEqual({
      status: "UNRESOLVED",
      reason: "TIMESTAMP_UNVERIFIED",
    });
  });


  it("checks shopper-list membership for subscribed profiles", async () => {
    const { db } = createFixture();

    await expect(
      processShopperMarketingReconciliation(db, "operation-1")
    ).resolves.toEqual({
      status: "UNRESOLVED",
      reason: "JOB_COMPLETION_UNVERIFIED",
    });

    expect(readMembership).toHaveBeenCalledWith("profile-1");

    expect(transition).toHaveBeenCalledWith(
      db,
      "operation-1",
      expect.objectContaining({
        decision: "UNKNOWN",
      })
    );
  });

  it("keeps missing shopper-list membership unresolved", async () => {
    const { db } = createFixture();

    readMembership.mockResolvedValue("NOT_MEMBER");

    await expect(
      processShopperMarketingReconciliation(db, "operation-1")
    ).resolves.toEqual({
      status: "UNRESOLVED",
      reason: "SHOPPER_LIST_MEMBERSHIP_MISSING",
    });

    expect(transition).toHaveBeenCalledWith(
      db,
      "operation-1",
      expect.objectContaining({
        decision: "UNKNOWN",
      })
    );
  });

  it("keeps unknown shopper-list membership unresolved", async () => {
    const { db } = createFixture();

    readMembership.mockResolvedValue("UNKNOWN");

    await expect(
      processShopperMarketingReconciliation(db, "operation-1")
    ).resolves.toEqual({
      status: "UNRESOLVED",
      reason: "SHOPPER_LIST_MEMBERSHIP_UNVERIFIED",
    });
  });

  it("keeps membership provider failures unresolved", async () => {
    const { db } = createFixture();

    readMembership.mockRejectedValue(
      new Error("Klaviyo unavailable")
    );

    await expect(
      processShopperMarketingReconciliation(db, "operation-1")
    ).resolves.toEqual({
      status: "UNRESOLVED",
      reason: "SHOPPER_LIST_MEMBERSHIP_UNVERIFIED",
    });
  });

  it("does not use list membership to verify unsubscribe", async () => {
    const { db, findOperation, findShopper, operation, shopper } =
      createFixture();

    findOperation.mockResolvedValue({
      ...operation,
      desiredConsent: false,
    });

    findShopper.mockResolvedValue({
      ...shopper,
      marketingConsent: false,
    });

    readConsent.mockResolvedValue({
      state: "UNSUBSCRIBED",
      profileId: "profile-1",
    });

    await processShopperMarketingReconciliation(db, "operation-1");

    expect(readMembership).not.toHaveBeenCalled();
  });
});
