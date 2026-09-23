import {
  PlatformIncidentSeverity,
  PlatformIncidentSource,
  PlatformIncidentStatus,
  PlatformIncidentType,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  createPlatformIncidentNotification,
} from "@/lib/platform-health/incidents/createNotification";

import {
  lockDatabaseIncidentConvergence,
} from "@/lib/platform-health/incidents/databaseIncidentLock";

import {
  findOpenDatabaseIncident,
} from "@/lib/platform-health/incidents/findOpenDatabaseIncident";

import {
  reconcileOpenDatabaseIncidentsInTransaction,
} from "@/lib/platform-health/incidents/reconcileDatabaseIncidents";

import type {
  RuntimeIncidentBatch,
} from "@/lib/platform-health/runtime/runtimeAccumulator";



const MAX_OCCURRENCE_SAMPLES = 25;

const SEVERITY_RANK: Record<
  PlatformIncidentSeverity,
  number
> = {
  INFO: 0,
  WARNING: 1,
  HIGH: 2,
  CRITICAL: 3,
};

function isDatabaseIncidentType(
  type: PlatformIncidentType
) {
  return (
    type ===
      PlatformIncidentType
        .DATABASE_CONNECTION_EXHAUSTED ||
    type ===
      PlatformIncidentType.DATABASE_ERROR
  );
}

function getRuntimeSeverity(
  type: PlatformIncidentType
): PlatformIncidentSeverity {
  switch (type) {
    case PlatformIncidentType
      .DATABASE_CONNECTION_EXHAUSTED:
      return PlatformIncidentSeverity.CRITICAL;

    case PlatformIncidentType
      .DATABASE_ERROR:
      return PlatformIncidentSeverity.HIGH;

    case PlatformIncidentType
      .SERVER_ERROR:
    default:
      return PlatformIncidentSeverity.WARNING;
  }
}

function getRuntimeIncidentTitle(
  type: PlatformIncidentType
) {
  switch (type) {
    case PlatformIncidentType
      .DATABASE_CONNECTION_EXHAUSTED:
      return "Database connection capacity exhausted";

    case PlatformIncidentType
      .DATABASE_ERROR:
      return "Database error detected";

    case PlatformIncidentType
      .SERVER_ERROR:
    default:
      return "Server error detected";
  }
}

function getRuntimeIncidentDescription(
  batch: RuntimeIncidentBatch
) {
  if (
    batch.type ===
    PlatformIncidentType
      .DATABASE_CONNECTION_EXHAUSTED
  ) {
    return (
      "Veilora observed runtime failures consistent " +
      "with database connection exhaustion."
    );
  }

  if (
    batch.type ===
      PlatformIncidentType.DATABASE_ERROR
  ) {
    return (
      "Veilora observed runtime failures associated " +
      "with the database layer."
    );
  }

  const route =
    batch.routes[0]?.path;

  return route
    ? `Veilora observed a server error affecting ${route}.`
    : "Veilora observed a server-side runtime error.";
}

function shouldPromoteDatabaseType(
  currentType: PlatformIncidentType,
  incomingType: PlatformIncidentType
) {
  if (
    incomingType ===
    PlatformIncidentType
      .DATABASE_CONNECTION_EXHAUSTED
  ) {
    return (
      currentType !==
      PlatformIncidentType
        .DATABASE_CONNECTION_EXHAUSTED
    );
  }

  if (
    incomingType ===
      PlatformIncidentType.DATABASE_ERROR &&
    currentType ===
      PlatformIncidentType.HEALTH_CHECK_FAILURE
  ) {
    return true;
  }

  return false;
}

async function getDatabaseCheckId(
  tx: Prisma.TransactionClient
) {
  const databaseCheck =
    await tx.platformHealthCheck.findUnique({
      where: {
        checkKey:
          "database",
      },

      select: {
        id: true,
      },
    });

  return databaseCheck?.id ?? null;
}

