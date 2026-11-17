import "server-only";

import type { PrismaClient } from "@prisma/client";

import {
  decideShopperMarketingSync,
  type MarketingSyncDecision,
} from "./shopperMarketingSyncDecision";

type ValidationDatabase = Pick<
  PrismaClient,
  "shopperMarketingConsentSync" | "shopper"
>;

export type ClaimedMarketingSyncValidation =
  | {
      status: "INVALID_CLAIM";
      reason: "NOT_FOUND" | "NOT_PROCESSING" | "TOKEN_MISMATCH";
    }
  | MarketingSyncDecision;

export async function validateClaimedShopperMarketingSync(
  db: ValidationDatabase,
  operationId: string,
  claimToken: string
): Promise<ClaimedMarketingSyncValidation> {
  if (!operationId || !claimToken) {
    return {
      status: "INVALID_CLAIM",
      reason: "TOKEN_MISMATCH",
    };
  }

  const operation =
    await db.shopperMarketingConsentSync.findUnique({
      where: { id: operationId },
      select: {
        shopperId: true,
        email: true,
        consentVersion: true,
        desiredConsent: true,
        reason: true,
        status: true,
        claimToken: true,
      },
    });

  if (!operation) {
    return {
      status: "INVALID_CLAIM",
      reason: "NOT_FOUND",
    };
  }

  if (operation.status !== "PROCESSING") {
    return {
      status: "INVALID_CLAIM",
      reason: "NOT_PROCESSING",
    };
  }

  if (operation.claimToken !== claimToken) {
    return {
      status: "INVALID_CLAIM",
      reason: "TOKEN_MISMATCH",
    };
  }

  const shopper = await db.shopper.findUnique({
    where: { id: operation.shopperId },
    select: {
      email: true,
      emailVerifiedAt: true,
      marketingConsent: true,
      marketingConsentVersion: true,
    },
  });

  if (!shopper) {
    return {
      status: "BLOCKED",
      reason: "INVALID_VERSION",
    };
  }

  const matchingShoppers = await db.shopper.count({
    where: {
      email: {
        equals: operation.email,
        mode: "insensitive",
      },
      id: {
        not: operation.shopperId,
      },
    },
  });

  return decideShopperMarketingSync(
    operation,
    shopper,
    {
      sharedEmailRequiresReview:
        matchingShoppers > 0,
    }
  );
}
