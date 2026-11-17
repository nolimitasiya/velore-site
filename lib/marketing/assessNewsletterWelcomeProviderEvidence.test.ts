import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  getNewsletterWelcomeProviderEmail: vi.fn(),
}));

vi.mock("@/lib/resend/client", () => ({
  FROM_MARKETING: "Veilora Club <marketing@example.com>",
}));

vi.mock("./getNewsletterWelcomeProviderEmail", () => ({
  getNewsletterWelcomeProviderEmail:
    mocks.getNewsletterWelcomeProviderEmail,
}));

import { assessNewsletterWelcomeProviderEvidence } from "./assessNewsletterWelcomeProviderEvidence";

const event = {
  id: "event-1",
  eventKey: "newsletter-welcome:subscriber-1:2",
  subscriberId: "subscriber-1",
  subscriptionGeneration: 2,
  status: "UNKNOWN",
  subscriber: {
    id: "subscriber-1",
    email: "shopper@example.com",
    status: "subscribed",
    subscriptionGeneration: 2,
    confirmedAt: new Date("2026-11-15T10:00:00.000Z"),
    unsubscribedAt: null,
  },
};

const provider = {
  id: "provider-1",
  to: ["shopper@example.com"],
  from: "Veilora Club <marketing@example.com>",
  subject: "Welcome to Veilora Club ✨",
  tags: [
    {
      name: "veilora_newsletter_event",
      value: event.eventKey,
    },
  ],
};

const db = {
  newsletterWelcomeEvent: {
    findUnique: mocks.findUnique,
  },
} as unknown as Parameters<
  typeof assessNewsletterWelcomeProviderEvidence
>[0];

function assess(
  eventId = "event-1",
  providerMessageId = "provider-1"
) {
  return assessNewsletterWelcomeProviderEvidence(db, {
    eventId,
    providerMessageId,
  });
}

