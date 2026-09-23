import {
  PlatformIncidentSource,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

const MAX_OCCURRENCE_SAMPLES = 25;

type RecordOccurrenceOptions = {
  incidentId: string;
  source: PlatformIncidentSource;

  errorName?: string | null;
  digest?: string | null;

  method?: string | null;
  path?: string | null;

  routerKind?: string | null;
  routePath?: string | null;
  routeType?: string | null;

  httpStatus?: number | null;

  occurredAt?: Date;
};

type TransactionClient =
  Prisma.TransactionClient;

export async function recordPlatformIncidentOccurrence(
  options: RecordOccurrenceOptions,
  tx: TransactionClient = prisma
) {
  const sampleCount =
    await tx.platformIncidentOccurrence.count({
      where: {
        incidentId:
          options.incidentId,
      },
    });

  /*
   * PlatformIncident.occurrenceCount remains
   * the authoritative total.
   *
   * Detailed occurrence rows are deliberately
   * bounded so a prolonged outage cannot
   * generate unlimited diagnostic telemetry.
   */
  if (
    sampleCount >=
    MAX_OCCURRENCE_SAMPLES
  ) {
    return {
      recorded: false as const,
      reason:
        "SAMPLE_LIMIT_REACHED" as const,
    };
  }

  const occurrence =
    await tx.platformIncidentOccurrence.create({
      data: {
        incidentId:
          options.incidentId,

        source:
          options.source,

        errorName:
          options.errorName ?? null,

        digest:
          options.digest ?? null,

        method:
          options.method ?? null,

        path:
          options.path ?? null,

        routerKind:
          options.routerKind ?? null,

        routePath:
          options.routePath ?? null,

        routeType:
          options.routeType ?? null,

        httpStatus:
          options.httpStatus ?? null,

        occurredAt:
          options.occurredAt ??
          new Date(),
      },
    });

  return {
    recorded: true as const,
    occurrence,
  };
}