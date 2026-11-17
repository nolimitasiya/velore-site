export type NewsletterWelcomeProviderEvidence =
  | {
      outcome: "ACCEPTED";
      providerMessageId: string;
    }
  | {
      outcome: "NOT_ACCEPTED";
    }
  | {
      outcome: "UNCERTAIN";
    }
  | {
      outcome: "CONFLICTING";
    };

export type NewsletterWelcomeReconciliationInput = {
  currentStatus: string;
  adminId: string;
  evidenceReference: string;
  reason: string;
  evidence: NewsletterWelcomeProviderEvidence;
};

export type NewsletterWelcomeReconciliationDecision =
  | {
      status: "SENT";
      providerMessageId: string;
    }
  | {
      status: "CANCELLED";
      providerMessageId: null;
    }
  | {
      status: "UNKNOWN";
      providerMessageId: null;
    };

function requireNonEmpty(value: string, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid reconciliation ${field}.`);
  }

  return value.trim();
}

export function decideNewsletterWelcomeReconciliation(
  input: NewsletterWelcomeReconciliationInput
): NewsletterWelcomeReconciliationDecision {
  if (input.currentStatus !== "UNKNOWN") {
    throw new Error("Only UNKNOWN welcome events can be reconciled.");
  }

  requireNonEmpty(input.adminId, "administrator");
  requireNonEmpty(input.evidenceReference, "evidence reference");
  requireNonEmpty(input.reason, "reason");

  switch (input.evidence.outcome) {
    case "ACCEPTED":
      return {
        status: "SENT",
        providerMessageId: requireNonEmpty(
          input.evidence.providerMessageId,
          "provider message ID"
        ),
      };

    case "NOT_ACCEPTED":
      return {
        status: "CANCELLED",
        providerMessageId: null,
      };

    case "UNCERTAIN":
    case "CONFLICTING":
      return {
        status: "UNKNOWN",
        providerMessageId: null,
      };
  }
}