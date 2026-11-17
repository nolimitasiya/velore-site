import type {
  KlaviyoMarketingConsentState,
} from "../klaviyo/readShopperMarketingConsent";

import {
  decideShopperMarketingReconciliation,
  type ReconciliationDecision,
} from "./decideShopperMarketingReconciliation";

type ReconciliationInput = {
  operationVersion: number;
  currentConsentVersion: number;
  operationEmail: string;
  currentEmail: string;
  desiredConsent: boolean;
  providerConsent: KlaviyoMarketingConsentState;
  jobCompleted: boolean;
  jobOutcomeVerified: boolean;
};

export function reconcileShopperMarketingConsent(
  input: ReconciliationInput
): ReconciliationDecision {
  if (
    !Number.isSafeInteger(input.operationVersion) ||
    !Number.isSafeInteger(input.currentConsentVersion) ||
    input.operationVersion < 0 ||
    input.currentConsentVersion < 0
  ) {
    return {
      status: "UNKNOWN",
      reason: "Invalid consent version.",
    };
  }

  if (input.operationVersion !== input.currentConsentVersion) {
    return {
      status: "UNKNOWN",
      reason: "Consent version has changed.",
    };
  }

  const operationEmail = input.operationEmail.trim().toLowerCase();
  const currentEmail = input.currentEmail.trim().toLowerCase();

  if (!operationEmail || operationEmail !== currentEmail) {
    return {
      status: "UNKNOWN",
      reason: "Shopper email has changed.",
    };
  }

  if (!input.jobCompleted) {
    return decideShopperMarketingReconciliation({
      status: "PENDING",
    });
  }

  if (!input.jobOutcomeVerified) {
    return {
      status: "UNKNOWN",
      reason: "Provider job outcome has not been verified.",
    };
  }

  const consentMatches = input.desiredConsent
    ? input.providerConsent === "SUBSCRIBED"
    : input.providerConsent === "UNSUBSCRIBED" ||
      input.providerConsent === "NEVER_SUBSCRIBED";

  return decideShopperMarketingReconciliation({
    status: "COMPLETED",
    consentVerified: consentMatches,
  });
}
