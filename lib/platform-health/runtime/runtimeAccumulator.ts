import {
  PlatformIncidentType,
} from "@prisma/client";

import {
  getRuntimeIncidentCorrelationKey,
  getRuntimeRouteKey,
} from "@/lib/platform-health/runtime/correlation";

const FLUSH_INTERVAL_MS = 10_000;

export type RuntimeErrorObservation = {
  type: PlatformIncidentType;

  errorName?: string | null;
  digest?: string | null;

  method?: string | null;
  path?: string | null;

  routerKind?: string | null;
  routePath?: string | null;
  routeType?: string | null;

  occurredAt?: Date;
};

export type RuntimeRouteAggregate = {
  routeKey: string;
  method: string | null;
  path: string | null;
  occurrenceCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
};

export type RuntimeIncidentBatch = {
  correlationKey: string;
  type: PlatformIncidentType;

  occurrenceCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;

  sample: RuntimeErrorObservation;

  routes: RuntimeRouteAggregate[];
};

type PendingRuntimeIncident = {
  correlationKey: string;
  type: PlatformIncidentType;

  occurrenceCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;

  sample: RuntimeErrorObservation;

  routes: Map<
    string,
    RuntimeRouteAggregate
  >;

  lastFlushAt: number;
};

const pendingIncidents = new Map<
  string,
  PendingRuntimeIncident
>();

function nullableString(
  value: string | null | undefined
) {
  const normalized = value?.trim();
  return normalized || null;
}

function normalizeObservation(
  observation: RuntimeErrorObservation
): RuntimeErrorObservation {
  return {
    type: observation.type,

    errorName:
      nullableString(
        observation.errorName
      ),

    digest:
      nullableString(
        observation.digest
      ),

    method:
      nullableString(
        observation.method
      )?.toUpperCase() ?? null,

    path:
      nullableString(
        observation.path
      ),

    routerKind:
      nullableString(
        observation.routerKind
      ),

    routePath:
      nullableString(
        observation.routePath
      ),

    routeType:
      nullableString(
        observation.routeType
      ),

    occurredAt:
      observation.occurredAt ??
      new Date(),
  };
}

export function observeRuntimeError(
  observation: RuntimeErrorObservation
): RuntimeIncidentBatch | null {
  const normalized =
    normalizeObservation(
      observation
    );

  const occurredAt =
    normalized.occurredAt ??
    new Date();

  const correlationKey =
    getRuntimeIncidentCorrelationKey({
      type: normalized.type,
      method: normalized.method,
      path: normalized.path,
      routePath:
        normalized.routePath,
    });

  const routeKey =
    getRuntimeRouteKey({
      method: normalized.method,
      path: normalized.path,
      routePath:
        normalized.routePath,
    });

  const existing =
    pendingIncidents.get(
      correlationKey
    );

  if (!existing) {
    const routes = new Map<
      string,
      RuntimeRouteAggregate
    >();

    routes.set(routeKey, {
      routeKey,

      method:
        normalized.method ?? null,

      path:
        normalized.routePath ??
        normalized.path ??
        null,

      occurrenceCount: 1,
      firstSeenAt: occurredAt,
      lastSeenAt: occurredAt,
    });

    pendingIncidents.set(
      correlationKey,
      {
        correlationKey,
        type: normalized.type,

        occurrenceCount: 1,
        firstSeenAt: occurredAt,
        lastSeenAt: occurredAt,

        sample: normalized,

        routes,

        /*
         * Start the flush window now.
         *
         * The first error is deliberately
         * not persisted immediately.
         */
        lastFlushAt: Date.now(),
      }
    );

    return null;
  }

  existing.occurrenceCount += 1;
  existing.lastSeenAt =
    occurredAt;

  const existingRoute =
    existing.routes.get(routeKey);

  if (existingRoute) {
    existingRoute.occurrenceCount += 1;
    existingRoute.lastSeenAt =
      occurredAt;
  } else {
    existing.routes.set(routeKey, {
      routeKey,

      method:
        normalized.method ?? null,

      path:
        normalized.routePath ??
        normalized.path ??
        null,

      occurrenceCount: 1,
      firstSeenAt: occurredAt,
      lastSeenAt: occurredAt,
    });
  }

  const now = Date.now();

  if (
    now - existing.lastFlushAt <
    FLUSH_INTERVAL_MS
  ) {
    return null;
  }

  const batch:
    RuntimeIncidentBatch = {
      correlationKey:
        existing.correlationKey,

      type:
        existing.type,

      occurrenceCount:
        existing.occurrenceCount,

      firstSeenAt:
        existing.firstSeenAt,

      lastSeenAt:
        existing.lastSeenAt,

      sample:
        existing.sample,

      routes:
        Array.from(
          existing.routes.values()
        ),
    };

  /*
   * Reset the accumulator before the
   * caller performs any database work.
   *
   * That keeps the hot error path from
   * waiting for persistence before it
   * can continue collecting observations.
   */
  pendingIncidents.set(
    correlationKey,
    {
      correlationKey,
      type: normalized.type,

      occurrenceCount: 0,
      firstSeenAt: occurredAt,
      lastSeenAt: occurredAt,

      sample: normalized,
      routes: new Map(),

      lastFlushAt: now,
    }
  );

  return batch;
}