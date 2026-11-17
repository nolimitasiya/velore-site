export type NewsletterWelcomeEvidenceOutcome =
  | "ACCEPTED"
  | "NOT_ACCEPTED"
  | "UNCERTAIN"
  | "CONFLICTING";

export type NewsletterWelcomeReconciliationFormInput = {
  eventId: string;
  evidenceReference: string;
  reason: string;
  outcome: NewsletterWelcomeEvidenceOutcome;
  providerMessageId: string;
};

export type NewsletterWelcomeReconciliationPayload = {
  eventId: string;
  evidenceReference: string;
  reason: string;
  evidence:
    | {
        outcome: "ACCEPTED";
        providerMessageId: string;
      }
    | {
        outcome: "NOT_ACCEPTED" | "UNCERTAIN" | "CONFLICTING";
      };
};

export type NewsletterWelcomeReconciliationValidationResult =
  | {
      ok: true;
      payload: NewsletterWelcomeReconciliationPayload;
    }
  | {
      ok: false;
      error: string;
    };

function validText(value: unknown, maximum: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= maximum
  );
}

export function validateNewsletterWelcomeReconciliationForm(
  input: NewsletterWelcomeReconciliationFormInput
): NewsletterWelcomeReconciliationValidationResult {
  if (!validText(input.eventId, 100)) {
    return {
      ok: false,
      error: "A valid event ID is required.",
    };
  }

  if (!validText(input.evidenceReference, 500)) {
    return {
      ok: false,
      error: "An evidence reference is required (maximum 500 characters).",
    };
  }

  if (!validText(input.reason, 2000)) {
    return {
      ok: false,
      error: "An explanation is required (maximum 2,000 characters).",
    };
  }

  const common = {
    eventId: input.eventId.trim(),
    evidenceReference: input.evidenceReference.trim(),
    reason: input.reason.trim(),
  };

  switch (input.outcome) {
    case "ACCEPTED": {
      if (!validText(input.providerMessageId, 500)) {
        return {
          ok: false,
          error:
            "Provider acceptance requires a verified provider message ID.",
        };
      }

      return {
        ok: true,
        payload: {
          ...common,
          evidence: {
            outcome: "ACCEPTED",
            providerMessageId: input.providerMessageId.trim(),
          },
        },
      };
    }

    case "NOT_ACCEPTED":
    case "UNCERTAIN":
    case "CONFLICTING":
      return {
        ok: true,
        payload: {
          ...common,
          evidence: {
            outcome: input.outcome,
          },
        },
      };

    default:
      return {
        ok: false,
        error: "Select a valid provider evidence outcome.",
      };
  }
}