describe("assessNewsletterWelcomeProviderEvidence", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mocks.findUnique.mockResolvedValue(structuredClone(event));

    mocks.getNewsletterWelcomeProviderEmail.mockResolvedValue({
      status: "FOUND",
      record: structuredClone(provider),
      createdAt: "2026-11-15T10:00:00.000Z",
      lastEvent: "delivered",
    });
  });

  it("matches independently verified event evidence", async () => {
    await expect(assess()).resolves.toEqual({
      outcome: "MATCHED",
      eventId: event.id,
      eventKey: event.eventKey,
      subscriberId: event.subscriberId,
      subscriptionGeneration: event.subscriptionGeneration,
      recipient: event.subscriber.email,
      providerMessageId: provider.id,
    });

    expect(mocks.findUnique).toHaveBeenCalledOnce();
    expect(mocks.getNewsletterWelcomeProviderEmail).toHaveBeenCalledWith(
      "provider-1"
    );
  });

  it.each(["", " ", "x".repeat(101)])(
    "rejects invalid event ID %j",
    async (eventId) => {
      await expect(assess(eventId)).resolves.toEqual({
        outcome: "INCONCLUSIVE",
        reason: "INVALID_EVENT_ID",
      });

      expect(mocks.findUnique).not.toHaveBeenCalled();
      expect(mocks.getNewsletterWelcomeProviderEmail).not.toHaveBeenCalled();
    }
  );

  it.each(["", " ", "bad id", "x".repeat(501)])(
    "rejects invalid provider ID %j",
    async (providerId) => {
      await expect(assess("event-1", providerId)).resolves.toEqual({
        outcome: "INCONCLUSIVE",
        reason: "INVALID_PROVIDER_ID",
      });

      expect(mocks.findUnique).not.toHaveBeenCalled();
      expect(mocks.getNewsletterWelcomeProviderEmail).not.toHaveBeenCalled();
    }
  );

  it("does not query the provider when the event is missing", async () => {
    mocks.findUnique.mockResolvedValue(null);

    await expect(assess()).resolves.toEqual({
      outcome: "INCONCLUSIVE",
      reason: "EVENT_NOT_FOUND",
    });

    expect(mocks.getNewsletterWelcomeProviderEmail).not.toHaveBeenCalled();
  });

  it("does not query the provider when the event is no longer UNKNOWN", async () => {
    mocks.findUnique.mockResolvedValue({
      ...event,
      status: "SENT",
    });

    await expect(assess()).resolves.toEqual({
      outcome: "INCONCLUSIVE",
      reason: "EVENT_NOT_UNKNOWN",
    });

    expect(mocks.getNewsletterWelcomeProviderEmail).not.toHaveBeenCalled();
  });

  it("rejects inconsistent event identity", async () => {
    mocks.findUnique.mockResolvedValue({
      ...event,
      eventKey: "incorrect-event-key",
    });

    await expect(assess()).resolves.toEqual({
      outcome: "INCONCLUSIVE",
      reason: "INVALID_EVENT_IDENTITY",
    });

    expect(mocks.getNewsletterWelcomeProviderEmail).not.toHaveBeenCalled();
  });

  it("rejects a mismatched subscriber identity", async () => {
    mocks.findUnique.mockResolvedValue({
      ...event,
      subscriber: {
        id: "different-subscriber",
        email: "shopper@example.com",
      },
    });

    await expect(assess()).resolves.toEqual({
      outcome: "INCONCLUSIVE",
      reason: "INVALID_EVENT_IDENTITY",
    });
  });

  it.each([
    ["unsubscribed status", { status: "unsubscribed" }],
    ["pending status", { status: "pending" }],
    ["changed generation", { subscriptionGeneration: 3 }],
    ["missing confirmation", { confirmedAt: null }],
    ["invalid confirmation", { confirmedAt: new Date("invalid") }],
    ["unsubscribe timestamp", {
      unsubscribedAt: new Date("2026-11-15T11:00:00.000Z")
    }],
  ])("rejects %s before provider lookup", async (_name, changes) => {
    mocks.findUnique.mockResolvedValue({
      ...event,
      subscriber: {
        ...event.subscriber,
        ...changes,
      },
    });

    await expect(assess()).resolves.toEqual({
      outcome: "INCONCLUSIVE",
      reason: "INVALID_EVENT_IDENTITY",
    });

    expect(mocks.getNewsletterWelcomeProviderEmail).not.toHaveBeenCalled();
  });

  it("treats provider unavailability as inconclusive", async () => {
    mocks.getNewsletterWelcomeProviderEmail.mockResolvedValue({
      status: "UNAVAILABLE",
      reason: "PROVIDER_ERROR",
    });

    await expect(assess()).resolves.toEqual({
      outcome: "INCONCLUSIVE",
      reason: "PROVIDER_UNAVAILABLE",
    });
  });

  it("keeps historical emails without event tags inconclusive", async () => {
    mocks.getNewsletterWelcomeProviderEmail.mockResolvedValue({
      status: "FOUND",
      record: {
        ...provider,
        tags: [],
      },
      createdAt: "2026-11-15T10:00:00.000Z",
      lastEvent: "delivered",
    });

    await expect(assess()).resolves.toEqual({
      outcome: "INCONCLUSIVE",
      reason: "PROVIDER_EVIDENCE_INCONCLUSIVE",
    });
  });

  it.each([
    [
      "recipient",
      { to: ["another@example.com"] },
      "RECIPIENT_MISMATCH",
    ],
    [
      "sender",
      { from: "Other <other@example.com>" },
      "SENDER_MISMATCH",
    ],
    [
      "subject",
      { subject: "Different subject" },
      "SUBJECT_MISMATCH",
    ],
    [
      "event identity",
      {
        tags: [
          {
            name: "veilora_newsletter_event",
            value: "another-event",
          },
        ],
      },
      "EVENT_IDENTITY_MISMATCH",
    ],
  ] as const)(
    "detects %s mismatch",
    async (_name, changes, reason) => {
      mocks.getNewsletterWelcomeProviderEmail.mockResolvedValue({
        status: "FOUND",
        record: {
          ...provider,
          ...changes,
        },
        createdAt: "2026-11-15T10:00:00.000Z",
        lastEvent: "delivered",
      });

      await expect(assess()).resolves.toEqual({
        outcome: "MISMATCH",
        reason,
      });
    }
  );
});