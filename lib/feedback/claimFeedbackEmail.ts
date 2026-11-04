import "server-only";

import { prisma } from "@/lib/prisma";
import {
  FEEDBACK_EMAIL_LEASE_MS,
  FEEDBACK_EMAIL_MAX_ATTEMPTS,
} from "@/lib/feedback/feedbackEmailRetry";

export type FeedbackEmailRecipient = "ADMIN" | "SHOPPER";

export type FeedbackEmailClaim = {
  feedbackId: string;
  recipient: FeedbackEmailRecipient;
  attempts: number;
  claimedAt: Date;
};

type ClaimResult = FeedbackEmailClaim | null;

export async function claimFeedbackEmail(
  feedbackId: string,
  recipient: FeedbackEmailRecipient
): Promise<ClaimResult> {
    // Temporary launch safeguard:
  // Registration does not yet verify email ownership.
  // Do not send shopper acknowledgements, including
  // for historical pending feedback records.
  if (recipient === "SHOPPER") {
    return null;
  }
  const now = new Date();
  const leaseExpiredBefore = new Date(
    now.getTime() - FEEDBACK_EMAIL_LEASE_MS
  );

  const isAdmin = recipient === "ADMIN";

  const statusField = isAdmin
    ? "adminEmailStatus"
    : "shopperEmailStatus";

  const attemptsField = isAdmin
    ? "adminEmailAttempts"
    : "shopperEmailAttempts";

  const claimedAtField = isAdmin
    ? "adminEmailClaimedAt"
    : "shopperEmailClaimedAt";

  const nextAttemptField = isAdmin
    ? "adminEmailNextAttemptAt"
    : "shopperEmailNextAttemptAt";

  const result = await prisma.feedbackSubmission.updateMany({
    where: {
      id: feedbackId,

      [attemptsField]: {
        lt: FEEDBACK_EMAIL_MAX_ATTEMPTS,
      },

      OR: [
        {
          [statusField]: "PENDING",
          OR: [
            { [nextAttemptField]: null },
            { [nextAttemptField]: { lte: now } },
          ],
        },
        {
          [statusField]: "FAILED",
          [nextAttemptField]: {
            lte: now,
          },
        },
        {
            [statusField]: "PROCESSING",
            [claimedAtField]: {
              not: null,
              lte: leaseExpiredBefore,
             },
            },
      ],

...(isAdmin
  ? {}
  : {
      // Shopper acknowledgements are disabled until
      // verified email ownership is implemented.
      //
      // This also protects older pending submissions
      // created before the new submission safeguard.
      emailVerifiedBySession: true,
      contactEmail: {
        not: null,
      },
    }),
    },

    data: {
      [statusField]: "PROCESSING",
      [claimedAtField]: now,
      [attemptsField]: {
        increment: 1,
      },
      [nextAttemptField]: null,
    },
  });

  if (result.count !== 1) {
    return null;
  }

  const feedback = await prisma.feedbackSubmission.findUnique({
    where: {
      id: feedbackId,
    },
    select: {
      id: true,
      adminEmailAttempts: true,
      shopperEmailAttempts: true,
    },
  });

  if (!feedback) {
    throw new Error(
      "Feedback disappeared after its email was claimed."
    );
  }

 return {
  feedbackId: feedback.id,
  recipient,
  attempts: isAdmin
    ? feedback.adminEmailAttempts
    : feedback.shopperEmailAttempts,
  claimedAt: now,
};
}