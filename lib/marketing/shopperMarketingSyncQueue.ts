import "server-only";

import type { PrismaClient } from "@prisma/client";

import {
  decideShopperMarketingSync,
  type MarketingSyncDecision,
} from "./shopperMarketingSyncDecision";

type QueueDatabase = Pick<
  PrismaClient,
  "shopperMarketingConsentSync" | "shopper"
>;

export type MarketingSyncQueueSummary = {
  inspected: number;
  ready: number;
  superseded: number;
  blocked: number;
  reasons: Record<string, number>;
};

export async function inspectShopperMarketingSyncQueue(
  db: QueueDatabase,
  limit = 50
): Promise<MarketingSyncQueueSummary> {
  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    throw new Error("Queue inspection limit must be 1-100");
  }

  const operations =
    await db.shopperMarketingConsentSync.findMany({
      where: {
        status: {
          in: ["PENDING", "FAILED"],
        },
      },
      orderBy: [
        { createdAt: "asc" },
        { id: "asc" },
      ],
      take: limit,
      select: {
        shopperId: true,
        email: true,
        consentVersion: true,
        desiredConsent: true,
        reason: true,
      },
    });

  const summary: MarketingSyncQueueSummary = {
    inspected: 0,
    ready: 0,
    superseded: 0,
    blocked: 0,
    reasons: {},
  };

  for (const operation of operations) {
    summary.inspected += 1;

    const shopper = await db.shopper.findUnique({
      where: {
        id: operation.shopperId,
      },
      select: {
        email: true,
        emailVerifiedAt: true,
        marketingConsent: true,
        marketingConsentVersion: true,
      },
    });

    let decision: MarketingSyncDecision;

    if (!shopper) {
      decision = {
        status: "BLOCKED",
        reason: "INVALID_VERSION",
      };
    } else {
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

      decision = decideShopperMarketingSync(
        operation,
        shopper,
        {
          sharedEmailRequiresReview:
            matchingShoppers > 0,
        }
      );
    }

    if (decision.status === "READY") {
      summary.ready += 1;
    } else if (
      decision.status === "SUPERSEDED"
    ) {
      summary.superseded += 1;
    } else {
      summary.blocked += 1;
    }

    summary.reasons[decision.reason] =
      (summary.reasons[decision.reason] ?? 0) + 1;
  }

  return summary;
}
