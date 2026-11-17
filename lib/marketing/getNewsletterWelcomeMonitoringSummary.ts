import "server-only";

import type { PrismaClient } from "@prisma/client";

type MonitoringDatabase = Pick<PrismaClient, "newsletterWelcomeEvent">;

export type NewsletterWelcomeMonitoringSummary = {
  unknownCount: number;
  staleProcessingCount: number;
  staleSubmittingCount: number;
  oldestUnresolvedCreatedAt: Date | null;
  requiresManualReconciliation: boolean;
};

export async function getNewsletterWelcomeMonitoringSummary(
  db: MonitoringDatabase,
  options: {
    staleBefore: Date;
  }
): Promise<NewsletterWelcomeMonitoringSummary> {
  if (
    !(options.staleBefore instanceof Date) ||
    Number.isNaN(options.staleBefore.getTime())
  ) {
    throw new Error("Invalid newsletter monitoring cutoff.");
  }

  const [
    unknownCount,
    staleProcessingCount,
    staleSubmittingCount,
    oldestUnresolved,
  ] = await Promise.all([
    db.newsletterWelcomeEvent.count({
      where: {
        status: "UNKNOWN",
      },
    }),

    db.newsletterWelcomeEvent.count({
      where: {
        status: "PROCESSING",
        claimedAt: {
          lt: options.staleBefore,
        },
      },
    }),

    db.newsletterWelcomeEvent.count({
      where: {
        status: "SUBMITTING",
        claimedAt: {
          lt: options.staleBefore,
        },
      },
    }),

    db.newsletterWelcomeEvent.findFirst({
      where: {
        OR: [
          { status: "UNKNOWN" },
          {
            status: "PROCESSING",
            claimedAt: {
              lt: options.staleBefore,
            },
          },
          {
            status: "SUBMITTING",
            claimedAt: {
              lt: options.staleBefore,
            },
          },
        ],
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        createdAt: true,
      },
    }),
  ]);

  return {
    unknownCount,
    staleProcessingCount,
    staleSubmittingCount,
    oldestUnresolvedCreatedAt: oldestUnresolved?.createdAt ?? null,
    requiresManualReconciliation:
      unknownCount > 0 ||
      staleProcessingCount > 0 ||
      staleSubmittingCount > 0,
  };
}