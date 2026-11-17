import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  configured: true,
}));

vi.mock("@/lib/resend/client", () => ({
  get resend() {
    return mocks.configured
      ? { emails: { get: mocks.get } }
      : null;
  },
}));

import { getNewsletterWelcomeProviderEmail } from "./getNewsletterWelcomeProviderEmail";
import {
  verifyNewsletterWelcomeProviderEvidence,
  type NewsletterWelcomeExpectedEvidence,
  type NewsletterWelcomeProviderRecord,
} from "./verifyNewsletterWelcomeProviderEvidence";

const expected: NewsletterWelcomeExpectedEvidence = {
  eventKey: "newsletter-welcome:subscriber-1:2",
  recipient: "shopper@example.com",
  sender: "Veilora Club <marketing@example.com>",
  subject: "Welcome to Veilora Club",
};

const validProvider = {
  id: "provider-1",
  to: ["shopper@example.com"],
  from: "Veilora Club <marketing@example.com>",
  subject: "Welcome to Veilora Club",
  created_at: "2026-11-15T10:00:00.000Z",
  last_event: "delivered",
  tags: [
    {
      name: "veilora_newsletter_event",
      value: expected.eventKey,
    },
  ],
};

describe("malformed newsletter welcome provider lookup", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.configured = true;
  });

  it.each([
    ["null recipient", [null]],
    ["numeric recipient", [123]],
    ["object recipient", [{}]],
    ["mixed recipients", ["shopper@example.com", null]],
  ])("rejects %s", async (_name, to) => {
    mocks.get.mockResolvedValue({
      data: {
        ...validProvider,
        to,
      },
      error: null,
    });

    await expect(
      getNewsletterWelcomeProviderEmail("provider-1")
    ).resolves.toEqual({
      status: "UNAVAILABLE",
      reason: "INVALID_PROVIDER_RESPONSE",
    });
  });

  it.each([
    ["null tags", null],
    ["non-array tags", "invalid"],
    ["null tag entry", [null]],
    ["missing tag name", [{ value: expected.eventKey }]],
    ["missing tag value", [{ name: "veilora_newsletter_event" }]],
    ["non-string tag value", [
      { name: "veilora_newsletter_event", value: 123 },
    ]],
  ])("rejects %s", async (_name, tags) => {
    mocks.get.mockResolvedValue({
      data: {
        ...validProvider,
        tags,
      },
      error: null,
    });

    await expect(
      getNewsletterWelcomeProviderEmail("provider-1")
    ).resolves.toEqual({
      status: "UNAVAILABLE",
      reason: "INVALID_PROVIDER_RESPONSE",
    });
  });
});

describe("malformed newsletter welcome evidence verification", () => {
  function verify(changes: Record<string, unknown>) {
    return verifyNewsletterWelcomeProviderEvidence(
      expected,
      {
        ...validProvider,
        ...changes,
      } as NewsletterWelcomeProviderRecord
    );
  }

  it.each([
    ["null recipient", [null]],
    ["numeric recipient", [123]],
    ["object recipient", [{}]],
  ])("does not match %s", (_name, to) => {
    expect(() => verify({ to })).not.toThrow();
    expect(verify({ to }).outcome).not.toBe("MATCHED");
  });

  it.each([
    ["null tags", null],
    ["non-array tags", "invalid"],
    ["null tag entry", [null]],
    ["missing tag name", [{ value: expected.eventKey }]],
    ["missing tag value", [{ name: "veilora_newsletter_event" }]],
    ["non-string tag value", [
      { name: "veilora_newsletter_event", value: 123 },
    ]],
  ])("does not match %s", (_name, tags) => {
    expect(() => verify({ tags })).not.toThrow();
    expect(verify({ tags }).outcome).not.toBe("MATCHED");
  });

  it("does not match a valid identity tag mixed with malformed tags", () => {
    expect(
      verify({
        tags: [
          { name: "veilora_newsletter_event", value: expected.eventKey },
          null,
        ],
      }).outcome
    ).not.toBe("MATCHED");
  });
});