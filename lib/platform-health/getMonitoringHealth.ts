import {
  PlatformHealthRunStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type PlatformMonitoringStatus =
  | "HEALTHY"
  | "DEGRADED"
  | "STALE"
  | "UNKNOWN";

type GetPlatformMonitoringHealthOptions = {
  now?: Date;
  staleAfterSeconds?: number;
};

const DEFAULT_MONITORING_STALE_AFTER_SECONDS =
  180;

export async function getPlatformMonitoringHealth(
  options: GetPlatformMonitoringHealthOptions = {}
) {
  const now = options.now ?? new Date();

  const staleAfterSeconds =
    options.staleAfterSeconds ??
    DEFAULT_MONITORING_STALE_AFTER_SECONDS;

  const latestRun =
    await prisma.platformHealthRun.findFirst({
      orderBy: {
        startedAt: "desc",
      },

      select: {
        id: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        durationMs: true,
        checksSelected: true,
        checksSucceeded: true,
        checksFailed: true,
      },
    });

  if (!latestRun) {
    return {
      status:
        "UNKNOWN" as PlatformMonitoringStatus,
      reason: "NO_RUNS",
      staleAfterSeconds,
      latestRun: null,
    };
  }

  const referenceTime =
    latestRun.finishedAt ??
    latestRun.startedAt;

  const ageMs =
    now.getTime() -
    referenceTime.getTime();

  const stale =
    ageMs >
    staleAfterSeconds * 1000;

  if (stale) {
    return {
      status:
        "STALE" as PlatformMonitoringStatus,
      reason: "LATEST_RUN_STALE",
      staleAfterSeconds,
      latestRun,
    };
  }

  if (
    latestRun.status ===
      PlatformHealthRunStatus.FAILED ||
    latestRun.status ===
      PlatformHealthRunStatus.PARTIAL
  ) {
    return {
      status:
        "DEGRADED" as PlatformMonitoringStatus,
      reason:
        latestRun.status ===
        PlatformHealthRunStatus.FAILED
          ? "LATEST_RUN_FAILED"
          : "LATEST_RUN_PARTIAL",
      staleAfterSeconds,
      latestRun,
    };
  }

  if (
    latestRun.status ===
    PlatformHealthRunStatus.RUNNING
  ) {
    return {
      status:
        "DEGRADED" as PlatformMonitoringStatus,
      reason: "LATEST_RUN_INCOMPLETE",
      staleAfterSeconds,
      latestRun,
    };
  }

  return {
    status:
      "HEALTHY" as PlatformMonitoringStatus,
    reason: "LATEST_RUN_COMPLETED",
    staleAfterSeconds,
    latestRun,
  };
}