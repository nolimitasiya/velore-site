import {
  PlatformIncidentSeverity,
  PlatformIncidentType,
} from "@prisma/client";

type SeverityOptions = {
  type: PlatformIncidentType;
  checkKey?: string | null;
};

const HIGH_SEVERITY_CHECKS = new Set([
  "database",
  "storefront-home",
]);

export function getPlatformIncidentSeverity(
  options: SeverityOptions
): PlatformIncidentSeverity {
  /*
   * Database connection exhaustion is one
   * of the known hard platform failure modes
   * established during capacity testing.
   */
  if (
    options.type ===
    PlatformIncidentType.DATABASE_CONNECTION_EXHAUSTED
  ) {
    return PlatformIncidentSeverity.CRITICAL;
  }

  if (
    options.type ===
      PlatformIncidentType.DATABASE_ERROR ||
    (options.checkKey &&
      HIGH_SEVERITY_CHECKS.has(
        options.checkKey
      ))
  ) {
    return PlatformIncidentSeverity.HIGH;
  }

  if (
    options.type ===
    PlatformIncidentType.HEALTH_CHECK_FAILURE
  ) {
    return PlatformIncidentSeverity.WARNING;
  }

  return PlatformIncidentSeverity.WARNING;
}