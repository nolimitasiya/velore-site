import "server-only";

import {
  PlatformHealthAggregatePeriod,
  PlatformHealthStatus,
  PlatformIncidentStatus,
  type PlatformIncidentSeverity,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getPlatformMonitoringHealth } from "@/lib/platform-health/getMonitoringHealth";

const OPEN_INCIDENT_STATUSES: PlatformIncidentStatus[] = [
  PlatformIncidentStatus.OPEN,
  PlatformIncidentStatus.ACKNOWLEDGED,
];

const RECENT_RESOLVED_INCIDENT_LIMIT = 20;
const RECENT_OCCURRENCE_LIMIT = 5;
const INCIDENT_ROUTE_LIMIT = 10;

const HOURLY_HISTORY_HOURS = 72;
const DAILY_HISTORY_DAYS = 90;

function subtractHours(date: Date, hours: number) {
  return new Date(date.getTime() - hours * 60 * 60 * 1000);
}

function subtractDays(date: Date, days: number) {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

function worstStatus(
  statuses: PlatformHealthStatus[]
): PlatformHealthStatus {
  if (statuses.length === 0) {
    return PlatformHealthStatus.UNKNOWN;
  }

  if (statuses.includes(PlatformHealthStatus.DOWN)) {
    return PlatformHealthStatus.DOWN;
  }

  if (statuses.includes(PlatformHealthStatus.DEGRADED)) {
    return PlatformHealthStatus.DEGRADED;
  }

  if (statuses.includes(PlatformHealthStatus.UNKNOWN)) {
    return PlatformHealthStatus.UNKNOWN;
  }

  return PlatformHealthStatus.HEALTHY;
}

function severityRank(
  severity: PlatformIncidentSeverity
): number {
  switch (severity) {
    case "CRITICAL":
      return 4;
    case "HIGH":
      return 3;
    case "WARNING":
      return 2;
    case "INFO":
      return 1;
  }
}

export async function getPlatformHealthDashboard(
  now = new Date()
) {
  const hourlyFrom = subtractHours(
    now,
    HOURLY_HISTORY_HOURS
  );

  const dailyFrom = subtractDays(
    now,
    DAILY_HISTORY_DAYS
  );

  const [
    monitoring,
    checks,
    openIncidents,
    recentResolvedIncidents,
    hourlyAggregates,
    dailyAggregates,
  ] = await Promise.all([
    getPlatformMonitoringHealth({ now }),

    prisma.platformHealthCheck.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        {
          status: "asc",
        },
        {
          name: "asc",
        },
      ],
      select: {
        id: true,
        checkKey: true,
        name: true,
        description: true,
        checkType: true,
        path: true,
        httpMethod: true,

        intervalSeconds: true,
        timeoutMs: true,
        staleAfterSeconds: true,
        failureThreshold: true,
        recoveryThreshold: true,

        status: true,

        consecutiveFailures: true,
        consecutiveSuccesses: true,

        firstCheckedAt: true,
        lastCheckedAt: true,
        lastHealthyAt: true,
        lastFailedAt: true,
        nextCheckAt: true,

        lastHttpStatus: true,
        lastResponseTimeMs: true,
        lastFailureReason: true,
      },
    }),

    prisma.platformIncident.findMany({
      where: {
        status: {
          in: OPEN_INCIDENT_STATUSES,
        },
        mergedIntoId: null,
      },
      orderBy: [
        {
          lastSeenAt: "desc",
        },
      ],
      include: {
        affectedChecks: {
          include: {
            check: {
              select: {
                id: true,
                checkKey: true,
                name: true,
                status: true,
              },
            },
          },
          orderBy: {
            lastAffectedAt: "desc",
          },
        },

        routes: {
          orderBy: [
            {
              occurrenceCount: "desc",
            },
            {
              lastSeenAt: "desc",
            },
          ],
          take: INCIDENT_ROUTE_LIMIT,
        },

        occurrences: {
          orderBy: {
            occurredAt: "desc",
          },
          take: RECENT_OCCURRENCE_LIMIT,
        },
      },
    }),

    prisma.platformIncident.findMany({
      where: {
        status: PlatformIncidentStatus.RESOLVED,
        mergedIntoId: null,
      },
      orderBy: {
        resolvedAt: "desc",
      },
      take: RECENT_RESOLVED_INCIDENT_LIMIT,
      include: {
        affectedChecks: {
          include: {
            check: {
              select: {
                id: true,
                checkKey: true,
                name: true,
                status: true,
              },
            },
          },
        },

        routes: {
          orderBy: [
            {
              occurrenceCount: "desc",
            },
            {
              lastSeenAt: "desc",
            },
          ],
          take: INCIDENT_ROUTE_LIMIT,
        },
      },
    }),

    prisma.platformHealthAggregate.findMany({
      where: {
        period: PlatformHealthAggregatePeriod.HOURLY,
        bucketStart: {
          gte: hourlyFrom,
        },
        check: {
          isActive: true,
        },
      },
      orderBy: [
        {
          bucketStart: "asc",
        },
        {
          checkId: "asc",
        },
      ],
      include: {
        check: {
          select: {
            checkKey: true,
            name: true,
            checkType: true,
          },
        },
      },
    }),

    prisma.platformHealthAggregate.findMany({
      where: {
        period: PlatformHealthAggregatePeriod.DAILY,
        bucketStart: {
          gte: dailyFrom,
        },
        check: {
          isActive: true,
        },
      },
      orderBy: [
        {
          bucketStart: "asc",
        },
        {
          checkId: "asc",
        },
      ],
      include: {
        check: {
          select: {
            checkKey: true,
            name: true,
            checkType: true,
          },
        },
      },
    }),
  ]);

  const statusCounts = {
    healthy: checks.filter(
      (check) =>
        check.status === PlatformHealthStatus.HEALTHY
    ).length,

    degraded: checks.filter(
      (check) =>
        check.status === PlatformHealthStatus.DEGRADED
    ).length,

    down: checks.filter(
      (check) =>
        check.status === PlatformHealthStatus.DOWN
    ).length,

    unknown: checks.filter(
      (check) =>
        check.status === PlatformHealthStatus.UNKNOWN
    ).length,
  };

  const checkStatus = worstStatus(
    checks.map((check) => check.status)
  );

  /*
   * The monitoring service is our confidence signal.
   *
   * If monitoring is UNKNOWN/stale, we must not present the
   * platform itself as HEALTHY simply because old check rows
   * happen to say HEALTHY.
   */
  const overallStatus =
  monitoring.status === "UNKNOWN" ||
  monitoring.status === "STALE"
    ? PlatformHealthStatus.UNKNOWN
    : monitoring.status === "DEGRADED"
      ? worstStatus([
          checkStatus,
          PlatformHealthStatus.DEGRADED,
        ])
      : checkStatus;

  const openIncidentCount = openIncidents.length;

  const highestOpenSeverity =
    openIncidents.length === 0
      ? null
      : [...openIncidents]
          .sort(
            (a, b) =>
              severityRank(b.severity) -
              severityRank(a.severity)
          )[0].severity;


          const hourlyPerformance = hourlyAggregates.map(
  (aggregate) => ({
    id: aggregate.id,

    checkId: aggregate.checkId,
    checkKey: aggregate.check.checkKey,
    checkName: aggregate.check.name,
    checkType: aggregate.check.checkType,

    bucketStart: aggregate.bucketStart,
    bucketEnd: aggregate.bucketEnd,

    measurementCount:
      aggregate.measurementCount,

    healthyCount: aggregate.healthyCount,
    degradedCount: aggregate.degradedCount,
    downCount: aggregate.downCount,
    unknownCount: aggregate.unknownCount,

    availabilityPercent:
      aggregate.availabilityPercent,

    responseTimeCount:
      aggregate.responseTimeCount,
    responseTimeAvgMs:
      aggregate.responseTimeAvgMs,
    responseTimeP50Ms:
      aggregate.responseTimeP50Ms,
    responseTimeP95Ms:
      aggregate.responseTimeP95Ms,
    responseTimeMaxMs:
      aggregate.responseTimeMaxMs,
  })
);

