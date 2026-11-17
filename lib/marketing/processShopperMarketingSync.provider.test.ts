import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("./claimShopperMarketingSync", () => ({
  claimShopperMarketingSync: vi.fn(),
}));

vi.mock("./validateClaimedShopperMarketingSync", () => ({
  validateClaimedShopperMarketingSync: vi.fn(),
}));

vi.mock("./transitionShopperMarketingSync", () => ({
  transitionShopperMarketingSync: vi.fn(),
  classifyShopperMarketingProviderOperation: vi.fn(),
}));

vi.mock("./releaseShopperMarketingSyncClaim", () => ({
  releaseShopperMarketingSyncClaim: vi.fn(),
}));

vi.mock("./checkShopperMarketingProviderOrdering", () => ({
  checkShopperMarketingProviderOrdering: vi.fn(),
}));

vi.mock("../klaviyo/shopperMarketingConsent", () => ({
  submitShopperMarketingConsentToKlaviyo: vi.fn(),
}));

vi.mock("../klaviyo/removeShopperFromList", () => ({
  removeShopperFromKlaviyoList: vi.fn(),
}));

vi.mock("../klaviyo/readShopperMarketingConsent", () => ({
  readShopperMarketingConsentFromKlaviyo: vi.fn(),
  readShopperListMembershipFromKlaviyo: vi.fn(),
}));

import { removeShopperFromKlaviyoList } from "../klaviyo/removeShopperFromList";
import { processOneShopperMarketingSync } from "./processShopperMarketingSync";
import { claimShopperMarketingSync } from "./claimShopperMarketingSync";
import { validateClaimedShopperMarketingSync } from "./validateClaimedShopperMarketingSync";
import {
  transitionShopperMarketingSync,
  classifyShopperMarketingProviderOperation,
} from "./transitionShopperMarketingSync";
import { releaseShopperMarketingSyncClaim } from "./releaseShopperMarketingSyncClaim";
import { checkShopperMarketingProviderOrdering } from "./checkShopperMarketingProviderOrdering";
import { submitShopperMarketingConsentToKlaviyo } from "../klaviyo/shopperMarketingConsent";
import {
  readShopperMarketingConsentFromKlaviyo,
  readShopperListMembershipFromKlaviyo,
} from "../klaviyo/readShopperMarketingConsent";

const claim = vi.mocked(claimShopperMarketingSync);
const validate = vi.mocked(validateClaimedShopperMarketingSync);
const transition = vi.mocked(transitionShopperMarketingSync);
const classify = vi.mocked(classifyShopperMarketingProviderOperation);
const release = vi.mocked(releaseShopperMarketingSyncClaim);
const ordering = vi.mocked(checkShopperMarketingProviderOrdering);
const submit = vi.mocked(submitShopperMarketingConsentToKlaviyo);
const readConsent = vi.mocked(readShopperMarketingConsentFromKlaviyo);
const readMembership = vi.mocked(readShopperListMembershipFromKlaviyo);
const removeFromList = vi.mocked(removeShopperFromKlaviyoList);

const operation = {
  id: "test-operation",
  shopperId: "test-shopper",
  email: "test@example.invalid",
  consentVersion: 2,
  desiredConsent: true,
  reason: "ACCOUNT_OPT_IN",
  claimToken: "test-claim",
};

beforeEach(() => {
  vi.resetAllMocks();

  claim.mockResolvedValue({ ...operation });
  validate.mockResolvedValue({
    status: "READY",
    reason: "CURRENT_CONSENT",
  });
  ordering.mockResolvedValue({ status: "CLEAR" });
  transition.mockResolvedValue(true);
  classify.mockResolvedValue(true);
  release.mockResolvedValue(true);
  submit.mockResolvedValue({
    status: "SUBMITTED_WITH_JOB_ID",
    providerJobId: "test-provider-job",
  });
});

