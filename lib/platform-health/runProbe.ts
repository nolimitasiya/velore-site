import {
  PlatformHealthCheck,
  PlatformHealthCheckType,
  PlatformHealthStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  PLATFORM_HEALTH_CHECKS,
} from "@/lib/platform-health/checkRegistry";

import {
  resolvePlatformHealthProductProbeTarget,
} from "@/lib/platform-health/resolveProbeTargets";

export type PlatformHealthProbeResult = {
  status: PlatformHealthStatus;
  httpStatus: number | null;
  responseTimeMs: number | null;
  failureReason: string | null;
};

type RunProbeOptions = {
  baseUrl?: string;
  healthCheckSecret?: string;
};

function elapsedMs(startedAt: number) {
  return Math.max(
    0,
    Math.round(
      performance.now() - startedAt
    )
  );
}

function failureResult(args: {
  responseTimeMs: number;
  failureReason: string;
  httpStatus?: number | null;
}): PlatformHealthProbeResult {
  return {
    status: PlatformHealthStatus.DOWN,
    httpStatus: args.httpStatus ?? null,
    responseTimeMs: args.responseTimeMs,
    failureReason: args.failureReason,
  };
}

function unknownResult(args: {
  responseTimeMs: number;
  failureReason: string;
}): PlatformHealthProbeResult {
  return {
    status: PlatformHealthStatus.UNKNOWN,
    httpStatus: null,
    responseTimeMs: args.responseTimeMs,
    failureReason: args.failureReason,
  };
}

