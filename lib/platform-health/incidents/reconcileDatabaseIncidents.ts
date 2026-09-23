import {
  PlatformIncidentSeverity,
  PlatformIncidentStatus,
  PlatformIncidentType,
  type PlatformIncident,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  lockDatabaseIncidentConvergence,
} from "@/lib/platform-health/incidents/databaseIncidentLock";

const MAX_OCCURRENCE_SAMPLES = 25;

type TransactionClient =
  Prisma.TransactionClient;

const TYPE_RANK: Partial<
  Record<PlatformIncidentType, number>
> = {
  HEALTH_CHECK_FAILURE: 1,
  DATABASE_ERROR: 2,
  DATABASE_CONNECTION_EXHAUSTED: 3,
};

const SEVERITY_RANK: Record<
  PlatformIncidentSeverity,
  number
> = {
  INFO: 0,
  WARNING: 1,
  HIGH: 2,
  CRITICAL: 3,
};

function getTypeRank(
  type: PlatformIncidentType
) {
  return TYPE_RANK[type] ?? 0;
}

function getSeverityRank(
  severity: PlatformIncidentSeverity
) {
  return SEVERITY_RANK[severity];
}

function earliestDate(
  a: Date,
  b: Date
) {
  return a <= b ? a : b;
}

function latestDate(
  a: Date,
  b: Date
) {
  return a >= b ? a : b;
}

function chooseCanonicalIncident(
  incidents: PlatformIncident[]
) {
  return [...incidents].sort(
    (a, b) => {
      const typeDifference =
        getTypeRank(b.type) -
        getTypeRank(a.type);

      if (typeDifference !== 0) {
        return typeDifference;
      }

      const severityDifference =
        getSeverityRank(b.severity) -
        getSeverityRank(a.severity);

      if (severityDifference !== 0) {
        return severityDifference;
      }

      /*
       * If evidence strength is identical,
       * preserve the incident that opened first.
       *
       * ID is the final deterministic tie-breaker.
       */
      const openedDifference =
        a.openedAt.getTime() -
        b.openedAt.getTime();

      if (openedDifference !== 0) {
        return openedDifference;
      }

      return a.id.localeCompare(b.id);
    }
  )[0] ?? null;
}

async function mergeAffectedChecks(
  tx: TransactionClient,
  canonicalId: string,
  duplicateId: string
) {
  const duplicateChecks =
    await tx.platformIncidentCheck.findMany({
      where: {
        incidentId:
          duplicateId,
      },
    });

  for (
    const duplicateCheck
    of duplicateChecks
  ) {
    /*
     * checkId is nullable.
     *
     * Prisma's compound unique selector is not
     * usable with null here, and PostgreSQL also
     * permits multiple NULL values in a unique
     * constraint.
     *
     * Preserve nullable historical rows rather
     * than pretending they refer to a live check.
     */
    if (!duplicateCheck.checkId) {
      await tx.platformIncidentCheck.update({
        where: {
          id:
            duplicateCheck.id,
        },

        data: {
          incidentId:
            canonicalId,
        },
      });

      continue;
    }

    const existing =
      await tx.platformIncidentCheck.findFirst({
        where: {
          incidentId:
            canonicalId,

          checkId:
            duplicateCheck.checkId,
        },
      });

    if (!existing) {
      await tx.platformIncidentCheck.update({
        where: {
          id:
            duplicateCheck.id,
        },

        data: {
          incidentId:
            canonicalId,
        },
      });

      continue;
    }

    await tx.platformIncidentCheck.update({
      where: {
        id:
          existing.id,
      },

      data: {
        firstAffectedAt:
          earliestDate(
            existing.firstAffectedAt,
            duplicateCheck.firstAffectedAt
          ),

        lastAffectedAt:
          latestDate(
            existing.lastAffectedAt,
            duplicateCheck.lastAffectedAt
          ),

        failureCount: {
          increment:
            duplicateCheck.failureCount,
        },
      },
    });

    await tx.platformIncidentCheck.delete({
      where: {
        id:
          duplicateCheck.id,
      },
    });
  }
}