describe("Shopper marketing re-subscription", () => {
  it("allows a shopper to subscribe again after withdrawing consent", async () => {
    const versions = [
      { ...operation, consentVersion: 1, desiredConsent: true },
      { ...operation, consentVersion: 2, desiredConsent: false },
      { ...operation, consentVersion: 3, desiredConsent: true },
    ];

    for (const current of versions) {
      claim.mockResolvedValueOnce(current);

      if (!current.desiredConsent) {
        readConsent.mockResolvedValueOnce({
          profileId: "test-profile",
        } as never);

        readMembership.mockResolvedValueOnce("MEMBER");

        classify.mockResolvedValueOnce(true);
      }

      await processOneShopperMarketingSync(
        {} as never,
        { enableProviderSubmission: true }
      );
    }

    expect(submit).toHaveBeenCalledWith({
      email: operation.email,
      action: "SUBSCRIBE",
    });
  });
});
describe("Klaviyo provider submission lifecycle", () => {
  it("submits an eligible opt-in and records the job ID", async () => {
    const result = await processOneShopperMarketingSync(
      {} as never,
      { enableProviderSubmission: true }
    );

    expect(result).toEqual({
      status: "SUBMITTED",
      providerJobId: "test-provider-job",
    });

    expect(submit).toHaveBeenCalledWith({
      email: operation.email,
      action: "SUBSCRIBE",
    });

    expect(transition).toHaveBeenCalledWith(
      expect.anything(),
      operation.id,
      operation.claimToken,
      {
        status: "SUBMITTED",
        providerJobId: "test-provider-job",
      }
    );
  });

  it("quarantines accepted requests without a provider job ID", async () => {
    submit.mockResolvedValueOnce({
      status: "ACCEPTED_WITHOUT_JOB_ID",
    });

    const result = await processOneShopperMarketingSync(
      {} as never,
      { enableProviderSubmission: true }
    );

    expect(result).toEqual({
      status: "UNKNOWN",
      reason: "PROVIDER_ACCEPTED_RECONCILIATION_REQUIRED",
    });

    expect(submit).toHaveBeenCalledTimes(1);

    expect(transition).toHaveBeenCalledWith(
      expect.anything(),
      operation.id,
      operation.claimToken,
      {
        status: "UNKNOWN",
        error:
          "Klaviyo accepted the request (HTTP 202) without a job ID; subscription state requires reconciliation.",
      }
    );

    expect(transition).not.toHaveBeenCalledWith(
      expect.anything(),
      operation.id,
      operation.claimToken,
      expect.objectContaining({ status: "SUBMITTED" })
    );
  });
  it("quarantines uncertain provider outcomes", async () => {
    submit.mockRejectedValueOnce(new Error("Network failure"));

    const result = await processOneShopperMarketingSync(
      {} as never,
      { enableProviderSubmission: true }
    );

    expect(result).toEqual({
      status: "UNKNOWN",
      reason: "PROVIDER_OUTCOME_UNCERTAIN",
    });

    expect(transition).toHaveBeenCalledWith(
      expect.anything(),
      operation.id,
      operation.claimToken,
      expect.objectContaining({
        status: "UNKNOWN",
      })
    );
  });

  it("reports uncertainty if the provider accepts but DB update fails", async () => {
    transition.mockResolvedValueOnce(false);

    const result = await processOneShopperMarketingSync(
      {} as never,
      { enableProviderSubmission: true }
    );

    expect(result.status).toBe("UNKNOWN");
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("blocks historical old-address unsubscribe", async () => {
    claim.mockResolvedValueOnce({
      ...operation,
      reason: "EMAIL_CHANGE_OLD_ADDRESS",
      desiredConsent: false,
    });

    const result = await processOneShopperMarketingSync(
      {} as never,
      { enableProviderSubmission: true }
    );

    expect(result.status).toBe("BLOCKED");
    expect(submit).not.toHaveBeenCalled();
  });

  it("does not contact Klaviyo by default", async () => {
    const result = await processOneShopperMarketingSync(
      {} as never
    );

    expect(result).toEqual({
      status: "READY_NOT_SUBMITTED",
    });

    expect(submit).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("does not submit when ordering is blocked", async () => {
    ordering.mockResolvedValueOnce({
      status: "BLOCKED",
      reason: "EMAIL_OPERATION_UNRESOLVED",
    });

    const result = await processOneShopperMarketingSync(
      {} as never,
      { enableProviderSubmission: true }
    );

    expect(result.status).toBe("BLOCKED");
    expect(submit).not.toHaveBeenCalled();
  });
});

describe("Provider classification safety", () => {
  it("blocks global unsubscribe when classification fails", async () => {
    claim.mockResolvedValue({
      ...operation,
      desiredConsent: false,
      reason: "ACCOUNT_OPT_OUT",
    });

    classify.mockResolvedValue(false);

    const db = {
      newsletterSubscriber: {
        count: vi.fn().mockResolvedValue(0),
      },
    };

    readConsent.mockResolvedValue({
      profileId: "test-profile",
      state: "SUBSCRIBED",
    });

    readMembership.mockResolvedValue("MEMBER");

    const result = await processOneShopperMarketingSync(
      db as never,
      { enableProviderSubmission: true }
    );

    expect(result).toEqual({
      status: "TRANSITION_CONFLICT",
    });

    expect(classify).toHaveBeenCalledWith(
      expect.anything(),
      operation.id,
      operation.claimToken,
      "UNSUBSCRIBE"
    );

    expect(submit).not.toHaveBeenCalled();
    expect(removeFromList).not.toHaveBeenCalled();
  });

  it("blocks shopper-list removal when classification fails", async () => {
    claim.mockResolvedValue({
      ...operation,
      desiredConsent: false,
      reason: "ACCOUNT_OPT_OUT",
    });

    classify.mockResolvedValue(false);

    const db = {
      newsletterSubscriber: {
        count: vi.fn().mockResolvedValue(1),
      },
    };

    readConsent.mockResolvedValue({
      profileId: "test-profile",
      state: "SUBSCRIBED",
    });

    readMembership.mockResolvedValue("MEMBER");

    const result = await processOneShopperMarketingSync(
      db as never,
      { enableProviderSubmission: true }
    );

    expect(result).toEqual({
      status: "TRANSITION_CONFLICT",
    });

    expect(classify).toHaveBeenCalledWith(
      expect.anything(),
      operation.id,
      operation.claimToken,
      "REMOVE_FROM_SHOPPER_LIST"
    );

    expect(removeFromList).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });
});
describe("Klaviyo unsubscribe membership safety", () => {
  const newsletterCount = vi.fn();

  const db = {
    newsletterSubscriber: {
      count: newsletterCount,
    },
  } as never;
  beforeEach(() => {
    vi.resetAllMocks();

    claim.mockResolvedValue({
      ...operation,
      desiredConsent: false,
      reason: "ACCOUNT_OPT_OUT",
    });

    validate.mockResolvedValue({
      status: "READY",
      reason: "CURRENT_CONSENT",
    });

    ordering.mockResolvedValue({ status: "CLEAR" });
    transition.mockResolvedValue(true);
  classify.mockResolvedValue(true);

    readConsent.mockResolvedValue({
      state: "SUBSCRIBED",
      profileId: "test-profile-id",
    });

    readMembership.mockResolvedValue("MEMBER");
    removeFromList.mockResolvedValue();
    newsletterCount.mockResolvedValue(0);

    submit.mockResolvedValue({
      status: "SUBMITTED_WITH_JOB_ID",
      providerJobId: "test-unsubscribe-job",
    });
  });

  it("permits unsubscribe for a confirmed shopper-list member", async () => {
    const result = await processOneShopperMarketingSync(
      db,
      { enableProviderSubmission: true }
    );

    expect(result).toEqual({
      status: "SUBMITTED",
      providerJobId: "test-unsubscribe-job",
    });

    expect(readMembership).toHaveBeenCalledWith("test-profile-id");

    expect(submit).toHaveBeenCalledWith({
      email: operation.email,
      action: "UNSUBSCRIBE",
    });
  });

  it("blocks unsubscribe when profile is not a shopper-list member", async () => {
    readMembership.mockResolvedValueOnce("NOT_MEMBER");

    const result = await processOneShopperMarketingSync(
      db,
      { enableProviderSubmission: true }
    );

    expect(result).toEqual({
      status: "BLOCKED",
      reason: "SHOPPER_LIST_MEMBERSHIP_UNVERIFIED",
    });

    expect(submit).not.toHaveBeenCalled();
  });

  it("blocks unsubscribe when membership is unknown", async () => {
    readMembership.mockResolvedValueOnce("UNKNOWN");

    const result = await processOneShopperMarketingSync(
      db,
      { enableProviderSubmission: true }
    );

    expect(result.status).toBe("BLOCKED");
    expect(submit).not.toHaveBeenCalled();
  });

  it("blocks unsubscribe when provider profile is missing", async () => {
    readConsent.mockResolvedValueOnce({
      state: "UNKNOWN",
      profileId: null,
    });

    const result = await processOneShopperMarketingSync(
      db,
      { enableProviderSubmission: true }
    );

    expect(result.status).toBe("BLOCKED");
    expect(readMembership).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  it("blocks unsubscribe when provider lookup fails", async () => {
    readConsent.mockRejectedValueOnce(
      new Error("Simulated Klaviyo lookup failure")
    );

    const result = await processOneShopperMarketingSync(
      db,
      { enableProviderSubmission: true }
    );

    expect(result.status).toBe("BLOCKED");
    expect(submit).not.toHaveBeenCalled();
  });

  it("removes shopper-list membership while preserving confirmed newsletter consent", async () => {
    newsletterCount.mockResolvedValueOnce(1);
    removeFromList.mockResolvedValueOnce();

    const result = await processOneShopperMarketingSync(
      db,
      { enableProviderSubmission: true }
    );

    expect(result).toEqual({
      status: "UNKNOWN",
      reason: "SHOPPER_LIST_REMOVAL_RECONCILIATION_REQUIRED",
    });

    expect(readMembership).toHaveBeenCalledWith("test-profile-id");
    expect(removeFromList).toHaveBeenCalledExactlyOnceWith({
      profileId: "test-profile-id",
    });
    expect(submit).not.toHaveBeenCalled();
    expect(transition).toHaveBeenCalledWith(
      expect.anything(),
      operation.id,
      operation.claimToken,
      expect.objectContaining({ status: "UNKNOWN" })
    );
  });

  it("quarantines uncertain shopper-list removal outcomes", async () => {
    newsletterCount.mockResolvedValueOnce(1);
    removeFromList.mockRejectedValueOnce(
      new Error("Simulated Klaviyo removal failure")
    );

    const result = await processOneShopperMarketingSync(
      db,
      { enableProviderSubmission: true }
    );

    expect(result).toEqual({
      status: "UNKNOWN",
      reason: "PROVIDER_OUTCOME_UNCERTAIN",
    });

    expect(removeFromList).toHaveBeenCalledTimes(1);
    expect(submit).not.toHaveBeenCalled();
  });

  it("blocks shopper-list removal when membership cannot be verified", async () => {
    newsletterCount.mockResolvedValueOnce(1);
    readMembership.mockResolvedValueOnce("UNKNOWN");

    const result = await processOneShopperMarketingSync(
      db,
      { enableProviderSubmission: true }
    );

    expect(result).toEqual({
      status: "BLOCKED",
      reason: "SHOPPER_LIST_MEMBERSHIP_UNVERIFIED",
    });

    expect(removeFromList).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });

  it("continues unsubscribe when no confirmed newsletter consent exists", async () => {
    newsletterCount.mockResolvedValueOnce(0);

    const result = await processOneShopperMarketingSync(
      db,
      { enableProviderSubmission: true }
    );

    expect(result.status).toBe("SUBMITTED");
    expect(newsletterCount).toHaveBeenCalledTimes(1);
    expect(readMembership).toHaveBeenCalledWith("test-profile-id");
    expect(submit).toHaveBeenCalledWith({
      email: operation.email,
      action: "UNSUBSCRIBE",
    });
  });

  it("blocks unsubscribe when newsletter ownership lookup fails", async () => {
    newsletterCount.mockRejectedValueOnce(
      new Error("Simulated database lookup failure")
    );

    const result = await processOneShopperMarketingSync(
      db,
      { enableProviderSubmission: true }
    );

    expect(result).toEqual({
      status: "BLOCKED",
      reason: "NEWSLETTER_OWNERSHIP_LOOKUP_FAILED",
    });

    expect(readConsent).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });
});