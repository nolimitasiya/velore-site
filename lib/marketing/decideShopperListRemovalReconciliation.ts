export type ShopperListRemovalEvidence = {
  membership: "MEMBER" | "NOT_MEMBER" | "UNKNOWN";
  independentNewsletterConsentPreserved: boolean;
  promotionalFlowSuppressionVerified: boolean;
};

export type ShopperListRemovalDecision =
  | { status: "APPLIED" }
  | { status: "UNKNOWN"; reason: string };

export function decideShopperListRemovalReconciliation(
  evidence: ShopperListRemovalEvidence
): ShopperListRemovalDecision {
  if (evidence.membership === "UNKNOWN") {
    return {
      status: "UNKNOWN",
      reason: "Shopper-list membership could not be verified.",
    };
  }

  if (evidence.membership === "MEMBER") {
    return {
      status: "UNKNOWN",
      reason: "Shopper remains on the Klaviyo shopper list.",
    };
  }

  if (!evidence.independentNewsletterConsentPreserved) {
    return {
      status: "UNKNOWN",
      reason: "Independent newsletter consent preservation is unverified.",
    };
  }

  if (!evidence.promotionalFlowSuppressionVerified) {
    return {
      status: "UNKNOWN",
      reason: "Shopper promotional-flow suppression is unverified.",
    };
  }

  return { status: "APPLIED" };
}