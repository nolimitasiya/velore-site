import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { shouldBlockNewsletterConfirmation } from "./shouldBlockNewsletterConfirmation";

describe("newsletter subscription marketing consent rules", () => {
  it("allows subscriptions without a verified shopper", () => {
    expect(
      shouldBlockNewsletterConfirmation({
        verifiedShopperCount: 0,
        shopperMarketingConsent: null,
        shopperConsentVersion: null,
        latestAccountOperation: null,
        latestAccountOperationVersion: null,
      })
    ).toBe(false);
  });

  it("allows default false consent without explicit withdrawal", () => {
    expect(
      shouldBlockNewsletterConfirmation({
        verifiedShopperCount: 1,
        shopperMarketingConsent: false,
        shopperConsentVersion: 0,
        latestAccountOperation: null,
        latestAccountOperationVersion: null,
      })
    ).toBe(false);
  });

  it("blocks explicit account withdrawal", () => {
    expect(
      shouldBlockNewsletterConfirmation({
        verifiedShopperCount: 1,
        shopperMarketingConsent: false,
        shopperConsentVersion: 2,
        latestAccountOperation: "ACCOUNT_OPT_OUT",
        latestAccountOperationVersion: 2,
      })
    ).toBe(true);
  });

  it("blocks multiple verified shoppers sharing an email", () => {
    expect(
      shouldBlockNewsletterConfirmation({
        verifiedShopperCount: 2,
        shopperMarketingConsent: null,
        shopperConsentVersion: null,
        latestAccountOperation: null,
        latestAccountOperationVersion: null,
      })
    ).toBe(true);
  });

  it("allows subscription following renewed account opt-in", () => {
    expect(
      shouldBlockNewsletterConfirmation({
        verifiedShopperCount: 1,
        shopperMarketingConsent: true,
        shopperConsentVersion: 3,
        latestAccountOperation: "ACCOUNT_OPT_IN",
        latestAccountOperationVersion: 3,
      })
    ).toBe(false);
  });
});