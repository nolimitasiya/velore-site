import "server-only";

import type { PrismaClient } from "@prisma/client";

type CompletionDatabase = Pick<PrismaClient, "newsletterWelcomeEvent">;

export type NewsletterWelcomeCompletion =
  | { status: "SENT"; providerMessageId: string }
  | { status: "UNKNOWN"; reason: string };

export async function completeNewsletterWelcomeEvent(
  db: CompletionDatabase,
  eventId: string,
  claimToken: string,
  outcome: NewsletterWelcomeCompletion
): Promise<boolean> {
  const updated = await db.newsletterWelcomeEvent.updateMany({
    where: {
      id: eventId,
      status: "SUBMITTING",
      claimToken,
    },
    data:
      outcome.status === "SENT"
        ? {
            status: "SENT",
            submittedAt: new Date(),
            providerMessageId: outcome.providerMessageId,
            claimToken: null,
            claimedAt: null,
            nextAttemptAt: null,
            lastError: null,
          }
        : {
            status: "UNKNOWN",
            claimToken: null,
            claimedAt: null,
            nextAttemptAt: null,
            lastError: outcome.reason,
          },
  });

  return updated.count === 1;
}