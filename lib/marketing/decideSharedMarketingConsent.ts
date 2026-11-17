export type MarketingConsentEvidence =
  | "VERIFIED_SHOPPER_OPT_IN"
  | "VERIFIED_NEWSLETTER_CONFIRMATION"
  | "UNVERIFIED_WAITLIST_REQUEST"
  | "NONE";

export type SharedMarketingConsentInput = {
  requestedAction: "SUBSCRIBE" | "UNSUBSCRIBE";
  source: "SHOPPER" | "WAITLIST" | "NEWSLETTER";

  // Latest explicit shopper decision, if one exists.
  // Null must not be interpreted as an explicit withdrawal.
  verifiedShopperConsent: boolean | null;
  shopperDecisionAt: Date | null;

  // Evidence supporting the requested action.
  requestConsentAt: Date | null;
  consentEvidence: MarketingConsentEvidence;

  hasOwnershipConflict: boolean;
  isHistoricalEmailAddress: boolean;
};

export type SharedMarketingConsentDecision =
  | { status: "ALLOW" }
  | { status: "BLOCK"; reason: string };

function validTimestamp(value: Date | null): boolean {
  return value === null ||
    (value instanceof Date && Number.isFinite(value.getTime()));
}

export function decideSharedMarketingConsent(
  input: SharedMarketingConsentInput
): SharedMarketingConsentDecision {
  if (input.hasOwnershipConflict) {
    return {
      status: "BLOCK",
      reason: "EMAIL_OWNERSHIP_CONFLICT",
    };
  }

  if (input.isHistoricalEmailAddress) {
    return {
      status: "BLOCK",
      reason: "HISTORICAL_EMAIL_REQUIRES_REVIEW",
    };
  }

  if (
    !validTimestamp(input.requestConsentAt) ||
    !validTimestamp(input.shopperDecisionAt)
  ) {
    return {
      status: "BLOCK",
      reason: "INVALID_CONSENT_TIMESTAMP",
    };
  }

  if (input.requestedAction === "UNSUBSCRIBE") {
    return { status: "ALLOW" };
  }

  if (
    input.consentEvidence === "NONE" ||
    input.consentEvidence === "UNVERIFIED_WAITLIST_REQUEST"
  ) {
    return {
      status: "BLOCK",
      reason: "NO_VERIFIED_MARKETING_CONSENT",
    };
  }

  if (
    input.consentEvidence === "VERIFIED_SHOPPER_OPT_IN" &&
    input.source !== "SHOPPER"
  ) {
    return {
      status: "BLOCK",
      reason: "CONSENT_EVIDENCE_SOURCE_MISMATCH",
    };
  }

  if (
    input.consentEvidence === "VERIFIED_NEWSLETTER_CONFIRMATION" &&
    input.source !== "NEWSLETTER"
  ) {
    return {
      status: "BLOCK",
      reason: "CONSENT_EVIDENCE_SOURCE_MISMATCH",
    };
  }

  const requestTime = input.requestConsentAt?.getTime();
  const shopperTime = input.shopperDecisionAt?.getTime();

  if (requestTime === undefined) {
    return {
      status: "BLOCK",
      reason: "MISSING_CONSENT_TIMESTAMP",
    };
  }

  if (input.verifiedShopperConsent === false) {
    if (
      shopperTime === undefined ||
      requestTime <= shopperTime
    ) {
      return {
        status: "BLOCK",
        reason: "SHOPPER_MARKETING_WITHDRAWN",
      };
    }
  }

  if (
    shopperTime !== undefined &&
    requestTime < shopperTime
  ) {
    return {
      status: "BLOCK",
      reason: "OUTDATED_CONSENT_REQUEST",
    };
  }

  return { status: "ALLOW" };
}