async function runDatabaseProbe(
  check: PlatformHealthCheck
): Promise<PlatformHealthProbeResult> {
  const startedAt = performance.now();

  let timeout: ReturnType<
    typeof setTimeout
  > | null = null;

  try {
    const timeoutPromise =
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () =>
            reject(
              new Error(
                "Database health check timed out"
              )
            ),
          check.timeoutMs
        );
      });

    /*
     * This bounds how long Platform Health
     * waits for the probe.
     *
     * It does not cancel a PostgreSQL query
     * already handed to Prisma.
     */
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      timeoutPromise,
    ]);

    return {
      status:
        PlatformHealthStatus.HEALTHY,
      httpStatus: null,
      responseTimeMs:
        elapsedMs(startedAt),
      failureReason: null,
    };
  } catch (error) {
    const failureReason =
      error instanceof Error &&
      error.message ===
        "Database health check timed out"
        ? "DATABASE_TIMEOUT"
        : error instanceof Error
          ? error.name
          : "DATABASE_PROBE_ERROR";

    return failureResult({
      responseTimeMs:
        elapsedMs(startedAt),
      failureReason,
    });
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function runAnalyticsProbe(
  check: PlatformHealthCheck
): Promise<PlatformHealthProbeResult> {
  const startedAt = performance.now();

  let timeout: ReturnType<
    typeof setTimeout
  > | null = null;

  try {
    const timeoutPromise =
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () =>
            reject(
              new Error(
                "Analytics health check timed out"
              )
            ),
          check.timeoutMs
        );
      });

    /*
     * Exercise the actual persistence layer
     * used by Veilora analytics ingestion.
     *
     * These are deliberately bounded,
     * read-only queries. Platform Health must
     * never create synthetic shopper sessions
     * or behavioural events merely to prove
     * that analytics is available.
     */
    const analyticsProbe =
      Promise.all([
        prisma.analyticsSession.findFirst({
          select: {
            id: true,
          },
        }),

        prisma.analyticsEvent.findFirst({
          select: {
            id: true,
          },
        }),
      ]);

    await Promise.race([
      analyticsProbe,
      timeoutPromise,
    ]);

    return {
      status:
        PlatformHealthStatus.HEALTHY,
      httpStatus: null,
      responseTimeMs:
        elapsedMs(startedAt),
      failureReason: null,
    };
  } catch (error) {
    const failureReason =
      error instanceof Error &&
      error.message ===
        "Analytics health check timed out"
        ? "ANALYTICS_TIMEOUT"
        : error instanceof Error
          ? error.name
          : "ANALYTICS_PROBE_ERROR";

    return failureResult({
      responseTimeMs:
        elapsedMs(startedAt),
      failureReason,
    });
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function resolveHttpProbePath(
  check: PlatformHealthCheck
): Promise<{
  path: string | null;
  failureReason: string | null;
}> {
  const definition =
    PLATFORM_HEALTH_CHECKS.find(
      (item) =>
        item.checkKey === check.checkKey
    );

  const targetResolver =
    definition?.targetResolver;

  if (!targetResolver) {
    return {
      path: check.path,
      failureReason:
        check.path
          ? null
          : "HTTP_CHECK_PATH_MISSING",
    };
  }

  const target =
    await resolvePlatformHealthProductProbeTarget();

  if (!target) {
    return {
      path: null,
      failureReason:
        "LIVE_PRODUCT_TARGET_UNAVAILABLE",
    };
  }

  switch (targetResolver) {
    case "LIVE_PRODUCT_PDP":
      return {
        path: target.pdpPath,
        failureReason: null,
      };

    case "LIVE_PRODUCT_OUTBOUND":
      return {
        path: target.outboundPath,
        failureReason: null,
      };

    default:
      return {
        path: null,
        failureReason:
          "UNKNOWN_TARGET_RESOLVER",
      };
  }
}

async function runHttpProbe(
  check: PlatformHealthCheck,
  options: RunProbeOptions
): Promise<PlatformHealthProbeResult> {
  const startedAt = performance.now();

  /*
   * Resolve dynamic targets immediately before
   * execution so Platform Health follows the
   * current live catalogue rather than a
   * hardcoded product.
   */
  let resolvedPath: {
    path: string | null;
    failureReason: string | null;
  };

  try {
    resolvedPath =
      await resolveHttpProbePath(check);
  } catch {
    return unknownResult({
      responseTimeMs:
        elapsedMs(startedAt),
      failureReason:
        "HTTP_TARGET_RESOLUTION_FAILED",
    });
  }

  if (!resolvedPath.path) {
    return unknownResult({
      responseTimeMs:
        elapsedMs(startedAt),
      failureReason:
        resolvedPath.failureReason ??
        "HTTP_CHECK_PATH_MISSING",
    });
  }

  const baseUrl =
    options.baseUrl
      ?.trim()
      .replace(/\/+$/, "");

  if (!baseUrl) {
    return unknownResult({
      responseTimeMs:
        elapsedMs(startedAt),
      failureReason:
        "PLATFORM_BASE_URL_MISSING",
    });
  }

  /*
   * Internal HTTP probes must always carry the
   * trusted Platform Health identity.
   *
   * Fail closed rather than accidentally
   * sending synthetic traffic through normal
   * shopper analytics paths.
   */
  const healthCheckSecret =
    options.healthCheckSecret?.trim();

  if (!healthCheckSecret) {
    return unknownResult({
      responseTimeMs:
        elapsedMs(startedAt),
      failureReason:
        "PLATFORM_HEALTH_SECRET_MISSING",
    });
  }

  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    check.timeoutMs
  );

  try {
    const headers = new Headers();

    headers.set(
      "x-veilora-health-check",
      healthCheckSecret
    );

    const response = await fetch(
      new URL(
        resolvedPath.path,
        `${baseUrl}/`
      ),
      {
        method:
          check.httpMethod ?? "GET",
        headers,
        redirect: "follow",
        cache: "no-store",
        signal: controller.signal,
      }
    );

    const responseTimeMs =
      elapsedMs(startedAt);

    if (!response.ok) {
      return failureResult({
        httpStatus: response.status,
        responseTimeMs,
        failureReason:
          `HTTP_${response.status}`,
      });
    }

    return {
      status:
        PlatformHealthStatus.HEALTHY,
      httpStatus: response.status,
      responseTimeMs,
      failureReason: null,
    };
  } catch (error) {
    const failureReason =
      error instanceof Error &&
      error.name === "AbortError"
        ? "HTTP_TIMEOUT"
        : error instanceof Error
          ? error.name
          : "HTTP_PROBE_ERROR";

    return failureResult({
      responseTimeMs:
        elapsedMs(startedAt),
      failureReason,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function runPlatformHealthProbe(
  check: PlatformHealthCheck,
  options: RunProbeOptions = {}
): Promise<PlatformHealthProbeResult> {
  switch (check.checkType) {
    case PlatformHealthCheckType.DATABASE:
      return runDatabaseProbe(check);

    case PlatformHealthCheckType.ANALYTICS:
      return runAnalyticsProbe(check);

    case PlatformHealthCheckType.HTTP:
      return runHttpProbe(
        check,
        options
      );

    default:
      return {
        status:
          PlatformHealthStatus.UNKNOWN,
        httpStatus: null,
        responseTimeMs: null,
        failureReason:
          "UNSUPPORTED_CHECK_TYPE",
      };
  }
}