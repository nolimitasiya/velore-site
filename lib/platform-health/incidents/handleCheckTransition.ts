import {
  PlatformHealthStatus,
  PlatformIncidentSource,
  PlatformIncidentStatus,
  PlatformIncidentType,
  type PlatformHealthCheck,
  type PlatformIncident,
  type Prisma,
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
  findOpenPlatformIncident,
} from "@/lib/platform-health/incidents/findOpenIncident";

import {
  reconcileOpenDatabaseIncidentsInTransaction,
} from "@/lib/platform-health/incidents/reconcileDatabaseIncidents";

import {
  recordPlatformIncidentOccurrence,
} from "@/lib/platform-health/incidents/recordOccurrence";

import {
  getPlatformIncidentSeverity,
} from "@/lib/platform-health/incidents/severity";

type HandleCheckTransitionOptions = {
  check: PlatformHealthCheck;
  previousStatus: PlatformHealthStatus;
  currentStatus: PlatformHealthStatus;
  checkedAt?: Date;
};

type TransactionClient =
  Prisma.TransactionClient;

function isDatabaseCheck(
  check: PlatformHealthCheck
) {
  return check.checkKey === "database";
}

async function prepareDatabaseIncidentTransaction(
  tx: TransactionClient,
  check: PlatformHealthCheck,
  checkedAt: Date
) {
  if (!isDatabaseCheck(check)) {
    return;
  }

  await lockDatabaseIncidentConvergence(
    tx
  );

  await reconcileOpenDatabaseIncidentsInTransaction(
    tx,
    {
      databaseCheckId:
        check.id,

      reconciledAt:
        checkedAt,
    }
  );
}

async function attachCheckToIncident(
  tx: TransactionClient,
  options: {
    incident: PlatformIncident;
    check: PlatformHealthCheck;
    checkedAt: Date;
    failureCount: number;
  }
) {
  const {
    incident,
    check,
    checkedAt,
    failureCount,
  } = options;

  const existing =
    await tx.platformIncidentCheck.findUnique({
      where: {
        incidentId_checkId: {
          incidentId:
            incident.id,

          checkId:
            check.id,
        },
      },
    });

  if (!existing) {
    await tx.platformIncidentCheck.create({
      data: {
        incidentId:
          incident.id,

        checkId:
          check.id,

        firstAffectedAt:
          checkedAt,

        lastAffectedAt:
          checkedAt,

        failureCount,
      },
    });

    return;
  }

  await tx.platformIncidentCheck.update({
    where: {
      id:
        existing.id,
    },

    data: {
      firstAffectedAt:
        checkedAt <
        existing.firstAffectedAt
          ? checkedAt
          : existing.firstAffectedAt,

      lastAffectedAt:
        checkedAt >
        existing.lastAffectedAt
          ? checkedAt
          : existing.lastAffectedAt,

      failureCount: {
        increment:
          failureCount,
      },
    },
  });
}

async function reconcileDatabaseCheckIncidents(
  tx: TransactionClient,
  check: PlatformHealthCheck,
  checkedAt: Date
) {
  if (!isDatabaseCheck(check)) {
    return null;
  }

  return reconcileOpenDatabaseIncidentsInTransaction(
    tx,
    {
      databaseCheckId:
        check.id,

      reconciledAt:
        checkedAt,
    }
  );
}

async function findIncidentForCheckInTransaction(
  tx: TransactionClient,
  check: PlatformHealthCheck
) {
  if (isDatabaseCheck(check)) {
    return findOpenDatabaseIncident(
      {
        databaseCheckId:
          check.id,
      },
      tx
    );
  }

  return findOpenPlatformIncident(
    {
      type:
        PlatformIncidentType
          .HEALTH_CHECK_FAILURE,

      checkId:
        check.id,
    },
    tx
  );
}

async function updateExistingCheckIncident(
  options: {
    incident: PlatformIncident;
    check: PlatformHealthCheck;
    checkedAt: Date;
    failureIncrement: number;
  }
) {
  return prisma.$transaction(
    async (tx) => {
      await prepareDatabaseIncidentTransaction(
       tx,
       options.check,
       options.checkedAt
      );

    const canonicalExisting =
      await findIncidentForCheckInTransaction(
        tx,
        options.check
      );

    const incidentToUpdate =
      canonicalExisting ??
      options.incident;

    const incident =
        await tx.platformIncident.update({
          where: {
            id:
             incidentToUpdate.id,
          },

          data: {
            lastSeenAt:
              options.checkedAt >
              incidentToUpdate.lastSeenAt
              ? options.checkedAt
              : incidentToUpdate.lastSeenAt,

            occurrenceCount: {
              increment:
                options.failureIncrement,
            },
          },
        });

      await attachCheckToIncident(
        tx,
        {
          incident:
            incidentToUpdate,

          check:
            options.check,

          checkedAt:
            options.checkedAt,

          failureCount:
            options.failureIncrement,
        }
      );

      await recordPlatformIncidentOccurrence(
        {
          incidentId:
            incidentToUpdate.id,

          source:
            PlatformIncidentSource
              .ACTIVE_HEALTH_CHECK,

          path:
            options.check.path,

          httpStatus:
            options.check.lastHttpStatus,

          occurredAt:
            options.checkedAt,
        },
        tx
      );

      const reconciliation =
        await reconcileDatabaseCheckIncidents(
          tx,
          options.check,
          options.checkedAt
        );

      const canonicalIncidentId =
        reconciliation
          ?.canonicalIncidentId ??
        incident.id;

      if (
        canonicalIncidentId ===
        incident.id
      ) {
        return incident;
      }

      return tx.platformIncident.findUniqueOrThrow({
        where: {
          id:
            canonicalIncidentId,
        },
      });
    }
  );
}