async function findMatchingRuntimeIncident(
  tx: Prisma.TransactionClient,
  batch: RuntimeIncidentBatch,
  databaseCheckId: string | null
) {
  /*
   * Database runtime evidence converges with
   * the canonical open database incident,
   * regardless of which detector saw the
   * outage first.
   */
  if (
    isDatabaseIncidentType(
      batch.type
    )
  ) {
    return findOpenDatabaseIncident(
      {
        databaseCheckId,
      },
      tx
    );
  }

  /*
   * Generic server errors remain route-scoped.
   */
  const primaryRouteKey =
    batch.routes[0]?.routeKey;

  if (!primaryRouteKey) {
    return null;
  }

  return tx.platformIncident.findFirst({
    where: {
      type:
        batch.type,

      source:
        PlatformIncidentSource
          .RUNTIME_ERROR,

      status: {
        in: [
          PlatformIncidentStatus.OPEN,
          PlatformIncidentStatus
            .ACKNOWLEDGED,
        ],
      },

      routes: {
        some: {
          routeKey:
            primaryRouteKey,
        },
      },
    },

    orderBy: {
      lastSeenAt:
        "desc",
    },
  });
}

async function upsertRuntimeRoutes(
  tx: Prisma.TransactionClient,
  incidentId: string,
  batch: RuntimeIncidentBatch
) {
  for (const route of batch.routes) {
    const existing =
      await tx.platformIncidentRoute.findUnique({
        where: {
          incidentId_routeKey: {
            incidentId,
            routeKey:
              route.routeKey,
          },
        },
      });

    if (!existing) {
      await tx.platformIncidentRoute.create({
        data: {
          incidentId,

          routeKey:
            route.routeKey,

          method:
            route.method,

          path:
            route.path,

          occurrenceCount:
            route.occurrenceCount,

          firstSeenAt:
            route.firstSeenAt,

          lastSeenAt:
            route.lastSeenAt,
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
            route.occurrenceCount,
        },

        firstSeenAt:
          route.firstSeenAt <
          existing.firstSeenAt
            ? route.firstSeenAt
            : existing.firstSeenAt,

        lastSeenAt:
          route.lastSeenAt >
          existing.lastSeenAt
            ? route.lastSeenAt
            : existing.lastSeenAt,

        method:
          route.method,

        path:
          route.path,
      },
    });
  }
}

async function maybeCreateRuntimeSample(
  tx: Prisma.TransactionClient,
  incidentId: string,
  batch: RuntimeIncidentBatch
) {
  const sampleCount =
    await tx.platformIncidentOccurrence.count({
      where: {
        incidentId,
      },
    });

  if (
    sampleCount >=
    MAX_OCCURRENCE_SAMPLES
  ) {
    return;
  }

  const sample =
    batch.sample;

  await tx.platformIncidentOccurrence.create({
    data: {
      incidentId,

      source:
        PlatformIncidentSource
          .RUNTIME_ERROR,

      errorName:
        sample.errorName ??
        null,

      digest:
        sample.digest ??
        null,

      method:
        sample.method ??
        null,

      path:
        sample.path ??
        null,

      routerKind:
        sample.routerKind ??
        null,

      routePath:
        sample.routePath ??
        null,

      routeType:
        sample.routeType ??
        null,

      occurredAt:
        sample.occurredAt ??
        batch.firstSeenAt,
    },
  });
}

async function reconcileDatabaseEvidence(
  tx: Prisma.TransactionClient,
  batch: RuntimeIncidentBatch,
  databaseCheckId: string | null
) {
  if (
    !isDatabaseIncidentType(
      batch.type
    )
  ) {
    return null;
  }

  return reconcileOpenDatabaseIncidentsInTransaction(
    tx,
    {
      databaseCheckId,
      reconciledAt:
        batch.lastSeenAt,
    }
  );
}

