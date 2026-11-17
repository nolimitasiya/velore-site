import { describe, expect, it } from "vitest";

import {
  decideShopperMarketingReconciliation,
} from "./decideShopperMarketingReconciliation";

describe("shopper marketing reconciliation decisions", () => {
  it("waits for pending jobs", () => {
    expect(
      decideShopperMarketingReconciliation({
        status: "PENDING",
      })
    ).toEqual({ status: "WAIT" });
  });

  it("applies only verified completed jobs", () => {
    expect(
      decideShopperMarketingReconciliation({
        status: "COMPLETED",
        consentVerified: true,
      })
    ).toEqual({ status: "APPLIED" });
  });

  it("does not trust completion without consent verification", () => {
    expect(
      decideShopperMarketingReconciliation({
        status: "COMPLETED",
        consentVerified: false,
      })
    ).toEqual({
      status: "UNKNOWN",
      reason: "Completed job without verified consent.",
    });
  });

  it("recognises confirmed failures", () => {
    expect(
      decideShopperMarketingReconciliation({
        status: "FAILED",
        failureConfirmed: true,
      })
    ).toEqual({ status: "FAILED" });
  });

  it("quarantines unconfirmed failures", () => {
    expect(
      decideShopperMarketingReconciliation({
        status: "FAILED",
        failureConfirmed: false,
      })
    ).toEqual({
      status: "UNKNOWN",
      reason: "Provider failure outcome is unconfirmed.",
    });
  });

  it("quarantines missing provider jobs", () => {
    expect(
      decideShopperMarketingReconciliation({
        status: "NOT_FOUND",
      })
    ).toEqual({
      status: "UNKNOWN",
      reason: "Provider job could not be found.",
    });
  });

  it("quarantines unavailable reconciliation", () => {
    expect(
      decideShopperMarketingReconciliation({
        status: "UNAVAILABLE",
      })
    ).toEqual({
      status: "UNKNOWN",
      reason: "Provider reconciliation is unavailable.",
    });
  });
});
