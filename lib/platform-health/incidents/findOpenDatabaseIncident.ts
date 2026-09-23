import {
  PlatformIncidentStatus,
  PlatformIncidentType,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

type TransactionClient =
  Prisma.TransactionClient;

type FindOpenDatabaseIncidentOptions = {
  databaseCheckId?: string | null;
};

export async function findOpenDatabaseIncident(
  options: FindOpenDatabaseIncidentOptions = {},
  tx: TransactionClient = prisma
) {
  const openStatuses = [
    PlatformIncidentStatus.OPEN,
    PlatformIncidentStatus.ACKNOWLEDGED,
  ];

  /*
   * Prefer the strongest runtime evidence.
   *
   * If EMAXCONN has been observed, that is
   * more specific than a generic database
   * error or an availability check failure.
   */
  const connectionExhausted =
    await tx.platformIncident.findFirst({
      where: {
        type:
          PlatformIncidentType
            .DATABASE_CONNECTION_EXHAUSTED,

        status: {
          in: openStatuses,
        },
      },

      orderBy: {
        lastSeenAt: "desc",
      },
    });

  if (connectionExhausted) {
    return connectionExhausted;
  }

  const databaseError =
    await tx.platformIncident.findFirst({
      where: {
        type:
          PlatformIncidentType
            .DATABASE_ERROR,

        status: {
          in: openStatuses,
        },
      },

      orderBy: {
        lastSeenAt: "desc",
      },
    });

  if (databaseError) {
    return databaseError;
  }

  /*
   * If the active database probe detected the
   * outage first, it may already have opened a
   * HEALTH_CHECK_FAILURE incident.
   *
   * Only consider one attached specifically to
   * the database check. We must not accidentally
   * merge an unrelated storefront check failure.
   */
  if (options.databaseCheckId) {
    const healthCheckIncident =
      await tx.platformIncident.findFirst({
        where: {
          type:
            PlatformIncidentType
              .HEALTH_CHECK_FAILURE,

          status: {
            in: openStatuses,
          },

          affectedChecks: {
            some: {
              checkId:
                options.databaseCheckId,
            },
          },
        },

        orderBy: {
          lastSeenAt: "desc",
        },
      });

    if (healthCheckIncident) {
      return healthCheckIncident;
    }
  }

  return null;
}