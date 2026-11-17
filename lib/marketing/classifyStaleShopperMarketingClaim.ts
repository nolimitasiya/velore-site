export type StaleClaimClassification =
  | { status: "NOT_PROCESSING" }
  | { status: "INVALID_CLAIM_TIMESTAMP" }
  | { status: "ACTIVE" }
  | { status: "STALE_UNSUBMITTED" }
  | { status: "STALE_PROVIDER_OUTCOME_UNKNOWN" };

export type StaleClaimInput = {
  status: string;
  claimedAt: Date | null;
  submittedAt: Date | null;
  providerJobId: string | null;
  lastCheckedAt: Date | null;
};

export function classifyStaleShopperMarketingClaim(
  input: StaleClaimInput,
  now: Date,
  timeoutMs: number
): StaleClaimClassification {
  if (input.status !== "PROCESSING") {
    return { status: "NOT_PROCESSING" };
  }

  if (
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0 ||
    !Number.isFinite(now.getTime()) ||
    !input.claimedAt ||
    !Number.isFinite(input.claimedAt.getTime()) ||
    input.claimedAt.getTime() > now.getTime()
  ) {
    return { status: "INVALID_CLAIM_TIMESTAMP" };
  }

  if (now.getTime() - input.claimedAt.getTime() < timeoutMs) {
    return { status: "ACTIVE" };
  }

  if (input.providerJobId || input.submittedAt || input.lastCheckedAt) {
    return { status: "STALE_PROVIDER_OUTCOME_UNKNOWN" };
  }

  return { status: "STALE_UNSUBMITTED" };
}
