import "server-only";

import { prisma } from "@/lib/prisma";

import {
  FEEDBACK_EMAIL_LEASE_MS,
  FEEDBACK_EMAIL_MAX_ATTEMPTS,
} from "@/lib/feedback/feedbackEmailRetry";

export async function recoverFeedbackEmailClaims(): Promise<{
  adminRecovered: number;
  shopperRecovered: number;
}> {
  const now = new Date();

  const expiredBefore = new Date(
    now.getTime() - FEEDBACK_EMAIL_LEASE_MS
  );

  const [admin, shopper] = await Promise.all([
    prisma.feedbackSubmission.updateMany({
      where: {
        adminEmailStatus: "PROCESSING",
        adminEmailAttempts: {
          gte: FEEDBACK_EMAIL_MAX_ATTEMPTS,
        },
        adminEmailClaimedAt: {
          lte: expiredBefore,
        },
      },
      data: {
        adminEmailStatus: "FAILED",
        adminEmailClaimedAt: null,
        adminEmailNextAttemptAt: null,
      },
    }),

    prisma.feedbackSubmission.updateMany({
      where: {
        shopperEmailStatus: "PROCESSING",
        shopperEmailAttempts: {
          gte: FEEDBACK_EMAIL_MAX_ATTEMPTS,
        },
        shopperEmailClaimedAt: {
          lte: expiredBefore,
        },
      },
      data: {
        shopperEmailStatus: "FAILED",
        shopperEmailClaimedAt: null,
        shopperEmailNextAttemptAt: null,
      },
    }),
  ]);

  return {
    adminRecovered: admin.count,
    shopperRecovered: shopper.count,
  };
}