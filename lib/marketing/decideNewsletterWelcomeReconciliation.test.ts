import { describe, expect, it } from "vitest";

import {
  decideNewsletterWelcomeReconciliation,
  type NewsletterWelcomeReconciliationInput,
} from "./decideNewsletterWelcomeReconciliation";

function input(
  overrides: Partial<NewsletterWelcomeReconciliationInput> = {}
): NewsletterWelcomeReconciliationInput {
  return {
    currentStatus: "UNKNOWN",
    adminId: "fictional-admin",
    evidenceReference: "fictional-provider-evidence",
    reason: "Provider outcome manually verified.",
    evidence: {
      outcome: "UNCERTAIN",
    },
    ...overrides,
  };
}

describe("newsletter welcome reconciliation decisions", () => {
  it("marks confirmed provider acceptance as SENT", () => {
    expect(
      decideNewsletterWelcomeReconciliation(
        input({
          evidence: {
            outcome: "ACCEPTED",
            providerMessageId: "fictional-provider-message-id",
          },
        })
      )
    ).toEqual({
      status: "SENT",
      providerMessageId: "fictional-provider-message-id",
    });
  });

  it("marks confirmed non-acceptance as CANCELLED", () => {
    expect(
      decideNewsletterWelcomeReconciliation(
        input({
          evidence: {
            outcome: "NOT_ACCEPTED",
          },
        })
      )
    ).toEqual({
      status: "CANCELLED",
      providerMessageId: null,
    });
  });

  it("keeps uncertain provider outcomes UNKNOWN", () => {
    expect(decideNewsletterWelcomeReconciliation(input())).toEqual({
      status: "UNKNOWN",
      providerMessageId: null,
    });
  });

  it("keeps conflicting evidence UNKNOWN", () => {
    expect(
      decideNewsletterWelcomeReconciliation(
        input({
          evidence: {
            outcome: "CONFLICTING",
          },
        })
      )
    ).toEqual({
      status: "UNKNOWN",
      providerMessageId: null,
    });
  });

  it("rejects reconciliation of non-UNKNOWN events", () => {
    for (const status of ["PENDING", "PROCESSING", "SUBMITTING", "SENT", "CANCELLED"]) {
      expect(() =>
        decideNewsletterWelcomeReconciliation(
          input({ currentStatus: status })
        )
      ).toThrow("Only UNKNOWN welcome events can be reconciled.");
    }
  });

  it("rejects missing administrator identity", () => {
    expect(() =>
      decideNewsletterWelcomeReconciliation(
        input({ adminId: " " })
      )
    ).toThrow("Invalid reconciliation administrator.");
  });

  it("rejects missing evidence reference", () => {
    expect(() =>
      decideNewsletterWelcomeReconciliation(
        input({ evidenceReference: " " })
      )
    ).toThrow("Invalid reconciliation evidence reference.");
  });

  it("rejects missing reason", () => {
    expect(() =>
      decideNewsletterWelcomeReconciliation(
        input({ reason: " " })
      )
    ).toThrow("Invalid reconciliation reason.");
  });

  it("rejects accepted evidence without a provider message ID", () => {
    expect(() =>
      decideNewsletterWelcomeReconciliation(
        input({
          evidence: {
            outcome: "ACCEPTED",
            providerMessageId: " ",
          },
        })
      )
    ).toThrow("Invalid reconciliation provider message ID.");
  });
});