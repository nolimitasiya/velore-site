import { describe, expect, it } from "vitest";

import {
  verifyNewsletterWelcomeProviderEvidence,
  type NewsletterWelcomeExpectedEvidence,
  type NewsletterWelcomeProviderRecord,
} from "./verifyNewsletterWelcomeProviderEvidence";

const expected: NewsletterWelcomeExpectedEvidence = {
  eventKey: "newsletter-welcome:subscriber-123:2",
  recipient: "shopper@example.com",
  sender: "Veilora Club <hello@veilora.example>",
  subject: "Welcome to Veilora Club ✨",
};

const provider: NewsletterWelcomeProviderRecord = {
  id: "provider-message-123",
  to: ["shopper@example.com"],
  from: "Veilora Club <hello@veilora.example>",
  subject: "Welcome to Veilora Club ✨",
  tags: [
    {
      name: "veilora_newsletter_event",
      value: "newsletter-welcome:subscriber-123:2",
    },
  ],
};

describe("verifyNewsletterWelcomeProviderEvidence", () => {
  it("matches correctly correlated provider evidence", () => {
    expect(
      verifyNewsletterWelcomeProviderEvidence(expected, provider)
    ).toEqual({
      outcome: "MATCHED",
      providerMessageId: "provider-message-123",
    });
  });

  it("does not match historical emails without event tags", () => {
    expect(
      verifyNewsletterWelcomeProviderEvidence(expected, {
        ...provider,
        tags: undefined,
      })
    ).toEqual({
      outcome: "INCONCLUSIVE",
      reason: "MISSING_EVENT_IDENTITY",
    });
  });

  it("rejects missing provider message IDs as inconclusive", () => {
    expect(
      verifyNewsletterWelcomeProviderEvidence(expected, {
        ...provider,
        id: "",
      })
    ).toEqual({
      outcome: "INCONCLUSIVE",
      reason: "MISSING_PROVIDER_ID",
    });
  });

  it("rejects missing expected event identity as inconclusive", () => {
    expect(
      verifyNewsletterWelcomeProviderEvidence(
        { ...expected, eventKey: "" },
        provider
      )
    ).toEqual({
      outcome: "INCONCLUSIVE",
      reason: "INVALID_EXPECTED_EVIDENCE",
    });
  });

  it("detects recipient mismatches", () => {
    expect(
      verifyNewsletterWelcomeProviderEvidence(expected, {
        ...provider,
        to: ["different@example.com"],
      })
    ).toEqual({
      outcome: "MISMATCH",
      reason: "RECIPIENT_MISMATCH",
    });
  });

  it("detects sender mismatches", () => {
    expect(
      verifyNewsletterWelcomeProviderEvidence(expected, {
        ...provider,
        from: "Unknown <other@example.com>",
      })
    ).toEqual({
      outcome: "MISMATCH",
      reason: "SENDER_MISMATCH",
    });
  });

  it("detects subject mismatches", () => {
    expect(
      verifyNewsletterWelcomeProviderEvidence(expected, {
        ...provider,
        subject: "Different subject",
      })
    ).toEqual({
      outcome: "MISMATCH",
      reason: "SUBJECT_MISMATCH",
    });
  });

  it("detects incorrect event identity tags", () => {
    expect(
      verifyNewsletterWelcomeProviderEvidence(expected, {
        ...provider,
        tags: [
          {
            name: "veilora_newsletter_event",
            value: "newsletter-welcome:subscriber-123:1",
          },
        ],
      })
    ).toEqual({
      outcome: "MISMATCH",
      reason: "EVENT_IDENTITY_MISMATCH",
    });
  });

  it("rejects ambiguous duplicate event identity tags", () => {
    expect(
      verifyNewsletterWelcomeProviderEvidence(expected, {
        ...provider,
        tags: [
          {
            name: "veilora_newsletter_event",
            value: expected.eventKey,
          },
          {
            name: "veilora_newsletter_event",
            value: expected.eventKey,
          },
        ],
      })
    ).toEqual({
      outcome: "MISMATCH",
      reason: "AMBIGUOUS_EVENT_IDENTITY",
    });
  });

  it("normalises email address casing", () => {
    expect(
      verifyNewsletterWelcomeProviderEvidence(
        {
          ...expected,
          recipient: "SHOPPER@EXAMPLE.COM",
          sender: "VEILORA CLUB <HELLO@VEILORA.EXAMPLE>",
        },
        provider
      )
    ).toEqual({
      outcome: "MATCHED",
      providerMessageId: "provider-message-123",
    });
  });

  it("detects a different subscription generation", () => {
    expect(
      verifyNewsletterWelcomeProviderEvidence(
        {
          ...expected,
          eventKey: "newsletter-welcome:subscriber-123:3",
        },
        provider
      )
    ).toEqual({
      outcome: "MISMATCH",
      reason: "EVENT_IDENTITY_MISMATCH",
    });
  });

  it("rejects multiple recipients", () => {
    expect(
      verifyNewsletterWelcomeProviderEvidence(expected, {
        ...provider,
        to: [
          "shopper@example.com",
          "another@example.com",
        ],
      })
    ).toEqual({
      outcome: "MISMATCH",
      reason: "RECIPIENT_MISMATCH",
    });
  });
});