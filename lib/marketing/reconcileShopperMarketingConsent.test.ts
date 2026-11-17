import { describe, expect, it } from "vitest";

import {
  reconcileShopperMarketingConsent,
} from "./reconcileShopperMarketingConsent";

const base = {
  operationVersion: 3,
  currentConsentVersion: 3,
  operationEmail: "shopper@example.com",
  currentEmail: "shopper@example.com",
  desiredConsent: true,
  providerConsent: "SUBSCRIBED" as const,
  jobCompleted: true,
  jobOutcomeVerified: true,
};

describe("shopper marketing consent reconciliation integration", () => {
  it("applies verified matching opt-in", () => {
    expect(reconcileShopperMarketingConsent(base)).toEqual({
      status: "APPLIED",
    });
  });

  it("applies verified matching opt-out", () => {
    expect(reconcileShopperMarketingConsent({
      ...base,
      desiredConsent: false,
      providerConsent: "UNSUBSCRIBED",
    })).toEqual({
      status: "APPLIED",
    });
  });

  it("accepts never subscribed for verified opt-out", () => {
    expect(reconcileShopperMarketingConsent({
      ...base,
      desiredConsent: false,
      providerConsent: "NEVER_SUBSCRIBED",
    })).toEqual({
      status: "APPLIED",
    });
  });

  it("rejects outdated consent versions", () => {
    expect(reconcileShopperMarketingConsent({
      ...base,
      operationVersion: 2,
    }).status).toBe("UNKNOWN");
  });

  it("rejects future consent versions", () => {
    expect(reconcileShopperMarketingConsent({
      ...base,
      operationVersion: 4,
    }).status).toBe("UNKNOWN");
  });

  it("rejects invalid consent versions", () => {
    expect(reconcileShopperMarketingConsent({
      ...base,
      operationVersion: -1,
    }).status).toBe("UNKNOWN");
  });

  it("rejects changed email addresses", () => {
    expect(reconcileShopperMarketingConsent({
      ...base,
      currentEmail: "new@example.com",
    }).status).toBe("UNKNOWN");
  });

  it("normalises matching email addresses", () => {
    expect(reconcileShopperMarketingConsent({
      ...base,
      operationEmail: " Shopper@Example.com ",
    }).status).toBe("APPLIED");
  });

  it("waits for incomplete provider jobs", () => {
    expect(reconcileShopperMarketingConsent({
      ...base,
      jobCompleted: false,
    })).toEqual({
      status: "WAIT",
    });
  });

  it("rejects unverified job outcomes", () => {
    expect(reconcileShopperMarketingConsent({
      ...base,
      jobOutcomeVerified: false,
    }).status).toBe("UNKNOWN");
  });

  it("rejects mismatched opt-in consent", () => {
    expect(reconcileShopperMarketingConsent({
      ...base,
      providerConsent: "UNSUBSCRIBED",
    }).status).toBe("UNKNOWN");
  });

  it("rejects mismatched opt-out consent", () => {
    expect(reconcileShopperMarketingConsent({
      ...base,
      desiredConsent: false,
      providerConsent: "SUBSCRIBED",
    }).status).toBe("UNKNOWN");
  });

  it("rejects unknown provider consent", () => {
    expect(reconcileShopperMarketingConsent({
      ...base,
      providerConsent: "UNKNOWN",
    }).status).toBe("UNKNOWN");
  });
});
