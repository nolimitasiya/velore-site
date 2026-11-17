import "server-only";

import type { PrismaClient } from "@prisma/client";

import { FROM_MARKETING } from "@/lib/resend/client";
import { getNewsletterWelcomeProviderEmail } from "./getNewsletterWelcomeProviderEmail";
import {
  verifyNewsletterWelcomeProviderEvidence,
  type NewsletterWelcomeEvidenceVerification,
} from "./verifyNewsletterWelcomeProviderEvidence";

type AssessmentDatabase = Pick<PrismaClient, "newsletterWelcomeEvent">;

export type NewsletterWelcomeProviderAssessment =
  | {
      outcome: "MATCHED";
      eventId: string;
      eventKey: string;
      subscriberId: string;
      subscriptionGeneration: number;
      recipient: string;
      providerMessageId: string;
    }
  | {
      outcome: "INCONCLUSIVE";
      reason:
        | "INVALID_EVENT_ID"
        | "INVALID_PROVIDER_ID"
        | "EVENT_NOT_FOUND"
        | "EVENT_NOT_UNKNOWN"
        | "INVALID_EVENT_IDENTITY"
        | "PROVIDER_UNAVAILABLE"
        | "PROVIDER_EVIDENCE_INCONCLUSIVE";
    }
  | {
      outcome: "MISMATCH";
      reason: Extract<
        NewsletterWelcomeEvidenceVerification,
        { outcome: "MISMATCH" }
      >["reason"];
    };

const EXPECTED_SUBJECT = "Welcome to Veilora Club ✨";

export async function assessNewsletterWelcomeProviderEvidence(
  db: AssessmentDatabase,
  input: {
    eventId: string;
    providerMessageId: string;
  }
): Promise<NewsletterWelcomeProviderAssessment> {
  const eventId = input.eventId?.trim();
  const providerMessageId = input.providerMessageId?.trim();

  if (!eventId || eventId.length > 100) {
    return {
      outcome: "INCONCLUSIVE",
      reason: "INVALID_EVENT_ID",
    };
  }

  if (
    !providerMessageId ||
    providerMessageId.length > 500 ||
    /\s/.test(providerMessageId)
  ) {
    return {
      outcome: "INCONCLUSIVE",
      reason: "INVALID_PROVIDER_ID",
    };
  }

  const event = await db.newsletterWelcomeEvent.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      eventKey: true,
      subscriberId: true,
      subscriptionGeneration: true,
      status: true,
      subscriber: {
        select: {
          id: true,
          email: true,
          status: true,
          subscriptionGeneration: true,
          confirmedAt: true,
          unsubscribedAt: true,
        },
      },
    },
  });

  if (!event) {
    return {
      outcome: "INCONCLUSIVE",
      reason: "EVENT_NOT_FOUND",
    };
  }

  if (event.status !== "UNKNOWN") {
    return {
      outcome: "INCONCLUSIVE",
      reason: "EVENT_NOT_UNKNOWN",
    };
  }

  const expectedEventKey =
    `newsletter-welcome:${event.subscriberId}:${event.subscriptionGeneration}`;

  if (
    !event.subscriber ||
    event.subscriber.id !== event.subscriberId ||
    event.eventKey !== expectedEventKey ||
    !event.subscriber.email?.trim() ||
    event.subscriber.status !== "subscribed" ||
    event.subscriber.subscriptionGeneration !== event.subscriptionGeneration ||
    !Number.isSafeInteger(event.subscriptionGeneration) ||
    event.subscriptionGeneration < 1 ||
    !(event.subscriber.confirmedAt instanceof Date) ||
    !Number.isFinite(event.subscriber.confirmedAt.getTime()) ||
    event.subscriber.unsubscribedAt !== null
  ) {
    return {
      outcome: "INCONCLUSIVE",
      reason: "INVALID_EVENT_IDENTITY",
    };
  }

  const lookup = await getNewsletterWelcomeProviderEmail(providerMessageId);

  if (lookup.status !== "FOUND") {
    return {
      outcome: "INCONCLUSIVE",
      reason: "PROVIDER_UNAVAILABLE",
    };
  }

  const verification = verifyNewsletterWelcomeProviderEvidence(
    {
      eventKey: event.eventKey,
      recipient: event.subscriber.email,
      sender: FROM_MARKETING,
      subject: EXPECTED_SUBJECT,
    },
    lookup.record
  );

  if (verification.outcome === "INCONCLUSIVE") {
    return {
      outcome: "INCONCLUSIVE",
      reason: "PROVIDER_EVIDENCE_INCONCLUSIVE",
    };
  }

  if (verification.outcome === "MISMATCH") {
    return verification;
  }

  return {
    outcome: "MATCHED",
    eventId: event.id,
    eventKey: event.eventKey,
    subscriberId: event.subscriberId,
    subscriptionGeneration: event.subscriptionGeneration,
    recipient: event.subscriber.email,
    providerMessageId: verification.providerMessageId,
  };
}