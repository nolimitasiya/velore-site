import {
  PlatformHealthAggregatePeriod,
} from "@prisma/client";

import type { PlatformHealthHistoryDb } from "@/lib/platform-health/history/historyDb";

import { prisma } from "@/lib/prisma";
import {
  aggregatePlatformHealthDay,
  aggregatePlatformHealthHour,
} from "@/lib/platform-health/history/aggregateMeasurements";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const PLATFORM_HEALTH_RETENTION = {
  rawMeasurementDays: 7,
  hourlyAggregateDays: 90,
  dailyAggregateMonths: 24,
  runDays: 30,
} as const;

export const PLATFORM_HEALTH_RETENTION_BATCH = {
  rawBucketsPerRun: 100,
  hourlyDaysPerRun: 100,
  dailyDeleteRowsPerRun: 500,
  runDeleteRowsPerRun: 500,
} as const;

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

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    )
  );
}

function subtractUtcDays(
  date: Date,
  days: number
) {
  return new Date(
    date.getTime() - days * DAY_MS
  );
}

function subtractUtcMonths(
  date: Date,
  months: number
) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() - months,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  );
}

/*
 * Only complete buckets are eligible.
 *
 * A cutoff in the middle of an hour/day is
 * normalized backwards so we never aggregate
 * or remove a partially retained bucket.
 */
function rawRetentionBoundary(now: Date) {
  return startOfUtcHour(
    subtractUtcDays(
      now,
      PLATFORM_HEALTH_RETENTION
        .rawMeasurementDays
    )
  );
}

function hourlyRetentionBoundary(now: Date) {
  return startOfUtcDay(
    subtractUtcDays(
      now,
      PLATFORM_HEALTH_RETENTION
        .hourlyAggregateDays
    )
  );
}

function dailyRetentionBoundary(now: Date) {
  return startOfUtcDay(
    subtractUtcMonths(
      now,
      PLATFORM_HEALTH_RETENTION
        .dailyAggregateMonths
    )
  );
}

function runRetentionBoundary(now: Date) {
  return subtractUtcDays(
    now,
    PLATFORM_HEALTH_RETENTION.runDays
  );
}

type RawBucket = {
  checkId: string;
  bucketStart: Date;
};

type DailyBucket = {
  checkId: string;
  bucketStart: Date;
};

function rawBucketKey(
  checkId: string,
  bucketStart: Date
) {
  return `${checkId}:${bucketStart.toISOString()}`;
}

function dailyBucketKey(
  checkId: string,
  bucketStart: Date
) {
  return `${checkId}:${bucketStart.toISOString()}`;
}

function aggregateMatchesSource(
  aggregateMeasurementCount:
    | number
    | null
    | undefined,
  sourceMeasurementCount: number
) {
  return (
    aggregateMeasurementCount !== null &&
    aggregateMeasurementCount !== undefined &&
    aggregateMeasurementCount ===
      sourceMeasurementCount
  );
}

/*
 * RAW → HOURLY
 *
 * We deliberately discover eligible raw
 * buckets first rather than issuing one broad
 * age-based delete.
 */
