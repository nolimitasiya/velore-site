import { describe, expect, it } from "vitest";

import {
  checkNewsletterWelcomeReconciliationIdentity,
  type NewsletterWelcomeReconciliationIdentity,
  type NewsletterWelcomeMatchedIdentity,
} from "./checkNewsletterWelcomeReconciliationIdentity";

const event: NewsletterWelcomeReconciliationIdentity = {
  id: "event-1",
  eventKey: "newsletter-welcome:subscriber-1:2",
  subscriberId: "subscriber-1",
  subscriptionGeneration: 2,
  status: "UNKNOWN",
  subscriber: {
    id: "subscriber-1",
    email: "shopper@example.com",
    subscriptionGeneration: 2,
    status: "subscribed",
    confirmedAt: new Date("2026-11-15T10:00:00.000Z"),
    unsubscribedAt: null,
  },
};

const assessment: NewsletterWelcomeMatchedIdentity = {
  outcome: "MATCHED",
  eventId: "event-1",
  eventKey: "newsletter-welcome:subscriber-1:2",
  subscriberId: "subscriber-1",
  subscriptionGeneration: 2,
  recipient: "shopper@example.com",
  providerMessageId: "provider-1",
};

describe("checkNewsletterWelcomeReconciliationIdentity", () => {
  it("accepts matching identities", () => {
    expect(
      checkNewsletterWelcomeReconciliationIdentity(event, assessment)
    ).toBe(true);
  });

  it("rejects missing events", () => {
    expect(
      checkNewsletterWelcomeReconciliationIdentity(null, assessment)
    ).toBe(false);
  });

  it.each([
    ["event ID", { id: "other-event" }],
    ["event key", { eventKey: "wrong-key" }],
    ["subscriber ID", { subscriberId: "other-subscriber" }],
    ["generation", { subscriptionGeneration: 3 }],
    ["status", { status: "SENT" }],
  ])("rejects changed %s", (_name, changes) => {
    expect(
      checkNewsletterWelcomeReconciliationIdentity(
        { ...event, ...changes },
        assessment
      )
    ).toBe(false);
  });

  it.each([
    ["email", { email: "other@example.com" }],
    ["generation", { subscriptionGeneration: 3 }],
    ["status", { status: "unsubscribed" }],
    ["subscriber ID", { id: "other-subscriber" }],
  ])("rejects changed subscriber %s", (_name, changes) => {
    expect(
      checkNewsletterWelcomeReconciliationIdentity(
        {
          ...event,
          subscriber: {
            ...event.subscriber!,
            ...changes,
          },
        },
        assessment
      )
    ).toBe(false);
  });

  it.each([
    ["event ID", { eventId: "other-event" }],
    ["event key", { eventKey: "wrong-key" }],
    ["subscriber ID", { subscriberId: "other-subscriber" }],
    ["generation", { subscriptionGeneration: 3 }],
    ["recipient", { recipient: "other@example.com" }],
    ["provider ID", { providerMessageId: "" }],
  ])("rejects mismatched assessment %s", (_name, changes) => {
    expect(
      checkNewsletterWelcomeReconciliationIdentity(
        event,
        { ...assessment, ...changes }
      )
    ).toBe(false);
  });

  it("rejects missing subscriber", () => {
    expect(
      checkNewsletterWelcomeReconciliationIdentity(
        { ...event, subscriber: null },
        assessment
      )
    ).toBe(false);
  });

  it.each([
    ["missing confirmation", { confirmedAt: null }],
    ["invalid confirmation", { confirmedAt: new Date("invalid") }],
    ["unsubscribed timestamp", {
      unsubscribedAt: new Date("2026-11-15T11:00:00.000Z")
    }],
  ])("rejects %s", (_name, changes) => {
    expect(
      checkNewsletterWelcomeReconciliationIdentity(
        {
          ...event,
          subscriber: {
            ...event.subscriber!,
            ...changes,
          },
        },
        assessment
      )
    ).toBe(false);
  });

  it("accepts case-insensitive email matching", () => {
    expect(
      checkNewsletterWelcomeReconciliationIdentity(
        event,
        { ...assessment, recipient: "SHOPPER@example.com" }
      )
    ).toBe(true);
  });
});
