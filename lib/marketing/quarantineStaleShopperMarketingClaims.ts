import "server-only";

import type { PrismaClient } from "@prisma/client";

import {
  classifyStaleShopperMarketingClaim,
} from "./classifyStaleShopperMarketingClaim";

type RecoveryDatabase = Pick<
  PrismaClient,
  "shopperMarketingConsentSync"
>;

export type StaleClaimRecoveryResult = {
  inspected: number;
  quarantined: number;
  conflicts: number;
};

export async function quarantineStaleShopperMarketingClaims(
  db: RecoveryDatabase,
  options: {
    now: Date;
    timeoutMs: number;
    limit?: number;
  }
): Promise<StaleClaimRecoveryResult> {
  const { now, timeoutMs } = options;
  const limit = options.limit ?? 50;

  if (
    !Number.isFinite(now.getTime()) ||
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    throw new Error("Invalid stale-claim recovery options.");
  }

  const cutoff = new Date(now.getTime() - timeoutMs);

  const candidates = await db.shopperMarketingConsentSync.findMany({
    where: {
      status: "PROCESSING",
      claimedAt: {
        lte: cutoff,
      },
    },
    orderBy: [
      { claimedAt: "asc" },
      { id: "asc" },
    ],
    take: limit,
  });

  let quarantined = 0;
  let conflicts = 0;

  for (const candidate of candidates) {
    const classification = classifyStaleShopperMarketingClaim(
      {
        status: candidate.status,
        claimedAt: candidate.claimedAt,
        submittedAt: candidate.submittedAt,
        providerJobId: candidate.providerJobId,
        lastCheckedAt: candidate.lastCheckedAt,
      },
      now,
      timeoutMs
    );

    if (
      classification.status !== "STALE_UNSUBMITTED" &&
      classification.status !== "STALE_PROVIDER_OUTCOME_UNKNOWN"
    ) {
      continue;
    }

    if (!candidate.claimToken || !candidate.claimedAt) {
      conflicts += 1;
      continue;
    }

    const result = await db.shopperMarketingConsentSync.updateMany({
      where: {
        id: candidate.id,
        status: "PROCESSING",
        claimToken: candidate.claimToken,
        claimedAt: candidate.claimedAt,
      },
      data: {
        status: "UNKNOWN",
        claimToken: null,
        claimedAt: null,
        lastError:
          classification.status === "STALE_PROVIDER_OUTCOME_UNKNOWN"
            ? "Stale claim: provider outcome requires reconciliation."
            : "Stale claim: provider submission cannot be ruled out.",
      },
    });

    if (result.count === 1) {
      quarantined += 1;
    } else {
      conflicts += 1;
    }
  }

  return {
    inspected: candidates.length,
    quarantined,
    conflicts,
  };
}
