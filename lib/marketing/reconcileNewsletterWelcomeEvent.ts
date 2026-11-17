import "server-only";

import type { PrismaClient } from "@prisma/client";

import { assessNewsletterWelcomeProviderEvidence } from "./assessNewsletterWelcomeProviderEvidence";
import { checkNewsletterWelcomeReconciliationIdentity } from "./checkNewsletterWelcomeReconciliationIdentity";

type ReconciliationDatabase = Pick<
  PrismaClient,
  "$transaction" | "newsletterWelcomeEvent"
>;

export type NewsletterWelcomeReconciliationRequest = {
  eventId: string;
  adminId: string;
  evidenceReference: string;
  reason: string;
  providerMessageId?: string;
  evidence?: unknown;
};

export type NewsletterWelcomeReconciliationResult =
  | { outcome: "RECONCILED"; status: "SENT" }
  | { outcome: "CONFLICT" };

function requireValue(value: string, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing reconciliation ${field}.`);
  }

  return value.trim();
}

function validProviderMessageId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= 500 &&
    !/\s/.test(value)
  );
}

export async function reconcileNewsletterWelcomeEvent(
  db: ReconciliationDatabase,
  request: NewsletterWelcomeReconciliationRequest
): Promise<NewsletterWelcomeReconciliationResult> {
  const eventId = requireValue(request.eventId, "event ID");
  const adminId = requireValue(request.adminId, "administrator");
  const evidenceReference = requireValue(
    request.evidenceReference,
    "evidence reference"
  );
  const reason = requireValue(request.reason, "reason");

  // Reject the legacy administrator-supplied evidence contract.
  if (request.evidence !== undefined) {
    return { outcome: "CONFLICT" };
  }

  if (!validProviderMessageId(request.providerMessageId)) {
    return { outcome: "CONFLICT" };
  }

  const providerMessageId = request.providerMessageId.trim();

  // Independent provider verification happens outside the transaction.
  const assessment = await assessNewsletterWelcomeProviderEvidence(db, {
    eventId,
    providerMessageId,
  });

  if (assessment.outcome !== "MATCHED") {
    return { outcome: "CONFLICT" };
  }

  return db.$transaction(async (tx) => {
    const lockedEvents = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "NewsletterWelcomeEvent"
      WHERE "id" = ${eventId}
      FOR UPDATE
    `;

    if (lockedEvents.length !== 1) {
      return { outcome: "CONFLICT" } as const;
    }

    const event = await tx.newsletterWelcomeEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        status: true,
        eventKey: true,
        subscriberId: true,
        subscriptionGeneration: true,
        providerMessageId: true,
      },
    });

    if (!event || event.status !== "UNKNOWN") {
      return { outcome: "CONFLICT" } as const;
    }

    if (
      event.providerMessageId !== null &&
      event.providerMessageId !== providerMessageId
    ) {
      return { outcome: "CONFLICT" } as const;
    }

    // Lock the subscriber before the final identity check.
    const lockedSubscribers = await tx.$queryRaw<
      Array<{
        id: string;
        email: string;
        subscriptionGeneration: number;
        status: string;
        confirmedAt: Date | null;
        unsubscribedAt: Date | null;
      }>
    >`
      SELECT
        "id",
        "email",
        "subscriptionGeneration",
        "status",
        "confirmedAt",
        "unsubscribedAt"
      FROM "NewsletterSubscriber"
      WHERE "id" = ${event.subscriberId}
      FOR UPDATE
    `;

    if (lockedSubscribers.length !== 1) {
      return { outcome: "CONFLICT" } as const;
    }

    const identityMatches =
      checkNewsletterWelcomeReconciliationIdentity(
        {
          id: event.id,
          status: event.status,
          eventKey: event.eventKey,
          subscriberId: event.subscriberId,
          subscriptionGeneration: event.subscriptionGeneration,
          subscriber: lockedSubscribers[0],
        },
        assessment
      );

    if (!identityMatches) {
      return { outcome: "CONFLICT" } as const;
    }

    const updated = await tx.newsletterWelcomeEvent.updateMany({
      where: {
        id: eventId,
        status: "UNKNOWN",
        providerMessageId: event.providerMessageId,
      },
      data: {
        status: "SENT",
        providerMessageId,
        submittedAt: new Date(),
        claimToken: null,
        claimedAt: null,
        nextAttemptAt: null,
        lastError: null,
      },
    });

    if (updated.count !== 1) {
      return { outcome: "CONFLICT" } as const;
    }

    await tx.newsletterWelcomeReconciliationAudit.create({
      data: {
        welcomeEventId: eventId,
        adminId,
        previousStatus: "UNKNOWN",
        resultingStatus: "SENT",
        evidenceOutcome: "MATCHED",
        evidenceReference,
        reason,
        providerMessageId,
      },
    });

    return {
      outcome: "RECONCILED",
      status: "SENT",
    } as const;
  });
}
