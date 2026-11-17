import "server-only";

import type { PrismaClient } from "@prisma/client";

type OrderingDatabase = Pick<
  PrismaClient,
  "shopperMarketingConsentSync"
>;

export type ProviderOrderingResult =
  | { status: "CLEAR" }
  | {
      status: "BLOCKED";
      reason:
        | "SHOPPER_OPERATION_UNRESOLVED"
        | "EMAIL_OPERATION_UNRESOLVED";
    };

export async function checkShopperMarketingProviderOrdering(
  db: OrderingDatabase,
  operation: {
    id: string;
    shopperId: string;
    email: string;
  }
): Promise<ProviderOrderingResult> {
  const email = operation.email.trim().toLowerCase();

  if (!email) {
    throw new Error("Marketing sync email is required.");
  }

  const unresolvedStatuses = [
    "PROCESSING",
    "SUBMITTED",
    "UNKNOWN",
  ] as const;

  const sameShopper = await db.shopperMarketingConsentSync.count({
    where: {
      id: { not: operation.id },
      shopperId: operation.shopperId,
      status: { in: [...unresolvedStatuses] },
    },
  });

  if (sameShopper > 0) {
    return {
      status: "BLOCKED",
      reason: "SHOPPER_OPERATION_UNRESOLVED",
    };
  }

  const sameEmail = await db.shopperMarketingConsentSync.count({
    where: {
      id: { not: operation.id },
      email: {
        equals: email,
        mode: "insensitive",
      },
      status: { in: [...unresolvedStatuses] },
    },
  });

  if (sameEmail > 0) {
    return {
      status: "BLOCKED",
      reason: "EMAIL_OPERATION_UNRESOLVED",
    };
  }

  return { status: "CLEAR" };
}
