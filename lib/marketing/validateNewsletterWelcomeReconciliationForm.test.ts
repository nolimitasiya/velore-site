import { describe, expect, it } from "vitest";

import {
  validateNewsletterWelcomeReconciliationForm,
  type NewsletterWelcomeReconciliationFormInput,
} from "./validateNewsletterWelcomeReconciliationForm";

const validInput: NewsletterWelcomeReconciliationFormInput = {
  eventId: "event-123",
  evidenceReference: "Resend dashboard record",
  reason: "Provider evidence reviewed manually.",
  outcome: "ACCEPTED",
  providerMessageId: "provider-message-123",
};

describe("newsletter welcome reconciliation form validation", () => {
  it("accepts complete ACCEPTED evidence", () => {
    const result = validateNewsletterWelcomeReconciliationForm(validInput);

    expect(result).toEqual({
      ok: true,
      payload: {
        eventId: "event-123",
        evidenceReference: "Resend dashboard record",
        reason: "Provider evidence reviewed manually.",
        evidence: {
          outcome: "ACCEPTED",
          providerMessageId: "provider-message-123",
        },
      },
    });
  });

  it("rejects ACCEPTED evidence without a provider message ID", () => {
    const result = validateNewsletterWelcomeReconciliationForm({
      ...validInput,
      providerMessageId: " ",
    });

    expect(result.ok).toBe(false);
  });

  it("accepts NOT_ACCEPTED evidence without a provider message ID", () => {
    const result = validateNewsletterWelcomeReconciliationForm({
      ...validInput,
      outcome: "NOT_ACCEPTED",
      providerMessageId: "",
    });

    expect(result).toMatchObject({
      ok: true,
      payload: {
        evidence: { outcome: "NOT_ACCEPTED" },
      },
    });
  });

  it("accepts UNCERTAIN evidence without changing the outcome", () => {
    const result = validateNewsletterWelcomeReconciliationForm({
      ...validInput,
      outcome: "UNCERTAIN",
      providerMessageId: "",
    });

    expect(result).toMatchObject({
      ok: true,
      payload: {
        evidence: { outcome: "UNCERTAIN" },
      },
    });
  });

  it("accepts CONFLICTING evidence without changing the outcome", () => {
    const result = validateNewsletterWelcomeReconciliationForm({
      ...validInput,
      outcome: "CONFLICTING",
      providerMessageId: "",
    });

    expect(result).toMatchObject({
      ok: true,
      payload: {
        evidence: { outcome: "CONFLICTING" },
      },
    });
  });

  it("rejects a missing event ID", () => {
    const result = validateNewsletterWelcomeReconciliationForm({
      ...validInput,
      eventId: " ",
    });

    expect(result.ok).toBe(false);
  });

  it("rejects a missing evidence reference", () => {
    const result = validateNewsletterWelcomeReconciliationForm({
      ...validInput,
      evidenceReference: " ",
    });

    expect(result.ok).toBe(false);
  });

  it("rejects a missing explanation", () => {
    const result = validateNewsletterWelcomeReconciliationForm({
      ...validInput,
      reason: " ",
    });

    expect(result.ok).toBe(false);
  });

  it("rejects evidence references exceeding 500 characters", () => {
    const result = validateNewsletterWelcomeReconciliationForm({
      ...validInput,
      evidenceReference: "x".repeat(501),
    });

    expect(result.ok).toBe(false);
  });

  it("rejects explanations exceeding 2,000 characters", () => {
    const result = validateNewsletterWelcomeReconciliationForm({
      ...validInput,
      reason: "x".repeat(2001),
    });

    expect(result.ok).toBe(false);
  });

  it("rejects an invalid evidence outcome", () => {
    const result = validateNewsletterWelcomeReconciliationForm({
      ...validInput,
      outcome: "INVALID" as NewsletterWelcomeReconciliationFormInput["outcome"],
    });

    expect(result.ok).toBe(false);
  });

  it("trims submitted values", () => {
    const result = validateNewsletterWelcomeReconciliationForm({
      eventId: " event-123 ",
      evidenceReference: " dashboard-record ",
      reason: " reviewed ",
      outcome: "ACCEPTED",
      providerMessageId: " provider-123 ",
    });

    expect(result).toEqual({
      ok: true,
      payload: {
        eventId: "event-123",
        evidenceReference: "dashboard-record",
        reason: "reviewed",
        evidence: {
          outcome: "ACCEPTED",
          providerMessageId: "provider-123",
        },
      },
    });
  });
});