async function retainRawMeasurements(
  now: Date,
  checkId: string | undefined,
  db: PlatformHealthHistoryDb
) {
  const cutoff = rawRetentionBoundary(now);

 
   const candidates =
  await db.platformHealthMeasurement.findMany({
    where: {
        ...(checkId
            ? { checkId }
            : {}),
    
      checkedAt: {
        lt: cutoff,
      },
    },

    select: {
      checkId: true,
      checkedAt: true,
    },

    orderBy: {
      checkedAt: "asc",
    },

    take: 5_000,
  });

  const buckets = new Map<
    string,
    RawBucket
  >();

  for (const candidate of candidates) {
    const bucketStart =
      startOfUtcHour(candidate.checkedAt);

    buckets.set(
      rawBucketKey(
        candidate.checkId,
        bucketStart
      ),
      {
        checkId: candidate.checkId,
        bucketStart,
      }
    );
  }

  let bucketsProcessed = 0;
  let bucketsVerified = 0;
  let measurementsDeleted = 0;

  const selectedBuckets =
  Array.from(buckets.values()).slice(
    0,
    PLATFORM_HEALTH_RETENTION_BATCH
      .rawBucketsPerRun
  );

for (const bucket of selectedBuckets) {
    const bucketEnd = new Date(
      bucket.bucketStart.getTime() +
        HOUR_MS
    );

    /*
     * Rebuild the complete hour immediately
     * before verification/deletion.
     */
    await aggregatePlatformHealthHour(
      bucket.bucketStart,
      db,
      bucket.checkId
    );

    const aggregate =
      await db.platformHealthAggregate.findUnique({
        where: {
          checkId_period_bucketStart: {
            checkId: bucket.checkId,
            period:
              PlatformHealthAggregatePeriod.HOURLY,
            bucketStart:
              bucket.bucketStart,
          },
        },

        select: {
          id: true,
          measurementCount: true,
        },
      });

    const rawCount =
      await db.platformHealthMeasurement.count({
        where: {
          checkId: bucket.checkId,
          checkedAt: {
            gte: bucket.bucketStart,
            lt: bucketEnd,
          },
        },
      });

    bucketsProcessed += 1;

    /*
     * Merely finding an aggregate is not
     * sufficient.
     *
     * Its measurement count must match the
     * raw bucket we are about to remove.
     */
    if (
  !aggregate ||
  !aggregateMatchesSource(
    aggregate.measurementCount,
    rawCount
  )
) {
  continue;
}

    bucketsVerified += 1;

    const deleted =
      await db.platformHealthMeasurement.deleteMany({
        where: {
          checkId: bucket.checkId,
          checkedAt: {
            gte: bucket.bucketStart,
            lt: bucketEnd,
          },
        },
      });

    measurementsDeleted += deleted.count;
  }

  return {
    cutoff,
    candidateMeasurements:
      candidates.length,
    bucketsProcessed,
    bucketsVerified,
    measurementsDeleted,
    bucketsDiscovered: buckets.size,
    bucketsSelected: selectedBuckets.length,
  };
}

/*
 * HOURLY → DAILY
 */
async function retainHourlyAggregates(
  now: Date,
  checkId: string | undefined,
  db: PlatformHealthHistoryDb
) {
  const cutoff =
    hourlyRetentionBoundary(now);

  const candidates =
    await db.platformHealthAggregate.findMany({
      where: {
         ...(checkId
            ? { checkId }
            : {}),

        period:
          PlatformHealthAggregatePeriod.HOURLY,

        bucketStart: {
          lt: cutoff,
        },
      },

      select: {
        checkId: true,
        bucketStart: true,
      },

      orderBy: {
        bucketStart: "asc",
      },

      take:2_500,
    });

  const buckets = new Map<
    string,
    DailyBucket
  >();

  for (const candidate of candidates) {
    const bucketStart =
      startOfUtcDay(candidate.bucketStart);

    buckets.set(
      dailyBucketKey(
        candidate.checkId,
        bucketStart
      ),
      {
        checkId: candidate.checkId,
        bucketStart,
      }
    );
  }

  let daysProcessed = 0;
  let daysVerified = 0;
  let hourlyAggregatesDeleted = 0;

  const selectedDays =
  Array.from(buckets.values()).slice(
    0,
    PLATFORM_HEALTH_RETENTION_BATCH
      .hourlyDaysPerRun
  );

for (const bucket of selectedDays) {
    const bucketEnd = new Date(
      bucket.bucketStart.getTime() +
        DAY_MS
    );

    /*
     * Rebuild the complete day from HOURLY
     * history before considering deletion.
     */
    await aggregatePlatformHealthDay(
      bucket.bucketStart,
      db,
      bucket.checkId
    );

    const dailyAggregate =
      await db.platformHealthAggregate.findUnique({
        where: {
          checkId_period_bucketStart: {
            checkId: bucket.checkId,
            period:
              PlatformHealthAggregatePeriod.DAILY,
            bucketStart:
              bucket.bucketStart,
          },
        },

        select: {
          id: true,
          measurementCount: true,
        },
      });

    const hourlySummary =
      await db.platformHealthAggregate.aggregate({
        where: {
          checkId: bucket.checkId,

          period:
            PlatformHealthAggregatePeriod.HOURLY,

          bucketStart: {
            gte: bucket.bucketStart,
            lt: bucketEnd,
          },
        },

        _sum: {
          measurementCount: true,
        },

        _count: {
          _all: true,
        },
      });

    daysProcessed += 1;

    const hourlyMeasurementCount =
      hourlySummary._sum.measurementCount ??
      0;

    /*
     * Again: existence alone is insufficient.
     * The DAILY rollup must represent the
     * measurement total of the HOURLY rows
     * being removed.
     */
    if (
  !dailyAggregate ||
  hourlySummary._count._all === 0 ||
  !aggregateMatchesSource(
    dailyAggregate.measurementCount,
    hourlyMeasurementCount
  )
) {
  continue;
}

    daysVerified += 1;

    const deleted =
      await db.platformHealthAggregate.deleteMany({
        where: {
          checkId: bucket.checkId,

          period:
            PlatformHealthAggregatePeriod.HOURLY,

          bucketStart: {
            gte: bucket.bucketStart,
            lt: bucketEnd,
          },
        },
      });

    hourlyAggregatesDeleted +=
      deleted.count;
  }

  return {
    cutoff,
    candidateHourlyAggregates:
      candidates.length,
    daysProcessed,
    daysVerified,
    hourlyAggregatesDeleted,
    daysDiscovered: buckets.size,
    daysSelected: selectedDays.length,
  };
}

