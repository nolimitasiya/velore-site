import {
  PlatformHealthAggregatePeriod,
  PlatformHealthStatus,
} from "@prisma/client";
import type { PlatformHealthHistoryDb } from "@/lib/platform-health/history/historyDb";

import { prisma } from "@/lib/prisma";

const HOUR_MS = 60 * 60 * 1000;

function startOfUtcHour(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours()
    )
  );
}

function percentile(
  sortedValues: number[],
  percentileValue: number
): number | null {
  if (sortedValues.length === 0) {
    return null;
  }

  /*
   * Nearest-rank percentile.
   *
   * For operational latency history this gives
   * us deterministic P50/P95 values without
   * requiring a database-specific percentile
   * implementation.
   */
  const rank = Math.ceil(
    percentileValue *
      sortedValues.length
  );

  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, rank - 1)
  );

  return sortedValues[index];
}

function calculateAvailability(args: {
  healthyCount: number;
  degradedCount: number;
  downCount: number;
}) {
  /*
   * UNKNOWN deliberately does not participate
   * in the denominator.
   *
   * UNKNOWN means insufficient evidence about
   * service health, not downtime.
   */
  const knownCount =
    args.healthyCount +
    args.degradedCount +
    args.downCount;

  if (knownCount === 0) {
    return null;
  }

  const availableCount =
    args.healthyCount +
    args.degradedCount;

  return (
    (availableCount / knownCount) *
    100
  );
}

function calculateResponseStats(
  responseTimes: number[]
) {
  if (responseTimes.length === 0) {
    return {
      responseTimeCount: 0,
      responseTimeTotalMs: 0,
      responseTimeAvgMs: null,
      responseTimeP50Ms: null,
      responseTimeP95Ms: null,
      responseTimeMaxMs: null,
};
  }

  const sorted = [...responseTimes].sort(
    (a, b) => a - b
  );

  

  const responseTimeTotalMs =
  sorted.reduce(
    (total, value) => total + value,
    0
  );

  return {
  responseTimeCount: sorted.length,
  responseTimeTotalMs,
  responseTimeAvgMs: Math.round(
    responseTimeTotalMs / sorted.length
  ),
  responseTimeP50Ms: percentile(
    sorted,
    0.5
  ),
  responseTimeP95Ms: percentile(
    sorted,
    0.95
  ),
  responseTimeMaxMs:
    sorted[sorted.length - 1],
};
}

export async function aggregatePlatformHealthHour(
  bucketStart: Date,
  db: PlatformHealthHistoryDb = prisma,
  checkId?: string
) {
  const normalizedBucketStart =
    startOfUtcHour(bucketStart);

  const bucketEnd = new Date(
    normalizedBucketStart.getTime() +
      HOUR_MS
  );

  const measurements =
    await db.platformHealthMeasurement.findMany({
      where: {
        ...(checkId
          ? { checkId }
          : {}),
        checkedAt: {
          gte: normalizedBucketStart,
          lt: bucketEnd,
        },
      },

      select: {
        checkId: true,
        status: true,
        responseTimeMs: true,
      },

      orderBy: {
        checkedAt: "asc",
      },
    });

  const byCheck = new Map<
    string,
    typeof measurements
  >();

  for (const measurement of measurements) {
    const existing =
      byCheck.get(measurement.checkId) ??
      [];

    existing.push(measurement);

    byCheck.set(
      measurement.checkId,
      existing
    );
  }

  let aggregatesWritten = 0;

  for (const [
    checkId,
    checkMeasurements,
  ] of byCheck) {
    let healthyCount = 0;
    let degradedCount = 0;
    let downCount = 0;
    let unknownCount = 0;

    const responseTimes: number[] = [];

    for (
      const measurement of
      checkMeasurements
    ) {
      switch (measurement.status) {
        case PlatformHealthStatus.HEALTHY:
          healthyCount += 1;
          break;

        case PlatformHealthStatus.DEGRADED:
          degradedCount += 1;
          break;

        case PlatformHealthStatus.DOWN:
          downCount += 1;
          break;

        case PlatformHealthStatus.UNKNOWN:
          unknownCount += 1;
          break;
      }

      if (
        measurement.responseTimeMs !==
        null
      ) {
        responseTimes.push(
          measurement.responseTimeMs
        );
      }
    }

    const availabilityPercent =
      calculateAvailability({
        healthyCount,
        degradedCount,
        downCount,
      });

    const responseStats =
      calculateResponseStats(
        responseTimes
      );

    await db.platformHealthAggregate.upsert({
      where: {
        checkId_period_bucketStart: {
          checkId,
          period:
            PlatformHealthAggregatePeriod.HOURLY,
          bucketStart:
            normalizedBucketStart,
        },
      },

      create: {
        checkId,
        period:
          PlatformHealthAggregatePeriod.HOURLY,

        bucketStart:
          normalizedBucketStart,
        bucketEnd,

        measurementCount:
          checkMeasurements.length,

        healthyCount,
        degradedCount,
        downCount,
        unknownCount,

        availabilityPercent,

        ...responseStats,
      },

      update: {
        bucketEnd,

        measurementCount:
          checkMeasurements.length,

        healthyCount,
        degradedCount,
        downCount,
        unknownCount,

        availabilityPercent,

        ...responseStats,
      },
    });

    aggregatesWritten += 1;
  }

  return {
    period:
      PlatformHealthAggregatePeriod.HOURLY,

    bucketStart:
      normalizedBucketStart,

    bucketEnd,

    measurementsRead:
      measurements.length,

    aggregatesWritten,
  };
}