async function resolveIncidentFromCheck(
  options: {
    incident: PlatformIncident;
    check: PlatformHealthCheck;
    checkedAt: Date;
  }
) {
  return prisma.$transaction(
    async (tx) => {
      await prepareDatabaseIncidentTransaction(
        tx,
        options.check,
        options.checkedAt
      );
      /*
       * Reconcile before recovery so that a
       * duplicate health-check incident cannot
       * be marked recovered while a stronger
       * database incident remains open.
       */
      const reconciliation =
        await reconcileDatabaseCheckIncidents(
          tx,
          options.check,
          options.checkedAt
        );

      const canonicalIncidentId =
        reconciliation
          ?.canonicalIncidentId ??
        options.incident.id;

      const canonicalIncident =
        await tx.platformIncident.findUnique({
          where: {
            id:
              canonicalIncidentId,
          },
        });

      if (
        !canonicalIncident ||
        (
          canonicalIncident.status !==
            PlatformIncidentStatus.OPEN &&
          canonicalIncident.status !==
            PlatformIncidentStatus.ACKNOWLEDGED
        )
      ) {
        return canonicalIncident;
      }

      const incident =
        await tx.platformIncident.update({
          where: {
            id:
              canonicalIncident.id,
          },

          data: {
            status:
              PlatformIncidentStatus.RESOLVED,

            resolvedAt:
              options.checkedAt,

            lastSeenAt:
              options.checkedAt,

            resolutionNote:
              "Automatically resolved after the configured recovery threshold was met.",

            affectedChecks: {
              updateMany: {
                where: {
                  checkId:
                    options.check.id,
                },

                data: {
                  lastAffectedAt:
                    options.checkedAt,
                },
              },
            },
          },
        });

      await createPlatformIncidentNotification(
        {
          incidentId:
            incident.id,

          kind:
            "RECOVERED",
        },
        tx
      );

      return incident;
    }
  );
}

