import "server-only";

import { prisma } from "@/lib/prisma";

import type {
  FeedbackEmailClaim,
} from "@/lib/feedback/claimFeedbackEmail";

import {
  getFeedbackEmailRetryDecision,
} from "@/lib/feedback/feedbackEmailRetry";

type FeedbackEmailOutcome =
  | { status: "SENT" }
  | { status: "FAILED" };

export async function completeFeedbackEmail(
  claim: FeedbackEmailClaim,
  outcome: FeedbackEmailOutcome
): Promise<boolean> {
  const now = new Date();

  const isAdmin = claim.recipient === "ADMIN";

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

  const sentAtField = isAdmin
    ? "adminEmailSentAt"
    : "shopperEmailSentAt";

  const retryDecision =
    outcome.status === "FAILED"
      ? getFeedbackEmailRetryDecision(
          claim.attempts,
          now
        )
      : null;

  const result =
    await prisma.feedbackSubmission.updateMany({
      where: {
        id: claim.feedbackId,
        [statusField]: "PROCESSING",
        [attemptsField]: claim.attempts,
        [claimedAtField]: claim.claimedAt,
      },

      data: {
        [statusField]: outcome.status,
        [claimedAtField]: null,

        [nextAttemptField]:
          retryDecision?.nextAttemptAt ?? null,

        ...(outcome.status === "SENT"
          ? {
              [sentAtField]: now,
            }
          : {}),
      },
    });

  return result.count === 1;
}