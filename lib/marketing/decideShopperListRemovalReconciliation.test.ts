import { describe, expect, it } from "vitest";

import {
  decideShopperListRemovalReconciliation,
} from "./decideShopperListRemovalReconciliation";

describe("shopper-list removal reconciliation", () => {
  const verified = {
    membership: "NOT_MEMBER" as const,
    independentNewsletterConsentPreserved: true,
    promotionalFlowSuppressionVerified: true,
  };

  it("applies only when all safeguards are verified", () => {
    expect(
      decideShopperListRemovalReconciliation(verified)
    ).toEqual({ status: "APPLIED" });
  });

  it("does not apply while the shopper remains a list member", () => {
    expect(
      decideShopperListRemovalReconciliation({
        ...verified,
        membership: "MEMBER",
      })
    ).toEqual({
      status: "UNKNOWN",
      reason: "Shopper remains on the Klaviyo shopper list.",
    });
  });

  it("requires independent newsletter consent preservation", () => {
    expect(
      decideShopperListRemovalReconciliation({
        ...verified,
        independentNewsletterConsentPreserved: false,
      })
    ).toEqual({
      status: "UNKNOWN",
      reason: "Independent newsletter consent preservation is unverified.",
    });
  });

  it("requires promotional-flow suppression verification", () => {
    expect(
      decideShopperListRemovalReconciliation({
        ...verified,
        promotionalFlowSuppressionVerified: false,
      })
    ).toEqual({
      status: "UNKNOWN",
      reason: "Shopper promotional-flow suppression is unverified.",
    });
  });
});