async function mergeRoutes(
  tx: TransactionClient,
  canonicalId: string,
  duplicateId: string
) {
  const duplicateRoutes =
    await tx.platformIncidentRoute.findMany({
      where: {
        incidentId:
          duplicateId,
      },
    });

  for (
    const duplicateRoute
    of duplicateRoutes
  ) {
    const existing =
      await tx.platformIncidentRoute.findUnique({
        where: {
          incidentId_routeKey: {
            incidentId:
              canonicalId,

            routeKey:
              duplicateRoute.routeKey,
          },
        },
      });

    if (!existing) {
      await tx.platformIncidentRoute.update({
        where: {
          id:
            duplicateRoute.id,
        },

        data: {
          incidentId:
            canonicalId,
        },
      });

      continue;
    }

    await tx.platformIncidentRoute.update({
      where: {
        id:
          existing.id,
      },

      data: {
        occurrenceCount: {
          increment:
            duplicateRoute.occurrenceCount,
        },

        firstSeenAt:
          earliestDate(
            existing.firstSeenAt,
            duplicateRoute.firstSeenAt
          ),

        lastSeenAt:
          latestDate(
            existing.lastSeenAt,
            duplicateRoute.lastSeenAt
          ),

        method:
          existing.method ??
          duplicateRoute.method,

        path:
          existing.path ??
          duplicateRoute.path,
      },
    });

    await tx.platformIncidentRoute.delete({
      where: {
        id:
          duplicateRoute.id,
      },
    });
  }
}

async function mergeOccurrenceSamples(
  tx: TransactionClient,
  canonicalId: string,
  duplicateId: string
) {
  const existingSampleCount =
    await tx.platformIncidentOccurrence.count({
      where: {
        incidentId:
          canonicalId,
      },
    });

  const remainingCapacity =
    Math.max(
      0,
      MAX_OCCURRENCE_SAMPLES -
        existingSampleCount
    );

  if (remainingCapacity > 0) {
    const samplesToMove =
      await tx.platformIncidentOccurrence.findMany({
        where: {
          incidentId:
            duplicateId,
        },

        orderBy: {
          occurredAt:
            "asc",
        },

        take:
          remainingCapacity,
      });

    if (samplesToMove.length > 0) {
      await tx.platformIncidentOccurrence.updateMany({
        where: {
          id: {
            in:
              samplesToMove.map(
                (sample) =>
                  sample.id
              ),
          },
        },

        data: {
          incidentId:
            canonicalId,
        },
      });
    }
  }

  /*
   * occurrenceCount is authoritative.
   *
   * Samples are deliberately bounded diagnostic
   * evidence. Once the canonical incident reaches
   * its sample allowance, surplus duplicate
   * samples are discarded during consolidation.
   */
  await tx.platformIncidentOccurrence.deleteMany({
    where: {
      incidentId:
        duplicateId,
    },
  });
}

async function mergeOneDuplicate(
  tx: TransactionClient,
  canonical: PlatformIncident,
  duplicate: PlatformIncident,
  mergedAt: Date
) {
  await mergeAffectedChecks(
    tx,
    canonical.id,
    duplicate.id
  );

  await mergeRoutes(
    tx,
    canonical.id,
    duplicate.id
  );

  await mergeOccurrenceSamples(
    tx,
    canonical.id,
    duplicate.id
  );

  await tx.platformIncident.update({
    where: {
      id:
        canonical.id,
    },

    data: {
      occurrenceCount: {
        increment:
          duplicate.occurrenceCount,
      },

      firstSeenAt:
        earliestDate(
          canonical.firstSeenAt,
          duplicate.firstSeenAt
        ),

      lastSeenAt:
        latestDate(
          canonical.lastSeenAt,
          duplicate.lastSeenAt
        ),
    },
  });

  /*
   * A duplicate did not recover.
   *
   * Resolve it as a consolidation record and
   * retain permanent lineage to the canonical
   * incident. No RECOVERED notification is
   * created here.
   */
  await tx.platformIncident.update({
    where: {
      id:
        duplicate.id,
    },

    data: {
      status:
        PlatformIncidentStatus.RESOLVED,

      resolvedAt:
        mergedAt,

      mergedIntoId:
        canonical.id,

      resolutionNote:
        "Merged into the canonical database incident.",
    },
  });
}

