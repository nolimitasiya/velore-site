import {
  AdminNotificationType,
  CatalogueHealthFailureType,
  CatalogueHealthIssueStatus,
  CatalogueHealthSeverity,
  CatalogueHealthStatus,
  CatalogueHealthTargetType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { checkCatalogueUrl } from "@/lib/catalogue-health/checkUrl";

const HEALTHY_RECHECK_HOURS = 12;
const DEGRADED_RECHECK_MINUTES = 15;
const BROKEN_RECHECK_HOURS = 2;

const DEFINITIVE_FAILURE_THRESHOLD = 2;
const TRANSIENT_FAILURE_THRESHOLD = 3;

export async function processCatalogueHealthTarget(targetId: string) {
  const target = await prisma.catalogueHealthTarget.findUnique({
    where: {
      id: targetId,
    },
    include: {
      productImage: {
        select: {
          sortOrder: true,
        },
      },
    },
  });

  if (!target) {
    return {
      targetId,
      outcome: "TARGET_NOT_FOUND" as const,
    };
  }

  if (!target.isActive) {
  return {
    targetId,
    outcome: "TARGET_RETIRED" as const,
  };
}

  const checkedAt = new Date();

  const result = await checkCatalogueUrl({
    url: target.url,
    targetType: target.targetType,
  });

  await prisma.catalogueHealthCheck.create({
  data: {
    targetId: target.id,
    requestedUrl: target.url,
      status: result.status,
      failureType: result.failureType,
      httpStatus: result.httpStatus,
      finalUrl: result.finalUrl,
      contentType: result.contentType,
      responseTimeMs: result.responseTimeMs,
      errorMessage: result.errorMessage,
      checkedAt,
    },
  });

  if (result.status === CatalogueHealthStatus.HEALTHY) {
    return handleHealthyResult({
      target,
      result,
      checkedAt,
    });
  }

  return handleFailedResult({
    target,
    result,
    checkedAt,
  });
}

type LoadedTarget = NonNullable<
  Awaited<
    ReturnType<
      typeof prisma.catalogueHealthTarget.findUnique<{
        where: { id: string };
        include: {
          productImage: {
            select: {
              sortOrder: true;
            };
          };
        };
      }>
    >
  >
>;

type HealthResult = Awaited<ReturnType<typeof checkCatalogueUrl>>;

async function handleHealthyResult(args: {
  target: LoadedTarget;
  result: HealthResult;
  checkedAt: Date;
}) {
  const { target, result, checkedAt } = args;

  const wasBroken = target.status === CatalogueHealthStatus.BROKEN;

  await prisma.$transaction(async (tx) => {
    await tx.catalogueHealthTarget.update({
      where: {
        id: target.id,
      },
      data: {
        status: CatalogueHealthStatus.HEALTHY,
        failureType: null,

        httpStatus: result.httpStatus,
        finalUrl: result.finalUrl,
        contentType: result.contentType,
        responseTimeMs: result.responseTimeMs,

        consecutiveFailures: 0,
        consecutiveSuccesses: {
          increment: 1,
        },

        firstCheckedAt: target.firstCheckedAt ?? checkedAt,
        lastCheckedAt: checkedAt,
        lastHealthyAt: checkedAt,

        nextCheckAt: addHours(
          checkedAt,
          HEALTHY_RECHECK_HOURS
        ),
      },
    });

    if (!wasBroken) {
      return;
    }

    const activeIssues = await tx.catalogueHealthIssue.findMany({
      where: {
        targetId: target.id,
        status: {
          in: [
            CatalogueHealthIssueStatus.OPEN,
            CatalogueHealthIssueStatus.ACKNOWLEDGED,
          ],
        },
      },
      select: {
        id: true,
      },
    });

    if (activeIssues.length === 0) {
      return;
    }

    await tx.catalogueHealthIssue.updateMany({
      where: {
        id: {
          in: activeIssues.map((issue) => issue.id),
        },
      },
      data: {
        status: CatalogueHealthIssueStatus.RESOLVED,
        resolvedAt: checkedAt,
      },
    });

    for (const issue of activeIssues) {
      await tx.adminNotification.create({
        data: {
          type: AdminNotificationType.CATALOGUE_HEALTH_RECOVERED,
          brandId: null,
          productId: target.productId,
          catalogueHealthIssueId: issue.id,
        },
      });
    }
  });

  return {
    targetId: target.id,
    outcome: wasBroken ? "RECOVERED" : "HEALTHY",
    status: CatalogueHealthStatus.HEALTHY,
  } as const;
}

async function handleFailedResult(args: {
  target: LoadedTarget;
  result: HealthResult;
  checkedAt: Date;
}) {
  const { target, result, checkedAt } = args;

  const failureType =
    result.failureType ?? CatalogueHealthFailureType.OTHER;

  const nextFailureCount = target.consecutiveFailures + 1;

  const threshold = getFailureThreshold(failureType);

  const shouldBreak = nextFailureCount >= threshold;

  const nextStatus = shouldBreak
    ? CatalogueHealthStatus.BROKEN
    : CatalogueHealthStatus.DEGRADED;

  await prisma.$transaction(async (tx) => {
    await tx.catalogueHealthTarget.update({
      where: {
        id: target.id,
      },
      data: {
        status: nextStatus,
        failureType,

        httpStatus: result.httpStatus,
        finalUrl: result.finalUrl,
        contentType: result.contentType,
        responseTimeMs: result.responseTimeMs,

        consecutiveFailures: nextFailureCount,
        consecutiveSuccesses: 0,

        firstCheckedAt: target.firstCheckedAt ?? checkedAt,
        lastCheckedAt: checkedAt,
        lastFailedAt: checkedAt,

        nextCheckAt: shouldBreak
          ? addHours(checkedAt, BROKEN_RECHECK_HOURS)
          : addMinutes(checkedAt, DEGRADED_RECHECK_MINUTES),
      },
    });

    if (!shouldBreak) {
      return;
    }

    const existingIssue = await tx.catalogueHealthIssue.findFirst({
      where: {
        targetId: target.id,
        status: {
          in: [
            CatalogueHealthIssueStatus.OPEN,
            CatalogueHealthIssueStatus.ACKNOWLEDGED,
          ],
        },
      },
    });

    if (existingIssue) {
      await tx.catalogueHealthIssue.update({
        where: {
          id: existingIssue.id,
        },
        data: {
          latestHttpStatus: result.httpStatus,
          failureType,
          failureCount: {
            increment: 1,
          },
          lastFailureAt: checkedAt,
        },
      });

      return;
    }

    const issue = await tx.catalogueHealthIssue.create({
  data: {
    targetId: target.id,
    urlAtOpen: target.url,
    status: CatalogueHealthIssueStatus.OPEN,
        severity: getSeverity(target),
        failureType,

        firstHttpStatus: result.httpStatus,
        latestHttpStatus: result.httpStatus,

        failureCount: nextFailureCount,
        lastFailureAt: checkedAt,
      },
    });

    await tx.adminNotification.create({
      data: {
        type: AdminNotificationType.CATALOGUE_HEALTH_FAILURE,
        brandId: null,
        productId: target.productId,
        catalogueHealthIssueId: issue.id,
      },
    });
  });

  return {
    targetId: target.id,
    outcome: shouldBreak ? "BROKEN" : "DEGRADED",
    status: nextStatus,
    failureType,
    consecutiveFailures: nextFailureCount,
  } as const;
}

function getFailureThreshold(
  failureType: CatalogueHealthFailureType
) {
  switch (failureType) {
    case CatalogueHealthFailureType.INVALID_URL:
    case CatalogueHealthFailureType.NOT_FOUND:
    case CatalogueHealthFailureType.GONE:
    case CatalogueHealthFailureType.INVALID_CONTENT_TYPE:
      return DEFINITIVE_FAILURE_THRESHOLD;

    case CatalogueHealthFailureType.UNAUTHORIZED:
    case CatalogueHealthFailureType.FORBIDDEN:
    case CatalogueHealthFailureType.RATE_LIMITED:
    case CatalogueHealthFailureType.SERVER_ERROR:
    case CatalogueHealthFailureType.TIMEOUT:
    case CatalogueHealthFailureType.NETWORK_ERROR:
    case CatalogueHealthFailureType.REDIRECT_LOOP:
    case CatalogueHealthFailureType.TOO_MANY_REDIRECTS:
    case CatalogueHealthFailureType.OTHER:
      return TRANSIENT_FAILURE_THRESHOLD;
  }
}

function getSeverity(target: LoadedTarget) {
  if (
    target.targetType ===
      CatalogueHealthTargetType.PRODUCT_SOURCE_URL ||
    target.targetType ===
      CatalogueHealthTargetType.PRODUCT_AFFILIATE_URL
  ) {
    return CatalogueHealthSeverity.CRITICAL;
  }

  if (
    target.targetType === CatalogueHealthTargetType.PRODUCT_IMAGE &&
    target.productImage?.sortOrder === 0
  ) {
    return CatalogueHealthSeverity.CRITICAL;
  }

  return CatalogueHealthSeverity.WARNING;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60_000);
}