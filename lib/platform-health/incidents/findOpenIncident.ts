import {
  PlatformIncidentStatus,
  PlatformIncidentType,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

type FindOpenIncidentOptions = {
  type: PlatformIncidentType;
  checkId?: string | null;
};

type TransactionClient =
  Prisma.TransactionClient;

export async function findOpenPlatformIncident(
  options: FindOpenIncidentOptions,
  tx: TransactionClient = prisma
) {
  /*
   * For active health checks, the affected
   * check is part of the incident identity.
   *
   * This prevents an outage of Sale from
   * accidentally being merged into an
   * unrelated outage of New In.
   */
  if (options.checkId) {
    return tx.platformIncident.findFirst({
      where: {
        type:
          options.type,

        status: {
          in: [
            PlatformIncidentStatus.OPEN,
            PlatformIncidentStatus
              .ACKNOWLEDGED,
          ],
        },

        affectedChecks: {
          some: {
            checkId:
              options.checkId,
          },
        },
      },

      orderBy: {
        openedAt:
          "desc",
      },
    });
  }

  return tx.platformIncident.findFirst({
    where: {
      type:
        options.type,

      status: {
        in: [
          PlatformIncidentStatus.OPEN,
          PlatformIncidentStatus
            .ACKNOWLEDGED,
        ],
      },
    },

    orderBy: {
      openedAt:
        "desc",
    },
  });
}