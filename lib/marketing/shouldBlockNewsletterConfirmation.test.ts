import { describe, expect, it } from "vitest";

import {
  shouldBlockNewsletterConfirmation,
  type NewsletterConfirmationConsentState,
} from "./shouldBlockNewsletterConfirmation";

const base: NewsletterConfirmationConsentState = {
  verifiedShopperCount: 1,
  shopperMarketingConsent: false,
  shopperConsentVersion: 0,
  latestAccountOperation: null,
  latestAccountOperationVersion: null,
};

describe("newsletter confirmation consent history", () => {
  it("allows independent newsletter subscribers", () => {
    expect(shouldBlockNewsletterConfirmation({
      ...base,
      verifiedShopperCount: 0,
    })).toBe(false);
  });

  it("allows default false without withdrawal history", () => {
    expect(shouldBlockNewsletterConfirmation(base)).toBe(false);
  });

  it("blocks current explicit account withdrawal", () => {
    expect(shouldBlockNewsletterConfirmation({
      ...base,
      shopperConsentVersion: 2,
      latestAccountOperation: "ACCOUNT_OPT_OUT",
      latestAccountOperationVersion: 2,
    })).toBe(true);
  });

  it("preserves explicit withdrawal across unrelated consent-version changes", () => {
    expect(shouldBlockNewsletterConfirmation({
      ...base,
      shopperConsentVersion: 4,
      latestAccountOperation: "ACCOUNT_OPT_OUT",
      latestAccountOperationVersion: 2,
    })).toBe(true);
  });

  it("does not treat email-change reset as withdrawal", () => {
    expect(shouldBlockNewsletterConfirmation({
      ...base,
      shopperConsentVersion: 3,
      latestAccountOperation: null,
      latestAccountOperationVersion: null,
    })).toBe(false);
  });

  it("allows current account opt-in", () => {
    expect(shouldBlockNewsletterConfirmation({
      ...base,
      shopperMarketingConsent: true,
      shopperConsentVersion: 3,
      latestAccountOperation: "ACCOUNT_OPT_IN",
      latestAccountOperationVersion: 3,
    })).toBe(false);
  });

  it("blocks conflicting verified ownership", () => {
    expect(shouldBlockNewsletterConfirmation({
      ...base,
      verifiedShopperCount: 2,
    })).toBe(true);
  });
});
