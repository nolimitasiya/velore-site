import "server-only";

import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

export const NEWSLETTER_WELCOME_MAX_ATTEMPTS = 5;

export type ClaimedNewsletterWelcomeEvent = {
  id: string;
  subscriberId: string;
  subscriptionGeneration: number;
  eventKey: string;
  claimToken: string;
  attemptCount: number;
};

type ClaimDatabase = Pick<PrismaClient, "$transaction">;

/**
 * Claims one eligible newsletter welcome event.
 *
 * This function does not submit email.
 *
 * Provider submission must remain disabled until consent
 * validation, submission transitions, recovery and
 * concurrency tests have been completed.
 */
export async function claimNewsletterWelcomeEvent(
  db: ClaimDatabase
): Promise<ClaimedNewsletterWelcomeEvent | null> {
  const claimToken = randomUUID();

  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{
        id: string;
        subscriberId: string;
        subscriptionGeneration: number;
        eventKey: string;
        attemptCount: number;
      }>
    >`
      SELECT
        event."id",
        event."subscriberId",
        event."subscriptionGeneration",
        event."eventKey",
        event."attemptCount"
      FROM "NewsletterWelcomeEvent" AS event
      WHERE
        event."claimToken" IS NULL
        AND event."attemptCount" < ${NEWSLETTER_WELCOME_MAX_ATTEMPTS}
        AND (
          event."status" = 'PENDING'::"NewsletterWelcomeEventStatus"
          OR (
            event."status" = 'FAILED'::"NewsletterWelcomeEventStatus"
            AND event."nextAttemptAt" IS NOT NULL
            AND event."nextAttemptAt" <= NOW()
          )
        )
      ORDER BY event."createdAt" ASC, event."id" ASC
      FOR UPDATE OF event SKIP LOCKED
      LIMIT 1
    `;

    const row = rows[0];

    if (!row) {
      return null;
    }

    const claimedAt = new Date();

    const updated = await tx.newsletterWelcomeEvent.updateMany({
      where: {
        id: row.id,
        claimToken: null,
        attemptCount: {
          lt: NEWSLETTER_WELCOME_MAX_ATTEMPTS,
        },
        OR: [
          { status: "PENDING" },
          {
            status: "FAILED",
            nextAttemptAt: {
              not: null,
              lte: claimedAt,
            },
          },
        ],
      },
      data: {
        status: "PROCESSING",
        claimToken,
        claimedAt,
        attemptCount: {
          increment: 1,
        },
        nextAttemptAt: null,
      },
    });

    if (updated.count !== 1) {
      return null;
    }

    return {
      ...row,
      claimToken,
      attemptCount: row.attemptCount + 1,
    };
  });
}