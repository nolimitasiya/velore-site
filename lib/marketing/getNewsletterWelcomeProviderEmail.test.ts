import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  configured: true,
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/resend/client", () => ({
  get resend() {
    return mocks.configured
      ? { emails: { get: mocks.get } }
      : null;
  },
}));

import { getNewsletterWelcomeProviderEmail } from "./getNewsletterWelcomeProviderEmail";

const validRecord = {
  id: "provider-message-123",
  to: ["shopper@example.com"],
  from: "Veilora Club <hello@veilora.example>",
  subject: "Welcome to Veilora Club",
  created_at: "2026-11-13T12:00:00.000Z",
  last_event: "delivered",
  tags: [
    {
      name: "veilora_newsletter_event",
      value: "newsletter-welcome:subscriber-123:2",
    },
  ],
};

describe("getNewsletterWelcomeProviderEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.configured = true;
  });

  it("retrieves and returns the required provider metadata", async () => {
    mocks.get.mockResolvedValue({
      data: validRecord,
      error: null,
    });

    await expect(
      getNewsletterWelcomeProviderEmail("provider-message-123")
    ).resolves.toEqual({
      status: "FOUND",
      record: {
        id: validRecord.id,
        to: validRecord.to,
        from: validRecord.from,
        subject: validRecord.subject,
        tags: validRecord.tags,
      },
      createdAt: validRecord.created_at,
      lastEvent: validRecord.last_event,
    });

    expect(mocks.get).toHaveBeenCalledExactlyOnceWith(
      "provider-message-123"
    );
  });

  it("rejects empty provider IDs without contacting Resend", async () => {
    await expect(
      getNewsletterWelcomeProviderEmail(" ")
    ).resolves.toEqual({
      status: "UNAVAILABLE",
      reason: "INVALID_PROVIDER_ID",
    });

    expect(mocks.get).not.toHaveBeenCalled();
  });

  it("rejects provider IDs containing whitespace", async () => {
    await expect(
      getNewsletterWelcomeProviderEmail("provider message")
    ).resolves.toEqual({
      status: "UNAVAILABLE",
      reason: "INVALID_PROVIDER_ID",
    });

    expect(mocks.get).not.toHaveBeenCalled();
  });

  it("rejects excessively long provider IDs", async () => {
    await expect(
      getNewsletterWelcomeProviderEmail("a".repeat(501))
    ).resolves.toEqual({
      status: "UNAVAILABLE",
      reason: "INVALID_PROVIDER_ID",
    });

    expect(mocks.get).not.toHaveBeenCalled();
  });

  it("handles missing provider configuration", async () => {
    mocks.configured = false;

    await expect(
      getNewsletterWelcomeProviderEmail("provider-message-123")
    ).resolves.toEqual({
      status: "UNAVAILABLE",
      reason: "PROVIDER_NOT_CONFIGURED",
    });

    expect(mocks.get).not.toHaveBeenCalled();
  });

  it("handles provider API errors", async () => {
    mocks.get.mockResolvedValue({
      data: null,
      error: {
        name: "not_found",
        message: "Email not found",
        statusCode: 404,
      },
    });

    await expect(
      getNewsletterWelcomeProviderEmail("provider-message-123")
    ).resolves.toEqual({
      status: "UNAVAILABLE",
      reason: "PROVIDER_ERROR",
    });
  });

  it("rejects mismatched provider IDs", async () => {
    mocks.get.mockResolvedValue({
      data: {
        ...validRecord,
        id: "different-provider-id",
      },
      error: null,
    });

    await expect(
      getNewsletterWelcomeProviderEmail("provider-message-123")
    ).resolves.toEqual({
      status: "UNAVAILABLE",
      reason: "INVALID_PROVIDER_RESPONSE",
    });
  });

  it("rejects malformed recipient metadata", async () => {
    mocks.get.mockResolvedValue({
      data: {
        ...validRecord,
        to: "shopper@example.com",
      },
      error: null,
    });

    await expect(
      getNewsletterWelcomeProviderEmail("provider-message-123")
    ).resolves.toEqual({
      status: "UNAVAILABLE",
      reason: "INVALID_PROVIDER_RESPONSE",
    });
  });

  it("rejects missing event metadata fields", async () => {
    mocks.get.mockResolvedValue({
      data: {
        ...validRecord,
        last_event: undefined,
      },
      error: null,
    });

    await expect(
      getNewsletterWelcomeProviderEmail("provider-message-123")
    ).resolves.toEqual({
      status: "UNAVAILABLE",
      reason: "INVALID_PROVIDER_RESPONSE",
    });
  });

  it("handles unexpected provider exceptions", async () => {
    mocks.get.mockRejectedValue(new Error("Network unavailable"));

    await expect(
      getNewsletterWelcomeProviderEmail("provider-message-123")
    ).resolves.toEqual({
      status: "UNAVAILABLE",
      reason: "PROVIDER_ERROR",
    });
  });
});