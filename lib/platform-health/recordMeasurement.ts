import {
  PlatformHealthStatus,
  type PlatformHealthCheck,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type {
  PlatformHealthProbeResult,
} from "@/lib/platform-health/runProbe";

type RecordMeasurementOptions = {
  check: PlatformHealthCheck;
  result: PlatformHealthProbeResult;
  runId?: string | null;
  checkedAt?: Date;
};

function isSuccessfulStatus(
  status: PlatformHealthStatus
) {
  return (
    status ===
    PlatformHealthStatus.HEALTHY
  );
}

export async function recordPlatformHealthMeasurement(
  options: RecordMeasurementOptions
) {
  const checkedAt =
    options.checkedAt ?? new Date();

  const successful =
  isSuccessfulStatus(
    options.result.status
  );

const failed =
  options.result.status ===
  PlatformHealthStatus.DOWN;

const unknown =
  options.result.status ===
  PlatformHealthStatus.UNKNOWN;

  return prisma.$transaction(
    async (tx) => {
      /*
       * Read the latest persisted counters.
       *
       * Do not rely on the copy originally
       * returned by the claim operation.
       */
      const current =
        await tx.platformHealthCheck.findUnique({
          where: {
            id: options.check.id,
          },
        });

      if (!current) {
        throw new Error(
          "Platform health check no longer exists"
        );
      }

const nextConsecutiveFailures =
  successful
    ? 0
    : failed
      ? current.consecutiveFailures + 1
      : current.consecutiveFailures;

const nextConsecutiveSuccesses =
  failed
    ? 0
    : successful
      ? current.consecutiveSuccesses + 1
      : current.consecutiveSuccesses;

      let nextStatus = current.status;

      /*
       * UNKNOWN should become useful as soon
       * as the first successful observation
       * arrives.
       */
      if (
        successful &&
        current.status ===
          PlatformHealthStatus.UNKNOWN
      ) {
        nextStatus =
          PlatformHealthStatus.HEALTHY;
      }

      /*
       * A healthy/degraded check only becomes
       * DOWN once the configured consecutive
       * failure threshold is reached.
       */
      if (
        failed &&
        nextConsecutiveFailures >=
        current.failureThreshold
      ) {
        nextStatus =
          PlatformHealthStatus.DOWN;
      }

      /*
       * A DOWN check must demonstrate the
       * configured number of consecutive
       * successes before recovering.
       */
      if (
        successful &&
        current.status ===
          PlatformHealthStatus.DOWN &&
        nextConsecutiveSuccesses >=
          current.recoveryThreshold
      ) {
        nextStatus =
          PlatformHealthStatus.HEALTHY;
      }

      const measurement =
        await tx.platformHealthMeasurement.create({
          data: {
            checkId: current.id,
            runId:
              options.runId ?? null,

            status:
              options.result.status,

            httpStatus:
              options.result.httpStatus,

            responseTimeMs:
              options.result.responseTimeMs,

            failureReason:
              options.result.failureReason,

            checkedAt,
          },
        });

      const updatedCheck =
        await tx.platformHealthCheck.update({
          where: {
            id: current.id,
          },

          data: {
            status: nextStatus,

            consecutiveFailures:
              nextConsecutiveFailures,

            consecutiveSuccesses:
              nextConsecutiveSuccesses,

            firstCheckedAt:
              current.firstCheckedAt ??
              checkedAt,

            lastCheckedAt: checkedAt,

            lastHealthyAt:
              successful
                ? checkedAt
                : current.lastHealthyAt,

            lastFailedAt:
             failed
             ? checkedAt
             : current.lastFailedAt,

            lastHttpStatus:
              options.result.httpStatus,

            lastResponseTimeMs:
              options.result.responseTimeMs,

            lastFailureReason:
              successful
              ? null
              : failed
              ? options.result.failureReason
              : current.lastFailureReason,
          },
        });

      return {
        measurement,
        check: updatedCheck,

        transition: {
          previousStatus:
            current.status,
          currentStatus:
            updatedCheck.status,

          changed:
            current.status !==
            updatedCheck.status,

          successful,
          failed,
          unknown,

          consecutiveFailures:
            updatedCheck
              .consecutiveFailures,

          consecutiveSuccesses:
            updatedCheck
              .consecutiveSuccesses,
        },
      };
    }
  );
}