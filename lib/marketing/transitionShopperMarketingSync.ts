import "server-only";

import type {
  PrismaClient,
  ShopperMarketingProviderOperationType,
} from "@prisma/client";

type TransitionDatabase = Pick<
  PrismaClient,
  "shopperMarketingConsentSync"
>;

export type MarketingSyncTransition =
  | {
      status: "SUPERSEDED";
    }
  | {
      status: "SUBMITTED";
      providerJobId: string;
    }
  | {
      status: "FAILED";
      error: string;
      nextAttemptAt: Date | null;
    }
  | {
      status: "UNKNOWN";
      error: string;
      providerAccepted?: boolean;
    };

export async function transitionShopperMarketingSync(
  db: TransitionDatabase,
  operationId: string,
  claimToken: string,
  transition: MarketingSyncTransition
): Promise<boolean> {
  if (!operationId || !claimToken) {
    throw new Error("Operation ID and claim token are required");
  }

  const now = new Date();

  let data;

  switch (transition.status) {
    case "SUPERSEDED":
      data = {
        status: "SUPERSEDED" as const,
        claimToken: null,
        claimedAt: null,
        nextAttemptAt: null,
      };
      break;

    case "SUBMITTED":
      if (!transition.providerJobId.trim()) {
        throw new Error("Provider job ID is required");
      }

      data = {
        status: "SUBMITTED" as const,
        providerJobId: transition.providerJobId,
        submittedAt: now,
        claimToken: null,
        claimedAt: null,
        nextAttemptAt: null,
      };
      break;

    case "FAILED":
      if (!transition.error.trim()) {
        throw new Error("Failure reason is required");
      }

      data = {
        status: "FAILED" as const,
        lastError: transition.error,
        nextAttemptAt: transition.nextAttemptAt,
        claimToken: null,
        claimedAt: null,
      };
      break;

    case "UNKNOWN":
      if (!transition.error.trim()) {
        throw new Error("Unknown-outcome reason is required");
      }

      data = {
        status: "UNKNOWN" as const,
        lastError: transition.error,
        ...(transition.providerAccepted === true
          ? { submittedAt: now }
          : {}),
        claimToken: null,
        claimedAt: null,
        nextAttemptAt: null,
      };
      break;
  }

  const result =
    await db.shopperMarketingConsentSync.updateMany({
      where: {
        id: operationId,
        status: "PROCESSING",
        claimToken,
      },
      data,
    });

  return result.count === 1;
}

export async function classifyShopperMarketingProviderOperation(
  db: TransitionDatabase,
  operationId: string,
  claimToken: string,
  providerOperationType: Exclude<
    ShopperMarketingProviderOperationType,
    "SUBSCRIBE"
  >
): Promise<boolean> {
  if (!operationId.trim() || !claimToken.trim()) {
    throw new Error("Operation ID and claim token are required");
  }

  const result =
    await db.shopperMarketingConsentSync.updateMany({
      where: {
        id: operationId,
        status: "PROCESSING",
        claimToken,
        desiredConsent: false,
        providerOperationType: null,
      },
      data: {
        providerOperationType,
      },
    });

  return result.count === 1;
}
