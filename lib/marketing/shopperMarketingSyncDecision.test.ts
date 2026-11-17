import { describe, expect, it } from "vitest";

import {
  decideShopperMarketingSync,
  type MarketingSyncOperation,
  type MarketingSyncShopper,
} from "./shopperMarketingSyncDecision";

const verifiedAt = new Date("2026-11-12T12:00:00.000Z");

const shopper: MarketingSyncShopper = {
  email: "shopper@example.com",
  emailVerifiedAt: verifiedAt,
  marketingConsent: true,
  marketingConsentVersion: 3,
};

const operation: MarketingSyncOperation = {
  email: "shopper@example.com",
  consentVersion: 3,
  desiredConsent: true,
  reason: "ACCOUNT_OPT_IN",
};

function decide(
  operationOverrides: Partial<MarketingSyncOperation> = {},
  shopperOverrides: Partial<MarketingSyncShopper> = {},
  options: { sharedEmailRequiresReview?: boolean } = {}
) {
  return decideShopperMarketingSync(
    { ...operation, ...operationOverrides },
    { ...shopper, ...shopperOverrides },
    options
  );
}

describe("shopper marketing consent sync decisions", () => {
  it("accepts a current verified opt-in", () => {
    expect(decide()).toEqual({
      status: "READY",
      reason: "CURRENT_CONSENT",
    });
  });

  it("accepts a current withdrawal", () => {
    expect(
      decide(
        {
          desiredConsent: false,
          reason: "ACCOUNT_OPT_OUT",
        },
        { marketingConsent: false }
      )
    ).toEqual({
      status: "READY",
      reason: "CURRENT_CONSENT",
    });
  });

  it("supersedes an older consent version", () => {
    expect(
      decide({ consentVersion: 2 })
    ).toEqual({
      status: "SUPERSEDED",
      reason: "OLDER_VERSION",
    });
  });

  it("blocks a future consent version", () => {
    expect(
      decide({ consentVersion: 4 })
    ).toEqual({
      status: "BLOCKED",
      reason: "FUTURE_VERSION",
    });
  });

  it("blocks zero consent version", () => {
    expect(
      decide({ consentVersion: 0 })
    ).toEqual({
      status: "BLOCKED",
      reason: "INVALID_VERSION",
    });
  });

  it("blocks fractional consent versions", () => {
    expect(
      decide({ consentVersion: 1.5 })
    ).toEqual({
      status: "BLOCKED",
      reason: "INVALID_VERSION",
    });
  });

  it("blocks an unverified opt-in", () => {
    expect(
      decide(
        {},
        { emailVerifiedAt: null }
      )
    ).toEqual({
      status: "BLOCKED",
      reason: "UNVERIFIED_EMAIL",
    });
  });

  it("allows withdrawal without email verification", () => {
    expect(
      decide(
        {
          desiredConsent: false,
          reason: "ACCOUNT_OPT_OUT",
        },
        {
          emailVerifiedAt: null,
          marketingConsent: false,
        }
      )
    ).toEqual({
      status: "READY",
      reason: "CURRENT_CONSENT",
    });
  });

  it("supersedes an operation when consent changes", () => {
    expect(
      decide(
        {},
        { marketingConsent: false }
      )
    ).toEqual({
      status: "SUPERSEDED",
      reason: "CONSENT_CHANGED",
    });
  });

  it("supersedes an operation for a different current email", () => {
    expect(
      decide(
        { email: "previous@example.com" }
      )
    ).toEqual({
      status: "SUPERSEDED",
      reason: "EMAIL_CHANGED",
    });
  });

  it("normalises email casing", () => {
    expect(
      decide({
        email: " SHOPPER@EXAMPLE.COM ",
      })
    ).toEqual({
      status: "READY",
      reason: "CURRENT_CONSENT",
    });
  });

  it("allows an old-address withdrawal after an email change", () => {
    expect(
      decide({
        email: "previous@example.com",
        consentVersion: 2,
        desiredConsent: false,
        reason: "EMAIL_CHANGE_OLD_ADDRESS",
      })
    ).toEqual({
      status: "READY",
      reason: "CURRENT_CONSENT",
    });
  });

  it("rejects old-address operations requesting subscription", () => {
    expect(
      decide({
        email: "previous@example.com",
        desiredConsent: true,
        reason: "EMAIL_CHANGE_OLD_ADDRESS",
      })
    ).toEqual({
      status: "BLOCKED",
      reason: "INVALID_EMAIL_CHANGE_OPERATION",
    });
  });

  it("rejects old-address withdrawal targeting the current email", () => {
    expect(
      decide({
        desiredConsent: false,
        reason: "EMAIL_CHANGE_OLD_ADDRESS",
      })
    ).toEqual({
      status: "BLOCKED",
      reason: "INVALID_EMAIL_CHANGE_OPERATION",
    });
  });

  it("requires review for shared-email opt-in", () => {
    expect(
      decide(
        {},
        {},
        { sharedEmailRequiresReview: true }
      )
    ).toEqual({
      status: "BLOCKED",
      reason: "SHARED_EMAIL_REVIEW",
    });
  });

  it("requires review for shared-email withdrawal", () => {
    expect(
      decide(
        {
          desiredConsent: false,
          reason: "ACCOUNT_OPT_OUT",
        },
        { marketingConsent: false },
        { sharedEmailRequiresReview: true }
      )
    ).toEqual({
      status: "BLOCKED",
      reason: "SHARED_EMAIL_REVIEW",
    });
  });

  it("requires review for shared old-address withdrawal", () => {
    expect(
      decide(
        {
          email: "previous@example.com",
          consentVersion: 2,
          desiredConsent: false,
          reason: "EMAIL_CHANGE_OLD_ADDRESS",
        },
        {},
        { sharedEmailRequiresReview: true }
      )
    ).toEqual({
      status: "BLOCKED",
      reason: "SHARED_EMAIL_REVIEW",
    });
  });

  it("handles new-address non-consent after an email change", () => {
    expect(
      decide(
        {
          desiredConsent: false,
          reason: "EMAIL_CHANGE_NEW_ADDRESS",
        },
        { marketingConsent: false }
      )
    ).toEqual({
      status: "READY",
      reason: "CURRENT_CONSENT",
    });
  });
});
