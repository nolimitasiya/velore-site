export type NewsletterWelcomeExpectedEvidence = {
  eventKey: string;
  recipient: string;
  sender: string;
  subject: string;
};

export type NewsletterWelcomeProviderRecord = {
  id: string;
  to: string[];
  from: string;
  subject: string;
  tags?: Array<{
    name: string;
    value: string;
  }>;
};

export type NewsletterWelcomeEvidenceVerification =
  | {
      outcome: "MATCHED";
      providerMessageId: string;
    }
  | {
      outcome: "INCONCLUSIVE";
      reason:
        | "MISSING_EVENT_IDENTITY"
        | "MISSING_PROVIDER_ID"
        | "INVALID_EXPECTED_EVIDENCE";
    }
  | {
      outcome: "MISMATCH";
      reason:
        | "RECIPIENT_MISMATCH"
        | "SENDER_MISMATCH"
        | "SUBJECT_MISMATCH"
        | "EVENT_IDENTITY_MISMATCH"
        | "AMBIGUOUS_EVENT_IDENTITY";
    };

const EVENT_TAG_NAME = "veilora_newsletter_event";

function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function verifyNewsletterWelcomeProviderEvidence(
  expected: NewsletterWelcomeExpectedEvidence,
  provider: NewsletterWelcomeProviderRecord
): NewsletterWelcomeEvidenceVerification {
  if (
    !expected.eventKey?.trim() ||
    !expected.recipient?.trim() ||
    !expected.sender?.trim() ||
    !expected.subject?.trim()
  ) {
    return {
      outcome: "INCONCLUSIVE",
      reason: "INVALID_EXPECTED_EVIDENCE",
    };
  }

  if (!provider.id?.trim()) {
    return {
      outcome: "INCONCLUSIVE",
      reason: "MISSING_PROVIDER_ID",
    };
  }

  if (
    !Array.isArray(provider.to) ||
    provider.to.length !== 1 ||
    typeof provider.to[0] !== "string" ||
    normaliseEmail(provider.to[0]) !== normaliseEmail(expected.recipient)
  ) {
    return {
      outcome: "MISMATCH",
      reason: "RECIPIENT_MISMATCH",
    };
  }

  if (normaliseEmail(provider.from) !== normaliseEmail(expected.sender)) {
    return {
      outcome: "MISMATCH",
      reason: "SENDER_MISMATCH",
    };
  }

  if (provider.subject !== expected.subject) {
    return {
      outcome: "MISMATCH",
      reason: "SUBJECT_MISMATCH",
    };
  }

  if (
    provider.tags !== undefined &&
    provider.tags !== null &&
    (!Array.isArray(provider.tags) ||
      !provider.tags.every(
        (tag) =>
          tag !== null &&
          typeof tag === "object" &&
          typeof tag.name === "string" &&
          typeof tag.value === "string"
      ))
  ) {
    return {
      outcome: "INCONCLUSIVE",
      reason: "MISSING_EVENT_IDENTITY",
    };
  }

  const identityTags = (provider.tags ?? []).filter(
    (tag) => tag.name === EVENT_TAG_NAME
  );

  if (identityTags.length === 0) {
    return {
      outcome: "INCONCLUSIVE",
      reason: "MISSING_EVENT_IDENTITY",
    };
  }

  if (identityTags.length !== 1) {
    return {
      outcome: "MISMATCH",
      reason: "AMBIGUOUS_EVENT_IDENTITY",
    };
  }

  if (identityTags[0].value !== expected.eventKey) {
    return {
      outcome: "MISMATCH",
      reason: "EVENT_IDENTITY_MISMATCH",
    };
  }

  return {
    outcome: "MATCHED",
    providerMessageId: provider.id,
  };
}