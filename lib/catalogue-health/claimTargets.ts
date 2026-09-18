import type { Prisma } from "@prisma/client";

import { withCatalogueHealthClaimLock } from "@/lib/catalogue-health/runLock";

const CLAIM_MINUTES = 5;

type TransactionClient = Prisma.TransactionClient;

export async function claimDueCatalogueHealthTargets(
  batchSize: number
) {
  return withCatalogueHealthClaimLock(
    async (tx: TransactionClient) => {
      const now = new Date();

      const targets =
        await tx.catalogueHealthTarget.findMany({
          where: {
            isActive: true,

            OR: [
              {
                nextCheckAt: {
                  lte: now,
                },
              },
              {
                nextCheckAt: null,
              },
            ],
          },

          orderBy: [
            {
              nextCheckAt: "asc",
            },
            {
              createdAt: "asc",
            },
          ],

          take: batchSize,

          select: {
            id: true,
            targetKey: true,
            targetType: true,
            url: true,
          },
        });

      if (targets.length === 0) {
        return [];
      }

      const claimedUntil = new Date(
        now.getTime() + CLAIM_MINUTES * 60_000
      );

      await tx.catalogueHealthTarget.updateMany({
        where: {
          id: {
            in: targets.map((target) => target.id),
          },
          isActive: true,
        },
        data: {
          nextCheckAt: claimedUntil,
        },
      });

      return targets;
    }
  );
}