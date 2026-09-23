import {
  PlatformHealthAggregatePeriod,
  Prisma,
} from "@prisma/client";

import {
  aggregatePlatformHealthDay,
  aggregatePlatformHealthHour,
} from "@/lib/platform-health/history/aggregateMeasurements";
import type { PlatformHealthHistoryDb } from "@/lib/platform-health/history/historyDb";
import { withPlatformHealthHistoryLock } from "@/lib/platform-health/history/historyLock";
import { runPlatformHealthRetention } from "@/lib/platform-health/history/retention";

const HOUR_MS = 60 * 60 * 1000;

/*
 * Keep every maintenance execution bounded.
 *
 * Discovery happens in PostgreSQL and returns only
 * source buckets whose durable aggregate is missing
 * or no longer matches its source counts.
 *
 * This avoids repeatedly sampling already-complete
 * history and prevents old gaps from being starved
 * after an extended maintenance outage.
 */
export const PLATFORM_HEALTH_HISTORY_BATCH = {
  hourlyBucketsPerRun: 100,
  dailyBucketsPerRun: 100,
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

type HourBucketCandidate = {
  checkId: string;
  bucketStart: Date;
  measurementCount: bigint | number;
};

type DayBucketCandidate = {
  checkId: string;
  bucketStart: Date;
  measurementCount: bigint | number;
};

/*
 * Find completed RAW hour/check buckets that do
 * not yet have the expected HOURLY aggregate.
 *
 * Platform Health measurements are append-only
 * telemetry. measurementCount is therefore the
 * authoritative completeness marker for an
 * already-materialised hour.
 */
async function discoverIncompleteHours(
  currentHour: Date,
  db: PlatformHealthHistoryDb,
  checkId?: string
) {
  const checkFilter = checkId
    ? Prisma.sql`AND m."checkId" = ${checkId}`
    : Prisma.empty;

  return db.$queryRaw<
    HourBucketCandidate[]
  >(
    Prisma.sql`
      WITH source AS (
        SELECT
          m."checkId" AS "checkId",
          date_trunc(
            'hour',
            m."checkedAt" AT TIME ZONE 'UTC'
          ) AT TIME ZONE 'UTC' AS "bucketStart",
          COUNT(*) AS "measurementCount"
        FROM "PlatformHealthMeasurement" m
        WHERE
          m."checkedAt" < ${currentHour}
          ${checkFilter}
        GROUP BY
          m."checkId",
          date_trunc(
            'hour',
            m."checkedAt" AT TIME ZONE 'UTC'
          )
      )
      SELECT
        source."checkId",
        source."bucketStart",
        source."measurementCount"
      FROM source
      LEFT JOIN "PlatformHealthAggregate" a
        ON a."checkId" = source."checkId"
        AND a."period" =
          ${PlatformHealthAggregatePeriod.HOURLY}::"PlatformHealthAggregatePeriod"
        AND a."bucketStart" = source."bucketStart"
      WHERE
        a."id" IS NULL
        OR a."measurementCount" <>
          source."measurementCount"
      ORDER BY
        source."bucketStart" ASC,
        source."checkId" ASC
      LIMIT ${PLATFORM_HEALTH_HISTORY_BATCH.hourlyBucketsPerRun}
    `
  );
}

/*
 * Find completed day/check buckets whose DAILY
 * aggregate is missing or whose measurement count
 * no longer matches the durable HOURLY source.
 *
 * DAILY history is intentionally derived from
 * HOURLY history rather than raw measurements.
 */
async function discoverIncompleteDays(
  currentDay: Date,
  db: PlatformHealthHistoryDb,
  checkId?: string
) {
  const checkFilter = checkId
    ? Prisma.sql`AND h."checkId" = ${checkId}`
    : Prisma.empty;

  return db.$queryRaw<
    DayBucketCandidate[]
  >(
    Prisma.sql`
      WITH source AS (
        SELECT
          h."checkId" AS "checkId",
          date_trunc(
            'day',
            h."bucketStart" AT TIME ZONE 'UTC'
          ) AT TIME ZONE 'UTC' AS "bucketStart",
          SUM(h."measurementCount") AS "measurementCount"
        FROM "PlatformHealthAggregate" h
        WHERE
          h."period" =
            ${PlatformHealthAggregatePeriod.HOURLY}::"PlatformHealthAggregatePeriod"
          AND h."bucketStart" < ${currentDay}
          ${checkFilter}
        GROUP BY
          h."checkId",
          date_trunc(
            'day',
            h."bucketStart" AT TIME ZONE 'UTC'
          )
      )
      SELECT
        source."checkId",
        source."bucketStart",
        source."measurementCount"
      FROM source
      LEFT JOIN "PlatformHealthAggregate" d
        ON d."checkId" = source."checkId"
        AND d."period" =
          ${PlatformHealthAggregatePeriod.DAILY}::"PlatformHealthAggregatePeriod"
        AND d."bucketStart" = source."bucketStart"
      WHERE
        d."id" IS NULL
        OR d."measurementCount" <>
          source."measurementCount"
      ORDER BY
        source."bucketStart" ASC,
        source."checkId" ASC
      LIMIT ${PLATFORM_HEALTH_HISTORY_BATCH.dailyBucketsPerRun}
    `
  );
}

async function aggregateCompletedHours(
  now: Date,
  db: PlatformHealthHistoryDb,
  checkId?: string
) {
  const currentHour =
    startOfUtcHour(now);

  const candidates =
    await discoverIncompleteHours(
      currentHour,
      db,
      checkId
    );

  let measurementsRead = 0;
  let aggregatesWritten = 0;

  for (const candidate of candidates) {
    const result =
      await aggregatePlatformHealthHour(
        candidate.bucketStart,
        db,
        candidate.checkId
      );

    measurementsRead +=
      result.measurementsRead;

    aggregatesWritten +=
      result.aggregatesWritten;
  }

  return {
    currentHour,
    candidatesRead: candidates.length,
    bucketsDiscovered: candidates.length,
    bucketsSelected: candidates.length,
    measurementsRead,
    aggregatesWritten,
  };
}

async function aggregateCompletedDays(
  now: Date,
  db: PlatformHealthHistoryDb,
  checkId?: string
) {
  const currentDay =
    startOfUtcDay(now);

  const candidates =
    await discoverIncompleteDays(
      currentDay,
      db,
      checkId
    );

  let hourlyAggregatesRead = 0;
  let aggregatesWritten = 0;

  for (const candidate of candidates) {
    const result =
      await aggregatePlatformHealthDay(
        candidate.bucketStart,
        db,
        candidate.checkId
      );

    hourlyAggregatesRead +=
      result.hourlyAggregatesRead;

    aggregatesWritten +=
      result.aggregatesWritten;
  }

  return {
    currentDay,
    candidatesRead: candidates.length,
    daysDiscovered: candidates.length,
    daysSelected: candidates.length,
    hourlyAggregatesRead,
    aggregatesWritten,
  };
}

async function runLockedHistoryMaintenance(
  now: Date,
  db: PlatformHealthHistoryDb,
  checkId?: string
) {
  /*
   * Ordering is deliberate:
   *
   * 1. Materialise incomplete RAW hours.
   * 2. Materialise incomplete days from HOURLY.
   * 3. Apply retention.
   *
   * Retention therefore cannot delete source data
   * before its durable history tier has been
   * verified/materialised.
   */
  const hourly =
    await aggregateCompletedHours(
      now,
      db,
      checkId
    );

  const daily =
    await aggregateCompletedDays(
      now,
      db,
      checkId
    );

  const retention =
    await runPlatformHealthRetention({
      now,
      db,
      checkId,
      includeRunRetention:
        checkId ? false : true,
    });

  return {
    now,
    hourly,
    daily,
    retention,
  };
}

export async function runPlatformHealthHistoryMaintenance(
  options?: {
    now?: Date;
    checkId?: string;
  }
) {
  const now =
    options?.now ?? new Date();

  const locked =
    await withPlatformHealthHistoryLock(
      async (tx) =>
        runLockedHistoryMaintenance(
          now,
          tx,
          options?.checkId
        )
    );

  if (!locked.acquired) {
    return {
      acquired: false as const,
      skipped: true as const,
      reason:
        "HISTORY_MAINTENANCE_ALREADY_RUNNING",
      now,
    };
  }

  return {
    acquired: true as const,
    skipped: false as const,
    ...locked.value,
  };
}