export async function persistRuntimeIncidentBatch(
  batch: RuntimeIncidentBatch
) {
  return prisma.$transaction(
  async (tx) => {
    const isDatabaseEvidence =
      isDatabaseIncidentType(
        batch.type
      );

    /*
     * Database incidents have a single
     * convergence lane.
     *
     * The transaction-scoped advisory lock
     * prevents runtime and active-check
     * transactions from simultaneously opening
     * separate database incidents.
     */
    if (isDatabaseEvidence) {
      await lockDatabaseIncidentConvergence(
        tx
      );
    }

    const databaseCheckId =
      isDatabaseEvidence
        ? await getDatabaseCheckId(
            tx
          )
        : null;

    /*
     * Repair any historical/pre-existing
     * duplicates before deciding which incident
     * this new runtime evidence belongs to.
     */
    if (isDatabaseEvidence) {
      await reconcileOpenDatabaseIncidentsInTransaction(
        tx,
        {
          databaseCheckId,
          reconciledAt:
            batch.lastSeenAt,
        }
      );
    }

    const existing =
      await findMatchingRuntimeIncident(
        tx,
        batch,
        databaseCheckId
      );

      if (!existing) {
        const incident =
          await tx.platformIncident.create({
            data: {
              type:
                batch.type,

              source:
                PlatformIncidentSource
                  .RUNTIME_ERROR,

              status:
                PlatformIncidentStatus.OPEN,

              severity:
                getRuntimeSeverity(
                  batch.type
                ),

              title:
                getRuntimeIncidentTitle(
                  batch.type
                ),

              description:
                getRuntimeIncidentDescription(
                  batch
                ),

              openedAt:
                batch.firstSeenAt,

              firstSeenAt:
                batch.firstSeenAt,

              lastSeenAt:
                batch.lastSeenAt,

              occurrenceCount:
                batch.occurrenceCount,
            },
          });

        await upsertRuntimeRoutes(
          tx,
          incident.id,
          batch
        );

        await maybeCreateRuntimeSample(
          tx,
          incident.id,
          batch
        );

        await createPlatformIncidentNotification(
          {
            incidentId:
              incident.id,

            kind:
              "OPENED",
          },
          tx
        );

        const reconciliation =
          await reconcileDatabaseEvidence(
            tx,
            batch,
            databaseCheckId
          );

        return {
          action:
            "OPENED" as const,

          incidentId:
            reconciliation
              ?.canonicalIncidentId ??
            incident.id,

          reconciliation,
        };
      }

      const incomingSeverity =
        getRuntimeSeverity(
          batch.type
        );

      const promoteType =
        shouldPromoteDatabaseType(
          existing.type,
          batch.type
        );

      const severityIncreased =
        SEVERITY_RANK[
          incomingSeverity
        ] >
        SEVERITY_RANK[
          existing.severity
        ];

      /*
       * Preserve the incident's original source.
       *
       * source answers:
       * "What first opened this incident?"
       *
       * Occurrence samples and affected
       * routes/checks show which additional
       * detectors later contributed evidence.
       */
      const incident =
        await tx.platformIncident.update({
          where: {
            id:
              existing.id,
          },

          data: {
            type:
              promoteType
                ? batch.type
                : existing.type,

            severity:
              severityIncreased
                ? incomingSeverity
                : existing.severity,

            title:
              promoteType
                ? getRuntimeIncidentTitle(
                    batch.type
                  )
                : existing.title,

            description:
              promoteType
                ? getRuntimeIncidentDescription(
                    batch
                  )
                : existing.description,

            occurrenceCount: {
              increment:
                batch.occurrenceCount,
            },

        firstSeenAt:
              batch.firstSeenAt <
              existing.firstSeenAt
                ? batch.firstSeenAt
                : existing.firstSeenAt,

            lastSeenAt:
              batch.lastSeenAt >
              existing.lastSeenAt
                ? batch.lastSeenAt
                : existing.lastSeenAt,
          },
        });

      await upsertRuntimeRoutes(
        tx,
        incident.id,
        batch
      );

      await maybeCreateRuntimeSample(
        tx,
        incident.id,
        batch
      );

      /*
       * Only notify about escalation when the
       * actual incident severity increased.
       *
       * HEALTH_CHECK_FAILURE(HIGH)
       * -> DATABASE_ERROR(HIGH)
       *
       * is stronger diagnostic evidence but
       * not a severity escalation.
       *
       * HEALTH_CHECK_FAILURE(HIGH)
       * -> EMAXCONN(CRITICAL)
       *
       * is a genuine escalation.
       */
      if (severityIncreased) {
        await createPlatformIncidentNotification(
          {
            incidentId:
              incident.id,

            kind:
              "ESCALATED",
          },
          tx
        );
      }

      const reconciliation =
        await reconcileDatabaseEvidence(
          tx,
          batch,
          databaseCheckId
        );

      return {
        action:
          severityIncreased
            ? ("ESCALATED" as const)
            : promoteType
              ? ("PROMOTED" as const)
              : ("UPDATED" as const),

        incidentId:
          reconciliation
            ?.canonicalIncidentId ??
          incident.id,

        reconciliation,
      };
    }
  );
}