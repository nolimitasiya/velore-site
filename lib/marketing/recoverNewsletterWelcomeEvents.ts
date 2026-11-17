import "server-only";

import type { PrismaClient } from "@prisma/client";

type RecoveryDatabase = Pick<PrismaClient, "newsletterWelcomeEvent">;

export type NewsletterWelcomeRecoverySummary = {
  processingMarkedUnknown: number;
  submittingMarkedUnknown: number;
};

export async function recoverNewsletterWelcomeEvents(
  db: RecoveryDatabase,
  options: {
    staleBefore: Date;
  }
): Promise<NewsletterWelcomeRecoverySummary> {
  if (
    !(options.staleBefore instanceof Date) ||
    Number.isNaN(options.staleBefore.getTime())
  ) {
    throw new Error("Invalid newsletter recovery cutoff.");
  }

  const processing = await db.newsletterWelcomeEvent.updateMany({
    where: {
      status: "PROCESSING",
      claimedAt: {
        lt: options.staleBefore,
      },
    },
    data: {
      status: "UNKNOWN",
      claimToken: null,
      claimedAt: null,
      nextAttemptAt: null,
      lastError:
        "Processing claim expired; manual reconciliation required.",
    },
  });

  const submitting = await db.newsletterWelcomeEvent.updateMany({
    where: {
      status: "SUBMITTING",
      claimedAt: {
        lt: options.staleBefore,
      },
    },
    data: {
      status: "UNKNOWN",
      claimToken: null,
      claimedAt: null,
      nextAttemptAt: null,
      lastError:
        "Submission claim expired; provider outcome requires reconciliation.",
    },
  });

  return {
    processingMarkedUnknown: processing.count,
    submittingMarkedUnknown: submitting.count,
  };
}