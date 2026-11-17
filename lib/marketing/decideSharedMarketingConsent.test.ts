import { describe, expect, it } from "vitest";

import {
  decideSharedMarketingConsent,
  type SharedMarketingConsentInput,
} from "./decideSharedMarketingConsent";

const monday = new Date("2026-11-09T10:00:00Z");
const tuesday = new Date("2026-11-10T10:00:00Z");

const base: SharedMarketingConsentInput = {
  requestedAction: "SUBSCRIBE",
  source: "WAITLIST",
  verifiedShopperConsent: null,
  shopperDecisionAt: null,
  requestConsentAt: null,
  consentEvidence: "NONE",
  hasOwnershipConflict: false,
  isHistoricalEmailAddress: false,
};

describe("shared marketing consent decisions", () => {
  it("allows verified shopper opt-in", () => {
    expect(decideSharedMarketingConsent({
      ...base,
      source: "SHOPPER",
      verifiedShopperConsent: true,
      shopperDecisionAt: monday,
      requestConsentAt: monday,
      consentEvidence: "VERIFIED_SHOPPER_OPT_IN",
    })).toEqual({ status: "ALLOW" });
  });

  it("blocks unverified waitlist signup", () => {
    expect(decideSharedMarketingConsent({
      ...base,
      requestConsentAt: tuesday,
      consentEvidence: "UNVERIFIED_WAITLIST_REQUEST",
    })).toEqual({
      status: "BLOCK",
      reason: "NO_VERIFIED_MARKETING_CONSENT",
    });
  });

  it("blocks an old request after withdrawal", () => {
    expect(decideSharedMarketingConsent({
      ...base,
      source: "NEWSLETTER",
      verifiedShopperConsent: false,
      shopperDecisionAt: tuesday,
      requestConsentAt: monday,
      consentEvidence: "VERIFIED_NEWSLETTER_CONFIRMATION",
    })).toEqual({
      status: "BLOCK",
      reason: "SHOPPER_MARKETING_WITHDRAWN",
    });
  });

  it("allows a newer verified newsletter confirmation", () => {
    expect(decideSharedMarketingConsent({
      ...base,
      source: "NEWSLETTER",
      verifiedShopperConsent: false,
      shopperDecisionAt: monday,
      requestConsentAt: tuesday,
      consentEvidence: "VERIFIED_NEWSLETTER_CONFIRMATION",
    })).toEqual({ status: "ALLOW" });
  });

  it("allows independent verified newsletter consent", () => {
    expect(decideSharedMarketingConsent({
      ...base,
      source: "NEWSLETTER",
      requestConsentAt: tuesday,
      consentEvidence: "VERIFIED_NEWSLETTER_CONFIRMATION",
    })).toEqual({ status: "ALLOW" });
  });

  it("blocks missing consent evidence", () => {
    expect(decideSharedMarketingConsent(base)).toEqual({
      status: "BLOCK",
      reason: "NO_VERIFIED_MARKETING_CONSENT",
    });
  });

  it("blocks ownership conflicts", () => {
    expect(decideSharedMarketingConsent({
      ...base,
      hasOwnershipConflict: true,
    })).toEqual({
      status: "BLOCK",
      reason: "EMAIL_OWNERSHIP_CONFLICT",
    });
  });

  it("blocks historical email changes", () => {
    expect(decideSharedMarketingConsent({
      ...base,
      requestedAction: "UNSUBSCRIBE",
      isHistoricalEmailAddress: true,
    })).toEqual({
      status: "BLOCK",
      reason: "HISTORICAL_EMAIL_REQUIRES_REVIEW",
    });
  });

  it("allows current-address withdrawal", () => {
    expect(decideSharedMarketingConsent({
      ...base,
      requestedAction: "UNSUBSCRIBE",
    })).toEqual({ status: "ALLOW" });
  });

  it("blocks evidence from the wrong source", () => {
    expect(decideSharedMarketingConsent({
      ...base,
      source: "WAITLIST",
      requestConsentAt: tuesday,
      consentEvidence: "VERIFIED_NEWSLETTER_CONFIRMATION",
    })).toEqual({
      status: "BLOCK",
      reason: "CONSENT_EVIDENCE_SOURCE_MISMATCH",
    });
  });

  it("blocks invalid timestamps", () => {
    expect(decideSharedMarketingConsent({
      ...base,
      source: "NEWSLETTER",
      requestConsentAt: new Date("invalid"),
      consentEvidence: "VERIFIED_NEWSLETTER_CONFIRMATION",
    })).toEqual({
      status: "BLOCK",
      reason: "INVALID_CONSENT_TIMESTAMP",
    });
  });

  it("blocks missing timestamps for verified evidence", () => {
    expect(decideSharedMarketingConsent({
      ...base,
      source: "NEWSLETTER",
      consentEvidence: "VERIFIED_NEWSLETTER_CONFIRMATION",
    })).toEqual({
      status: "BLOCK",
      reason: "MISSING_CONSENT_TIMESTAMP",
    });
  });

  it("blocks an older newsletter request after shopper opt-in", () => {
    expect(decideSharedMarketingConsent({
      ...base,
      source: "NEWSLETTER",
      verifiedShopperConsent: true,
      shopperDecisionAt: tuesday,
      requestConsentAt: monday,
      consentEvidence: "VERIFIED_NEWSLETTER_CONFIRMATION",
    })).toEqual({
      status: "BLOCK",
      reason: "OUTDATED_CONSENT_REQUEST",
    });
  });

  it("blocks withdrawal with unknown decision timing", () => {
    expect(decideSharedMarketingConsent({
      ...base,
      source: "NEWSLETTER",
      verifiedShopperConsent: false,
      requestConsentAt: tuesday,
      consentEvidence: "VERIFIED_NEWSLETTER_CONFIRMATION",
    })).toEqual({
      status: "BLOCK",
      reason: "SHOPPER_MARKETING_WITHDRAWN",
    });
  });
});
