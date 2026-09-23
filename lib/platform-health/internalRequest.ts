import type { NextRequest } from "next/server";

export type VeiloraInternalRequestType =
  | "LOAD_TEST"
  | "PLATFORM_HEALTH";

type InternalRequestDefinition = {
  headerName: string;
  secretEnvName:
    | "LOAD_TEST_HEADER_SECRET"
    | "PLATFORM_HEALTH_HEADER_SECRET";
};

const INTERNAL_REQUESTS: Record<
  VeiloraInternalRequestType,
  InternalRequestDefinition
> = {
  LOAD_TEST: {
    headerName: "x-veilora-load-test",
    secretEnvName: "LOAD_TEST_HEADER_SECRET",
  },

  PLATFORM_HEALTH: {
    headerName: "x-veilora-health-check",
    secretEnvName:
      "PLATFORM_HEALTH_HEADER_SECRET",
  },
};

export function isTrustedInternalRequest(
  req: NextRequest,
  type: VeiloraInternalRequestType
): boolean {
  const definition =
    INTERNAL_REQUESTS[type];

  const expectedSecret =
    process.env[
      definition.secretEnvName
    ]?.trim();

  /*
   * Fail closed.
   *
   * Missing server configuration must never
   * cause arbitrary traffic to be trusted.
   */
  if (!expectedSecret) {
    return false;
  }

  const providedSecret = req.headers
    .get(definition.headerName)
    ?.trim();

  if (!providedSecret) {
    return false;
  }

  return providedSecret === expectedSecret;
}

/*
 * Synthetic/internal observations must never
 * be interpreted as shopper behaviour.
 *
 * This deliberately centralises the rule so
 * analytics-sensitive routes do not each grow
 * independent load-test and health-check logic.
 */
export function isSyntheticInternalRequest(
  req: NextRequest
): boolean {
  return (
    isTrustedInternalRequest(
      req,
      "LOAD_TEST"
    ) ||
    isTrustedInternalRequest(
      req,
      "PLATFORM_HEALTH"
    )
  );
}