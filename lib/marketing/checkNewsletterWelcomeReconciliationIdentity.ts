export type NewsletterWelcomeReconciliationIdentity = {
  id: string;
  eventKey: string;
  subscriberId: string;
  subscriptionGeneration: number;
  status: string;
  subscriber: {
    id: string;
    email: string;
    subscriptionGeneration: number;
    status: string;
    confirmedAt: Date | null;
    unsubscribedAt: Date | null;
  } | null;
};

export type NewsletterWelcomeMatchedIdentity = {
  outcome: "MATCHED";
  eventId: string;
  eventKey: string;
  subscriberId: string;
  subscriptionGeneration: number;
  recipient: string;
  providerMessageId: string;
};

function validString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function checkNewsletterWelcomeReconciliationIdentity(
  event: NewsletterWelcomeReconciliationIdentity | null,
  assessment: NewsletterWelcomeMatchedIdentity
): boolean {
  if (!event || !event.subscriber) return false;

  if (event.status !== "UNKNOWN") return false;

  if (event.subscriber.status !== "subscribed") return false;

  if (
    !(event.subscriber.confirmedAt instanceof Date) ||
    !Number.isFinite(event.subscriber.confirmedAt.getTime()) ||
    event.subscriber.unsubscribedAt !== null
  ) {
    return false;
  }

  if (
    !Number.isSafeInteger(event.subscriptionGeneration) ||
    event.subscriptionGeneration < 1
  ) {
    return false;
  }

  if (
    !validString(event.id) ||
    !validString(event.subscriberId) ||
    !validString(event.eventKey) ||
    !validString(event.subscriber.email)
  ) {
    return false;
  }

  if (
    !validString(assessment.eventId) ||
    !validString(assessment.eventKey) ||
    !validString(assessment.subscriberId) ||
    !validString(assessment.recipient) ||
    !validString(assessment.providerMessageId)
  ) {
    return false;
  }

  const expectedEventKey =
    `newsletter-welcome:${event.subscriberId}:${event.subscriptionGeneration}`;

  return (
    assessment.outcome === "MATCHED" &&
    event.id === assessment.eventId &&
    event.eventKey === expectedEventKey &&
    event.eventKey === assessment.eventKey &&
    event.subscriberId === assessment.subscriberId &&
    event.subscriber.id === event.subscriberId &&
    event.subscriptionGeneration === assessment.subscriptionGeneration &&
    event.subscriber.subscriptionGeneration === event.subscriptionGeneration &&
    event.subscriber.email.trim().toLowerCase() ===
      assessment.recipient.trim().toLowerCase()
  );
}
