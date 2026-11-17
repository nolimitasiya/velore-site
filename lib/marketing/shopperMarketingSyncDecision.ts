export type MarketingSyncReason =
  | "REGISTRATION"
  | "ACCOUNT_OPT_IN"
  | "ACCOUNT_OPT_OUT"
  | "EMAIL_CHANGE_OLD_ADDRESS"
  | "EMAIL_CHANGE_NEW_ADDRESS"
  | "RECONCILIATION";

export type MarketingSyncOperation = {
  email: string;
  consentVersion: number;
  desiredConsent: boolean;
  reason: MarketingSyncReason;
};

export type MarketingSyncShopper = {
  email: string;
  emailVerifiedAt: Date | null;
  marketingConsent: boolean;
  marketingConsentVersion: number;
};

export type MarketingSyncDecision =
  | {
      status: "READY";
      reason: "CURRENT_CONSENT";
    }
  | {
      status: "SUPERSEDED";
      reason:
        | "OLDER_VERSION"
        | "CONSENT_CHANGED"
        | "EMAIL_CHANGED";
    }
  | {
      status: "BLOCKED";
      reason:
        | "INVALID_VERSION"
        | "FUTURE_VERSION"
        | "UNVERIFIED_EMAIL"
        | "INVALID_EMAIL_CHANGE_OPERATION"
        | "SHARED_EMAIL_REVIEW";
    };

function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function decideShopperMarketingSync(
  operation: MarketingSyncOperation,
  shopper: MarketingSyncShopper,
  options: {
    sharedEmailRequiresReview?: boolean;
  } = {}
): MarketingSyncDecision {
  const operationEmail = normaliseEmail(operation.email);
  const shopperEmail = normaliseEmail(shopper.email);

  if (
    !Number.isSafeInteger(operation.consentVersion) ||
    operation.consentVersion < 1
  ) {
    return {
      status: "BLOCKED",
      reason: "INVALID_VERSION",
    };
  }

  if (
    operation.consentVersion >
    shopper.marketingConsentVersion
  ) {
    return {
      status: "BLOCKED",
      reason: "FUTURE_VERSION",
    };
  }

  if (
    operation.reason === "EMAIL_CHANGE_OLD_ADDRESS"
  ) {
    if (
      operation.desiredConsent ||
      operationEmail === shopperEmail
    ) {
      return {
        status: "BLOCKED",
        reason: "INVALID_EMAIL_CHANGE_OPERATION",
      };
    }

    if (options.sharedEmailRequiresReview) {
      return {
        status: "BLOCKED",
        reason: "SHARED_EMAIL_REVIEW",
      };
    }

    return {
      status: "READY",
      reason: "CURRENT_CONSENT",
    };
  }

  if (
    operation.consentVersion <
    shopper.marketingConsentVersion
  ) {
    return {
      status: "SUPERSEDED",
      reason: "OLDER_VERSION",
    };
  }

  if (operationEmail !== shopperEmail) {
    return {
      status: "SUPERSEDED",
      reason: "EMAIL_CHANGED",
    };
  }

  if (
    operation.desiredConsent !==
    shopper.marketingConsent
  ) {
    return {
      status: "SUPERSEDED",
      reason: "CONSENT_CHANGED",
    };
  }

  if (
    operation.desiredConsent &&
    !shopper.emailVerifiedAt
  ) {
    return {
      status: "BLOCKED",
      reason: "UNVERIFIED_EMAIL",
    };
  }

  if (options.sharedEmailRequiresReview) {
    return {
      status: "BLOCKED",
      reason: "SHARED_EMAIL_REVIEW",
    };
  }

  return {
    status: "READY",
    reason: "CURRENT_CONSENT",
  };
}
