export type ProviderJobEvidence =
  | { status: "PENDING" }
  | { status: "COMPLETED"; consentVerified: boolean }
  | { status: "FAILED"; failureConfirmed: boolean }
  | { status: "NOT_FOUND" }
  | { status: "UNAVAILABLE" };

export type ReconciliationDecision =
  | { status: "WAIT" }
  | { status: "APPLIED" }
  | { status: "FAILED" }
  | { status: "UNKNOWN"; reason: string };

export function decideShopperMarketingReconciliation(
  evidence: ProviderJobEvidence
): ReconciliationDecision {
  switch (evidence.status) {
    case "PENDING":
      return { status: "WAIT" };

    case "COMPLETED":
      return evidence.consentVerified
        ? { status: "APPLIED" }
        : {
            status: "UNKNOWN",
            reason: "Completed job without verified consent.",
          };

    case "FAILED":
      return evidence.failureConfirmed
        ? { status: "FAILED" }
        : {
            status: "UNKNOWN",
            reason: "Provider failure outcome is unconfirmed.",
          };

    case "NOT_FOUND":
      return {
        status: "UNKNOWN",
        reason: "Provider job could not be found.",
      };

    case "UNAVAILABLE":
      return {
        status: "UNKNOWN",
        reason: "Provider reconciliation is unavailable.",
      };
  }
}