const dailyPerformance = dailyAggregates.map(
  (aggregate) => ({
    id: aggregate.id,

    checkId: aggregate.checkId,
    checkKey: aggregate.check.checkKey,
    checkName: aggregate.check.name,
    checkType: aggregate.check.checkType,

    bucketStart: aggregate.bucketStart,
    bucketEnd: aggregate.bucketEnd,

    measurementCount:
      aggregate.measurementCount,

    healthyCount: aggregate.healthyCount,
    degradedCount: aggregate.degradedCount,
    downCount: aggregate.downCount,
    unknownCount: aggregate.unknownCount,

    availabilityPercent:
      aggregate.availabilityPercent,

    responseTimeCount:
      aggregate.responseTimeCount,
    responseTimeAvgMs:
      aggregate.responseTimeAvgMs,

    /*
     * Daily P50/P95 intentionally remain unavailable.
     *
     * Percentiles cannot be composed correctly from
     * hourly percentiles, and raw measurements expire
     * after the retention window.
     */
    responseTimeP50Ms: null,
    responseTimeP95Ms: null,

    responseTimeMaxMs:
      aggregate.responseTimeMaxMs,
  })
);

  return {
    generatedAt: now,

    overview: {
      overallStatus,

      monitoringStatus: monitoring.status,
      monitoringReason: monitoring.reason,
      monitoringLatestRun: monitoring.latestRun,

      activeCheckCount: checks.length,
      checkStatus,

      statusCounts,

      openIncidentCount,
      highestOpenSeverity,
    },

    checks,

    incidents: {
      open: openIncidents,
      recentlyResolved: recentResolvedIncidents,
    },

    performance: {
  hourly: {
    from: hourlyFrom,
    to: now,
    aggregates: hourlyPerformance,
  },

  daily: {
    from: dailyFrom,
    to: now,
    aggregates: dailyPerformance,
  },

  methodology: {
    availability:
      "Availability excludes UNKNOWN measurements from the denominator.",

    hourlyLatency:
      "Hourly latency may include average, P50, P95 and maximum response time where response measurements exist.",

    dailyLatency:
      "Daily latency preserves exact weighted average and maximum response time. Daily P50 and P95 are intentionally unavailable because percentiles cannot be composed from hourly percentiles.",

    unknown:
      "UNKNOWN represents insufficient monitoring evidence and is not counted as downtime.",
  },
},

    capacity: {
      kind: "SYNTHETIC_HTTP_LOAD_TEST" as const,

      testedAt: new Date(
        "2026-09-21T00:00:00.000Z"
      ),

      environment: "Production",

      databaseConnectionLimit: 2,

      verifiedClean: {
        virtualUsers: 125,
        durationSeconds: 60,
        requests: 6834,
        failedRequests: 0,
        httpP95Ms: 1110,
        requestsPerSecond: 102.58,
        journeys: 1139,
        failedJourneys: 0,
        journeyP95Ms: 9260,
      },

      verifiedFailure: {
        virtualUsers: 150,
        durationSeconds: 60,
        requests: 8610,
        failedRequestPercent: 50.3,
        failedJourneyPercent: 91.28,
        failureType:
          "DATABASE_CONNECTION_EXHAUSTED",
      },

      interpretation: {
        cleanBoundary:
          "125 VU completed without request or journey failures in the tested synthetic workload.",

        failureBoundary:
          "150 VU produced database connection exhaustion in the tested synthetic workload.",

        limitation:
          "Virtual users in this test are not equivalent to concurrent shoppers. These figures describe the tested HTTP workload only and must not be presented as shopper capacity.",
      },
    },
  };
}

export type PlatformHealthDashboard =
  Awaited<
    ReturnType<typeof getPlatformHealthDashboard>
  >;