const DAY_MS = 24 * HOUR_MS;

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    )
  );
}

export async function aggregatePlatformHealthDay(
  bucketStart: Date,
  db: PlatformHealthHistoryDb = prisma,
  checkId?: string
) {
  const normalizedBucketStart =
    startOfUtcDay(bucketStart);

  const bucketEnd = new Date(
    normalizedBucketStart.getTime() +
      DAY_MS
  );

  const hourlyAggregates =
    await db.platformHealthAggregate.findMany({
      where: {
        ...(checkId
          ? { checkId }
          : {}),
          
        period:
          PlatformHealthAggregatePeriod.HOURLY,

        bucketStart: {
          gte: normalizedBucketStart,
          lt: bucketEnd,
        },
      },

      select: {
        checkId: true,

        measurementCount: true,

        healthyCount: true,
        degradedCount: true,
        downCount: true,
        unknownCount: true,

        responseTimeCount: true,
        responseTimeTotalMs: true,
        responseTimeMaxMs: true,
      },

      orderBy: {
        bucketStart: "asc",
      },
    });

  const byCheck = new Map<
    string,
    typeof hourlyAggregates
  >();

  for (const aggregate of hourlyAggregates) {
    const existing =
      byCheck.get(aggregate.checkId) ??
      [];

    existing.push(aggregate);

    byCheck.set(
      aggregate.checkId,
      existing
    );
  }

  let aggregatesWritten = 0;

  for (const [
    checkId,
    checkAggregates,
  ] of byCheck) {
    let measurementCount = 0;

    let healthyCount = 0;
    let degradedCount = 0;
    let downCount = 0;
    let unknownCount = 0;

    let responseTimeCount = 0;
    let responseTimeTotalMs = 0;

    let responseTimeMaxMs: number | null =
      null;
      

    for (
      const aggregate of
      checkAggregates
    ) {
      measurementCount +=
        aggregate.measurementCount;

      healthyCount +=
        aggregate.healthyCount;

      degradedCount +=
        aggregate.degradedCount;

      downCount +=
        aggregate.downCount;

      unknownCount +=
        aggregate.unknownCount;

      /*
       * Only buckets that actually contain
       * response timings contribute to the
       * weighted daily average.
       */
      if (aggregate.responseTimeCount > 0) {
        responseTimeCount +=
          aggregate.responseTimeCount;

        responseTimeTotalMs +=
          aggregate.responseTimeTotalMs;
}

      if (
        aggregate.responseTimeMaxMs !== null &&
        (
          responseTimeMaxMs === null ||
          aggregate.responseTimeMaxMs >
            responseTimeMaxMs
        )
      ) {
        responseTimeMaxMs =
          aggregate.responseTimeMaxMs;
      }
    }

    const availabilityPercent =
      calculateAvailability({
        healthyCount,
        degradedCount,
        downCount,
      });

    const responseTimeAvgMs =
      responseTimeCount > 0
       ? Math.round(
        responseTimeTotalMs /
          responseTimeCount
      )
    : null;

    /*
     * P50/P95 deliberately remain null for
     * DAILY aggregates.
     *
     * Percentiles cannot be reconstructed
     * correctly from hourly percentile values.
     * We prefer no value over fabricated
     * precision.
     */
    await db.platformHealthAggregate.upsert({
      where: {
        checkId_period_bucketStart: {
          checkId,
          period:
            PlatformHealthAggregatePeriod.DAILY,
          bucketStart:
            normalizedBucketStart,
        },
      },

      create: {
        checkId,
        period:
          PlatformHealthAggregatePeriod.DAILY,

        bucketStart:
          normalizedBucketStart,
        bucketEnd,

        measurementCount,

        healthyCount,
        degradedCount,
        downCount,
        unknownCount,

        availabilityPercent,

        responseTimeCount,
        responseTimeAvgMs,
        responseTimeP50Ms: null,
        responseTimeP95Ms: null,
        responseTimeMaxMs,
        responseTimeTotalMs,
      },

      update: {
        bucketEnd,

        measurementCount,

        healthyCount,
        degradedCount,
        downCount,
        unknownCount,

        availabilityPercent,

        responseTimeCount,
        responseTimeAvgMs,
        responseTimeP50Ms: null,
        responseTimeP95Ms: null,
        responseTimeMaxMs,
        responseTimeTotalMs,
      },
    });

    aggregatesWritten += 1;
  }

  return {
    period:
      PlatformHealthAggregatePeriod.DAILY,

    bucketStart:
      normalizedBucketStart,

    bucketEnd,

    hourlyAggregatesRead:
      hourlyAggregates.length,

    aggregatesWritten,
  };
}