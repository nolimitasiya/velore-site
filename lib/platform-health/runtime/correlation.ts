import {
  PlatformIncidentType,
} from "@prisma/client";

type RuntimeCorrelationOptions = {
  type: PlatformIncidentType;
  method?: string | null;
  path?: string | null;
  routePath?: string | null;
};

function normalizeRouteValue(
  value: string | null | undefined
) {
  const normalized =
    value?.trim();

  return normalized || null;
}

export function getRuntimeRouteKey(
  options: Pick<
    RuntimeCorrelationOptions,
    "method" | "path" | "routePath"
  >
) {
  const method =
    normalizeRouteValue(
      options.method
    )?.toUpperCase() ?? "UNKNOWN";

  /*
   * Prefer Next's route template when
   * available.
   *
   * For example:
   * /api/out/[id]
   *
   * is much better operationally than
   * creating a separate route record for
   * every concrete product id.
   */
  const route =
    normalizeRouteValue(
      options.routePath
    ) ??
    normalizeRouteValue(
      options.path
    ) ??
    "UNKNOWN";

  return `${method}:${route}`;
}

export function getRuntimeIncidentCorrelationKey(
  options: RuntimeCorrelationOptions
) {
  /*
   * Database incidents are infrastructure
   * scoped.
   *
   * Multiple failing routes can therefore
   * contribute to one database incident.
   */
  if (
    options.type ===
      PlatformIncidentType
        .DATABASE_CONNECTION_EXHAUSTED ||
    options.type ===
      PlatformIncidentType
        .DATABASE_ERROR
  ) {
    return `runtime:${options.type}`;
  }

  /*
   * Generic server errors are route scoped.
   *
   * An error on /sale must not automatically
   * merge with an unrelated error elsewhere.
   */
  return [
    "runtime",
    options.type,
    getRuntimeRouteKey(options),
  ].join(":");
}