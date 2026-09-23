import {
  PlatformHealthStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

type EvaluatePlatformHealthStalenessOptions = {
  now?: Date;
};

export async function evaluatePlatformHealthStaleness(
  options: EvaluatePlatformHealthStalenessOptions = {}
) {
  const now = options.now ?? new Date();

  const checks =
    await prisma.platformHealthCheck.findMany({
      where: {
        isActive: true,
      },

      select: {
        id: true,
        checkKey: true,
        status: true,
        lastCheckedAt: true,
        staleAfterSeconds: true,
      },
    });

  const staleChecks: string[] = [];

  for (const check of checks) {
    /*
     * A check that has never completed a probe
     * has no fresh evidence.
     *
     * Preserve DOWN if it somehow already
     * represents a confirmed failure state.
     * Staleness must never erase a confirmed
     * outage.
     */
    if (!check.lastCheckedAt) {
      if (
        check.status !==
          PlatformHealthStatus.UNKNOWN &&
        check.status !==
          PlatformHealthStatus.DOWN
      ) {
        await prisma.platformHealthCheck.update({
          where: {
            id: check.id,
          },

          data: {
            status:
              PlatformHealthStatus.UNKNOWN,
            consecutiveFailures: 0,
            consecutiveSuccesses: 0,
          },
        });
      }

      staleChecks.push(check.checkKey);
      continue;
    }

    const staleAt =
      check.lastCheckedAt.getTime() +
      check.staleAfterSeconds * 1000;

    if (now.getTime() <= staleAt) {
      continue;
    }

    /*
     * Staleness means we no longer have fresh
     * evidence about the target.
     *
     * It is not a failed health probe and must
     * not create a DOWN measurement, increment
     * failure counters, or open an outage.
     *
     * A confirmed DOWN state is deliberately
     * preserved. The monitoring-health layer
     * independently reports that observations
     * are stale.
     *
     * This prevents:
     *
     * DOWN -> UNKNOWN -> HEALTHY
     *
     * from bypassing the configured recovery
     * threshold when monitoring resumes.
     */
    if (
      check.status ===
        PlatformHealthStatus.DOWN
    ) {
      staleChecks.push(check.checkKey);
      continue;
    }

    if (
      check.status !==
      PlatformHealthStatus.UNKNOWN
    ) {
      await prisma.platformHealthCheck.update({
        where: {
          id: check.id,
        },

        data: {
          status:
            PlatformHealthStatus.UNKNOWN,

          /*
           * For non-DOWN states, consecutive
           * observations are no longer
           * continuous once monitoring becomes
           * stale.
           */
          consecutiveFailures: 0,
          consecutiveSuccesses: 0,
        },
      });
    }

    staleChecks.push(check.checkKey);
  }

  return {
    evaluatedAt: now,
    checksEvaluated: checks.length,
    staleCount: staleChecks.length,
    staleChecks,
  };
}