import "server-only";

import { prisma } from "@/lib/prisma";

import {
  FEEDBACK_EMAIL_LEASE_MS,
  FEEDBACK_EMAIL_MAX_ATTEMPTS,
} from "@/lib/feedback/feedbackEmailRetry";

import {
  processFeedbackEmail,
  type ProcessFeedbackEmailResult,
} from "@/lib/feedback/processFeedbackEmail";

import {
  recoverFeedbackEmailClaims,
} from "@/lib/feedback/recoverFeedbackEmailClaims";

const BATCH_SIZE = 3;

type DispatchSummary = {
  examined: number;
  sent: number;
  failed: number;
  skipped: number;
  stale: number;
  recovered: number;
};

export async function dispatchFeedbackEmails(): Promise<DispatchSummary> {
  const recovered = await recoverFeedbackEmailClaims();

  const now = new Date();

  const expiredBefore = new Date(
    now.getTime() - FEEDBACK_EMAIL_LEASE_MS
  );

  // Temporary launch policy:
  // Only Admin notifications are dispatched.
  // Shopper acknowledgements remain disabled until
  // verified email ownership is implemented.
  const eligible = await prisma.feedbackSubmission.findMany({
    where: {
      adminEmailAttempts: {
        lt: FEEDBACK_EMAIL_MAX_ATTEMPTS,
      },
      OR: [
        {
          adminEmailStatus: "PENDING",
          OR: [
            { adminEmailNextAttemptAt: null },
            { adminEmailNextAttemptAt: { lte: now } },
          ],
        },
        {
          adminEmailStatus: "FAILED",
          adminEmailNextAttemptAt: { lte: now },
        },
        {
          adminEmailStatus: "PROCESSING",
          adminEmailClaimedAt: {
            not: null,
            lte: expiredBefore,
          },
        },
      ],
    },

    select: {
      id: true,
    },

    orderBy: {
      createdAt: "asc",
    },

    take: BATCH_SIZE,
  });

  const summary: DispatchSummary = {
    examined: eligible.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    stale: 0,
    recovered:
      recovered.adminRecovered +
      recovered.shopperRecovered,
  };

  for (const feedback of eligible) {
    const result: ProcessFeedbackEmailResult =
      await processFeedbackEmail(feedback.id, "ADMIN");

    switch (result) {
      case "SENT":
        summary.sent++;
        break;
      case "FAILED":
        summary.failed++;
        break;
      case "SKIPPED":
        summary.skipped++;
        break;
      case "STALE":
        summary.stale++;
        break;
    }
  }

  return summary;
}