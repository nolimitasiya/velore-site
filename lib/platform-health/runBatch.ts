import {
  PlatformHealthRunStatus,
  PlatformHealthStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  claimPlatformHealthChecks,
} from "@/lib/platform-health/claimChecks";
import {
  evaluatePlatformHealthStaleness,
} from "@/lib/platform-health/evaluateStaleness";
import {
  handlePlatformHealthCheckTransition,
} from "@/lib/platform-health/incidents/handleCheckTransition";
import {
  recordPlatformHealthMeasurement,
} from "@/lib/platform-health/recordMeasurement";
import {
  runPlatformHealthProbe,
} from "@/lib/platform-health/runProbe";
import {
  syncPlatformHealthChecks,
} from "@/lib/platform-health/syncChecks";

type RunPlatformHealthBatchOptions = {
  batchSize?: number;
  concurrency?: number;
  syncChecks?: boolean;
  baseUrl?: string;
  healthCheckSecret?: string;
};

const DEFAULT_BATCH_SIZE = 20;
const MAX_BATCH_SIZE = 50;

const DEFAULT_CONCURRENCY = 4;
const MAX_CONCURRENCY = 8;

function normalizeInteger(
  value: number | undefined,
  fallback: number,
  maximum: number
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(1, Math.floor(value))
  );
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  work: (item: T) => Promise<void>
) {
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;

      if (index >= items.length) {
        return;
      }

      await work(items[index]);
    }
  }

  const workerCount = Math.min(
    concurrency,
    items.length
  );

  await Promise.all(
    Array.from(
      { length: workerCount },
      () => worker()
    )
  );
}

export async function runPlatformHealthBatch(
  options: RunPlatformHealthBatchOptions = {}
) {
  const startedAt = new Date();
  const startedMs = performance.now();

  /*
   * Evaluate the freshness of existing health
   * evidence before collecting new evidence.
   *
   * Staleness is not a failed probe. It means
   * we no longer have sufficiently recent
   * evidence to describe the target as healthy
   * or down with confidence.
   */
  const staleness =
    await evaluatePlatformHealthStaleness({
      now: startedAt,
    });

  const batchSize = normalizeInteger(
    options.batchSize,
    DEFAULT_BATCH_SIZE,
    MAX_BATCH_SIZE
  );

  const concurrency = normalizeInteger(
    options.concurrency,
    DEFAULT_CONCURRENCY,
    MAX_CONCURRENCY
  );

  const sync =
    options.syncChecks === false
      ? null
      : await syncPlatformHealthChecks();

  /*
   * Claim against the time after registry sync.
   *
   * Newly-created checks receive nextCheckAt
   * during sync, so using the run's earlier
   * startedAt timestamp would incorrectly make
   * them appear not due on their first run.
   */
  const claimAt = new Date();

  const claimed =
    await claimPlatformHealthChecks({
      limit: batchSize,
      now: claimAt,
    });

  /*
   * Another invocation currently owns the
   * short claim lock. No run is created
   * because this invocation selected no work.
   */
  if (!claimed.lockAcquired) {
    return {
      startedAt,
      finishedAt: new Date(),
      durationMs: Math.round(
        performance.now() - startedMs
      ),

      lockAcquired: false as const,

      checksSelected: 0,
      checksSucceeded: 0,
      checksFailed: 0,

      runId: null,
      runStatus: null,

      sync,
      staleness,
      results: [],
    };
  }

  const run =
    await prisma.platformHealthRun.create({
      data: {
        status:
          PlatformHealthRunStatus.RUNNING,

        startedAt,

        checksSelected:
          claimed.checks.length,
      },
    });

  let checksSucceeded = 0;
  let checksFailed = 0;

  const results: Array<{
    checkKey: string;
    probeStatus: string;
    currentStatus: string;
    transitionChanged: boolean;
    httpStatus: number | null;
    responseTimeMs: number | null;
    failureReason: string | null;
  }> = [];

  let runnerError: unknown = null;

  try {
    await runWithConcurrency(
      claimed.checks,
      concurrency,
      async (check) => {
        try {
          const probe =
            await runPlatformHealthProbe(
              check,
              {
                baseUrl:
                  options.baseUrl,
                healthCheckSecret:
                  options.healthCheckSecret,
              }
            );

          const recorded =
            await recordPlatformHealthMeasurement({
              check,
              result: probe,
              runId: run.id,
            });

          /*
           * UNKNOWN means the probe could not
           * provide evidence about the target.
           *
           * It must not open, escalate, recover,
           * or otherwise mutate incidents.
           */
          if (
            probe.status !==
            PlatformHealthStatus.UNKNOWN
          ) {
            await handlePlatformHealthCheckTransition({
              check: recorded.check,
              previousStatus:
                recorded.transition.previousStatus,
              currentStatus:
                recorded.transition.currentStatus,
            });
          }

          /*
           * A successfully executed and persisted
           * probe counts as a successful monitoring
           * operation regardless of whether the
           * target reported HEALTHY, DOWN or UNKNOWN.
           */
          checksSucceeded += 1;

          results.push({
            checkKey: check.checkKey,
            probeStatus: probe.status,
            currentStatus:
              recorded.check.status,
            transitionChanged:
              recorded.transition.changed,
            httpStatus:
              probe.httpStatus,
            responseTimeMs:
              probe.responseTimeMs,
            failureReason:
              probe.failureReason,
          });
        } catch (error) {
          /*
           * This is different from a valid target
           * result.
           *
           * The monitoring system itself failed to
           * execute or persist this check, so this
           * monitoring run becomes PARTIAL.
           */
          checksFailed += 1;

          results.push({
            checkKey: check.checkKey,
            probeStatus:
              PlatformHealthStatus.UNKNOWN,
            currentStatus:
              check.status,
            transitionChanged: false,
            httpStatus: null,
            responseTimeMs: null,
            failureReason:
              error instanceof Error
                ? error.name
                : "MONITORING_ERROR",
          });
        }
      }
    );
  } catch (error) {
    runnerError = error;
  }

  const finishedAt = new Date();

  const durationMs = Math.round(
    performance.now() - startedMs
  );

  let runStatus:
    PlatformHealthRunStatus;

  if (runnerError) {
    runStatus =
      PlatformHealthRunStatus.FAILED;
  } else if (
    checksFailed > 0 ||
    checksSucceeded <
      claimed.checks.length
  ) {
    runStatus =
      PlatformHealthRunStatus.PARTIAL;
  } else {
    /*
     * Target health and monitoring-run health
     * are deliberately separate concepts.
     *
     * A DOWN target does not mean the monitoring
     * run failed. Likewise, a persisted UNKNOWN
     * result means the probe completed but could
     * not establish target health.
     */
    runStatus =
      PlatformHealthRunStatus.COMPLETED;
  }

  await prisma.platformHealthRun.update({
    where: {
      id: run.id,
    },

    data: {
      status: runStatus,
      finishedAt,
      durationMs,
      checksSucceeded,
      checksFailed,

      errorMessage: runnerError
        ? runnerError instanceof Error
          ? runnerError.name
          : "PlatformHealthRunnerError"
        : null,
    },
  });

  return {
    startedAt,
    finishedAt,
    durationMs,

    lockAcquired: true as const,

    checksSelected:
      claimed.checks.length,
    checksSucceeded,
    checksFailed,

    runId: run.id,
    runStatus,

    sync,
    staleness,
    results,
  };
}