import "server-only";

import type { PrismaClient } from "@prisma/client";

type ReleaseDatabase = Pick<
  PrismaClient,
  "shopperMarketingConsentSync"
>;

export async function releaseShopperMarketingSyncClaim(
  db: ReleaseDatabase,
  operationId: string,
  claimToken: string
): Promise<boolean> {
  if (!operationId || !claimToken) {
    throw new Error(
      "Operation ID and claim token are required"
    );
  }

  const result =
    await db.shopperMarketingConsentSync.updateMany({
      where: {
        id: operationId,
        status: "PROCESSING",
        claimToken,
      },
      data: {
        status: "PENDING",
        claimToken: null,
        claimedAt: null,
      },
    });

  return result.count === 1;
}