/*
 * DAILY history has no further rollup tier.
 * Once outside the 24-month retention window,
 * it can be removed directly.
 */
async function retainDailyAggregates(
  now: Date,
  checkId: string | undefined,
  db: PlatformHealthHistoryDb
) {
  const cutoff =
    dailyRetentionBoundary(now);

  const candidates =
    await db.platformHealthAggregate.findMany({
      where: {
         ...(checkId
            ? { checkId }
            : {}),

        period:
          PlatformHealthAggregatePeriod.DAILY,

        bucketStart: {
          lt: cutoff,
        },
      },

      select: {
        id: true,
      },

      orderBy: {
        bucketStart: "asc",
      },

      take:
        PLATFORM_HEALTH_RETENTION_BATCH
          .dailyDeleteRowsPerRun,
    });

  const deleted =
    candidates.length === 0
      ? { count: 0 }
      : await db.platformHealthAggregate.deleteMany({
          where: {
            id: {
              in: candidates.map(
                (candidate) => candidate.id
              ),
            },
          },
        });

  return {
    cutoff,
    candidatesSelected:
      candidates.length,
    dailyAggregatesDeleted:
      deleted.count,
  };
}

/*
 * Runs are execution metadata, not incident
 * history. Measurements use SetNull for runId,
 * so old run records can expire independently.
 */
async function retainRuns(
  now: Date,
  db: PlatformHealthHistoryDb
){
  const cutoff =
    runRetentionBoundary(now);

  const candidates =
    await db.platformHealthRun.findMany({
      where: {
        startedAt: {
          lt: cutoff,
        },
      },

      select: {
        id: true,
      },

      orderBy: {
        startedAt: "asc",
      },

      take:
        PLATFORM_HEALTH_RETENTION_BATCH
          .runDeleteRowsPerRun,
    });

  const deleted =
    candidates.length === 0
      ? { count: 0 }
      : await db.platformHealthRun.deleteMany({
          where: {
            id: {
              in: candidates.map(
                (candidate) => candidate.id
              ),
            },
          },
        });

  return {
    cutoff,
    candidatesSelected:
      candidates.length,
    runsDeleted: deleted.count,
  };
}

export async function runPlatformHealthRetention(
  options?: {
    now?: Date;
    checkId?: string;
    includeRunRetention?: boolean;
    db?: PlatformHealthHistoryDb;
  }
) {
  const now =
    options?.now ?? new Date();
  const db =
     options?.db ?? prisma;
  /*
   * Ordering is intentional:
   *
   * RAW → HOURLY first.
   * HOURLY → DAILY second.
   * Then expiry of DAILY and runs.
   *
   * Incidents are deliberately absent.
   */
 const raw =
  await retainRawMeasurements(
    now,
    options?.checkId,
    db
  );

const hourly =
  await retainHourlyAggregates(
    now,
    options?.checkId,
    db
  );

const daily =
  await retainDailyAggregates(
    now,
    options?.checkId,
    db
  );

const runs =
  options?.includeRunRetention === false
    ? {
        skipped: true,
        runsDeleted: 0,
      }
    : await retainRuns(
        now,
        db
      );

  return {
    now,
    raw,
    hourly,
    daily,
    runs,
  };
}