async function createCheckIncident(
  options: {
    check: PlatformHealthCheck;
    checkedAt: Date;
    description: string;
  }
) {
  const incidentType =
    PlatformIncidentType
      .HEALTH_CHECK_FAILURE;

  const severity =
    getPlatformIncidentSeverity({
      type:
        incidentType,

      checkKey:
        options.check.checkKey,
    });

  const initialFailureCount =
    Math.max(
      1,
      options.check.consecutiveFailures
    );

  return prisma.$transaction(
    async (tx) => {

    await prepareDatabaseIncidentTransaction(
      tx,
      options.check,
      options.checkedAt
    );
      /*
       * Re-check inside the transaction before
       * creating. Another detector may have
       * opened the database incident since the
       * transition handler's initial lookup.
       */
      const existing =
        await findIncidentForCheckInTransaction(
          tx,
          options.check
        );

      if (existing) {
        const incident =
          await tx.platformIncident.update({
            where: {
              id:
                existing.id,
            },

            data: {
              lastSeenAt:
               options.checkedAt >
               existing.lastSeenAt
               ? options.checkedAt
               : existing.lastSeenAt,

              occurrenceCount: {
                increment:
                  initialFailureCount,
              },
            },
          });

        await attachCheckToIncident(
          tx,
          {
            incident:
              existing,

            check:
              options.check,

            checkedAt:
              options.checkedAt,

            failureCount:
              initialFailureCount,
          }
        );

        await recordPlatformIncidentOccurrence(
          {
            incidentId:
              existing.id,

            source:
              PlatformIncidentSource
                .ACTIVE_HEALTH_CHECK,

            path:
              options.check.path,

            httpStatus:
              options.check.lastHttpStatus,

            occurredAt:
              options.checkedAt,
          },
          tx
        );

        const reconciliation =
          await reconcileDatabaseCheckIncidents(
            tx,
            options.check,
            options.checkedAt
          );

        const canonicalIncidentId =
          reconciliation
            ?.canonicalIncidentId ??
          incident.id;

        if (
          canonicalIncidentId ===
          incident.id
        ) {
          return {
            created:
              false as const,

            incident,
          };
        }

        const canonicalIncident =
          await tx.platformIncident.findUniqueOrThrow({
            where: {
              id:
                canonicalIncidentId,
            },
          });

        return {
          created:
            false as const,

          incident:
            canonicalIncident,
        };
      }

      const incident =
        await tx.platformIncident.create({
          data: {
            type:
              incidentType,

            source:
              PlatformIncidentSource
                .ACTIVE_HEALTH_CHECK,

            status:
              PlatformIncidentStatus.OPEN,

            severity,

            title:
              `${options.check.name} is unavailable`,

            description:
              options.description,

            openedAt:
              options.checkedAt,

            firstSeenAt:
              options.checkedAt,

            lastSeenAt:
              options.checkedAt,

            occurrenceCount:
              initialFailureCount,

            affectedChecks: {
              create: {
                checkId:
                  options.check.id,

                firstAffectedAt:
                  options.checkedAt,

                lastAffectedAt:
                  options.checkedAt,

                failureCount:
                  initialFailureCount,
              },
            },
          },
        });

      await recordPlatformIncidentOccurrence(
        {
          incidentId:
            incident.id,

          source:
            PlatformIncidentSource
              .ACTIVE_HEALTH_CHECK,

          path:
            options.check.path,

          httpStatus:
            options.check.lastHttpStatus,

          occurredAt:
            options.checkedAt,
        },
        tx
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
        await reconcileDatabaseCheckIncidents(
          tx,
          options.check,
          options.checkedAt
        );

      const canonicalIncidentId =
        reconciliation
          ?.canonicalIncidentId ??
        incident.id;

      if (
        canonicalIncidentId ===
        incident.id
      ) {
        return {
          created:
            true as const,

          incident,
        };
      }

      const canonicalIncident =
        await tx.platformIncident.findUniqueOrThrow({
          where: {
            id:
              canonicalIncidentId,
          },
        });

      return {
        created:
          true as const,

        incident:
          canonicalIncident,
      };
    }
  );
}

async function findIncidentForCheck(
  check: PlatformHealthCheck
) {
  if (isDatabaseCheck(check)) {
    return findOpenDatabaseIncident({
      databaseCheckId:
        check.id,
    });
  }

  return findOpenPlatformIncident({
    type:
      PlatformIncidentType
        .HEALTH_CHECK_FAILURE,

    checkId:
      check.id,
  });
}

export async function handlePlatformHealthCheckTransition(
  options: HandleCheckTransitionOptions
) {
  const checkedAt =
    options.checkedAt ?? new Date();

  const becameDown =
    options.previousStatus !==
      PlatformHealthStatus.DOWN &&
    options.currentStatus ===
      PlatformHealthStatus.DOWN;

  const remainsDown =
    options.previousStatus ===
      PlatformHealthStatus.DOWN &&
    options.currentStatus ===
      PlatformHealthStatus.DOWN;

  const recovered =
    options.previousStatus ===
      PlatformHealthStatus.DOWN &&
    options.currentStatus ===
      PlatformHealthStatus.HEALTHY;

  if (
    !becameDown &&
    !remainsDown &&
    !recovered
  ) {
    return {
      action:
        "NONE" as const,

      incident:
        null,
    };
  }

  const existing =
    await findIncidentForCheck(
      options.check
    );

  /*
   * The check has crossed its configured
   * failure threshold.
   */
  if (becameDown) {
    const initialFailureCount =
      Math.max(
        1,
        options.check
          .consecutiveFailures
      );

    /*
     * For the database check this may already
     * be a runtime DATABASE_ERROR or EMAXCONN
     * incident.
     */
    if (existing) {
      const incident =
        await updateExistingCheckIncident({
          incident:
            existing,

          check:
            options.check,

          checkedAt,

          failureIncrement:
            initialFailureCount,
        });

      return {
        action:
          "UPDATED" as const,

        incident,
      };
    }

    const result =
      await createCheckIncident({
        check:
          options.check,

        checkedAt,

        description:
          "Platform Health detected repeated failures for this check.",
      });

    return {
      action:
        result.created
          ? ("OPENED" as const)
          : ("UPDATED" as const),

      incident:
        result.incident,
    };
  }

  /*
   * The check was already DOWN and another
   * failed probe has occurred.
   */
  if (remainsDown && existing) {
    const incident =
      await updateExistingCheckIncident({
        incident:
          existing,

        check:
          options.check,

        checkedAt,

        failureIncrement:
          1,
      });

    return {
      action:
        "UPDATED" as const,

      incident,
    };
  }

  /*
   * Defensive repair.
   *
   * A DOWN check exists without an open
   * incident. Recreate the operational record
   * while preserving the failure count already
   * known by the check.
   */
  if (remainsDown && !existing) {
    const result =
      await createCheckIncident({
        check:
          options.check,

        checkedAt,

        description:
          "Platform Health detected continued failures for a check that is already down.",
      });

    return {
      action:
        result.created
          ? ("OPENED" as const)
          : ("UPDATED" as const),

      incident:
        result.incident,
    };
  }

  /*
   * The check has satisfied its configured
   * recovery threshold.
   *
   * Database reconciliation happens inside the
   * same transaction before resolution, so the
   * recovery applies to the canonical incident.
   */
  if (recovered && existing) {
    const incident =
      await resolveIncidentFromCheck({
        incident:
          existing,

        check:
          options.check,

        checkedAt,
      });

    return {
      action:
        incident
          ? ("RESOLVED" as const)
          : ("NONE" as const),

      incident,
    };
  }

  return {
    action:
      "NONE" as const,

    incident:
      null,
  };
}