export type ReconcileDatabaseIncidentsOptions = {
  databaseCheckId?: string | null;
  reconciledAt?: Date;
};

/*
 * Transaction-aware reconciliation core.
 *
 * Call this when incident ingestion is already
 * running inside a Prisma transaction so the
 * incident write and reconciliation can commit
 * together.
 */
export async function reconcileOpenDatabaseIncidentsInTransaction(
  tx: TransactionClient,
  options: ReconcileDatabaseIncidentsOptions = {}
) {
  const reconciledAt =
    options.reconciledAt ??
    new Date();

  const openStatuses = [
    PlatformIncidentStatus.OPEN,
    PlatformIncidentStatus.ACKNOWLEDGED,
  ];

  const candidates =
    await tx.platformIncident.findMany({
      where: {
        status: {
          in:
            openStatuses,
        },

        OR: [
          {
            type:
              PlatformIncidentType
                .DATABASE_CONNECTION_EXHAUSTED,
          },

          {
            type:
              PlatformIncidentType
                .DATABASE_ERROR,
          },

          ...(options.databaseCheckId
            ? [
                {
                  type:
                    PlatformIncidentType
                      .HEALTH_CHECK_FAILURE,

                  affectedChecks: {
                    some: {
                      checkId:
                        options.databaseCheckId,
                    },
                  },
                },
              ]
            : []),
        ],
      },

      orderBy: [
        {
          openedAt:
            "asc",
        },
        {
          id:
            "asc",
        },
      ],
    });

  if (candidates.length === 0) {
    return {
      action:
        "NONE" as const,

      canonicalIncidentId:
        null,

      mergedIncidentIds:
        [] as string[],
    };
  }

  const canonical =
    chooseCanonicalIncident(
      candidates
    );

  if (!canonical) {
    return {
      action:
        "NONE" as const,

      canonicalIncidentId:
        null,

      mergedIncidentIds:
        [] as string[],
    };
  }

  const duplicates =
    candidates.filter(
      (incident) =>
        incident.id !==
        canonical.id
    );

  if (duplicates.length === 0) {
    return {
      action:
        "UNCHANGED" as const,

      canonicalIncidentId:
        canonical.id,

      mergedIncidentIds:
        [] as string[],
    };
  }

  const mergedIncidentIds: string[] =
    [];

  /*
   * Keep a local snapshot so firstSeenAt and
   * lastSeenAt remain correct while multiple
   * duplicates are merged in this transaction.
   */
  let canonicalSnapshot =
    canonical;

  for (
    const duplicate
    of duplicates
  ) {
    await mergeOneDuplicate(
      tx,
      canonicalSnapshot,
      duplicate,
      reconciledAt
    );

    mergedIncidentIds.push(
      duplicate.id
    );

    canonicalSnapshot = {
      ...canonicalSnapshot,

      occurrenceCount:
        canonicalSnapshot
          .occurrenceCount +
        duplicate.occurrenceCount,

      firstSeenAt:
        earliestDate(
          canonicalSnapshot
            .firstSeenAt,
          duplicate.firstSeenAt
        ),

      lastSeenAt:
        latestDate(
          canonicalSnapshot
            .lastSeenAt,
          duplicate.lastSeenAt
        ),
    };
  }

  return {
    action:
      "MERGED" as const,

    canonicalIncidentId:
      canonical.id,

    mergedIncidentIds,
  };
}

/*
 * Standalone entry point for reconciliation jobs,
 * maintenance operations and callers that are not
 * already inside a Prisma transaction.
 */
export async function reconcileOpenDatabaseIncidents(
  options: ReconcileDatabaseIncidentsOptions = {}
) {
  return prisma.$transaction(
    async (tx) => {
      await lockDatabaseIncidentConvergence(
        tx
      );

      return reconcileOpenDatabaseIncidentsInTransaction(
        tx,
        options
      );
    }
  );
}