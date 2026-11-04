import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("../../send", () => ({
  sendEmail: mocks.sendEmail,
}));

vi.mock("../../client", () => ({
  FROM_MARKETING: "Veilora Club <marketing@example.com>",
  REPLY_TO_MARKETING: "marketing@example.com",
}));

import { sendNewsletterConfirmEmail } from "./newsletterConfirm";

const options = {
  to: "shopper@example.com",
  confirmToken: "confirm-token",
  unsubscribeToken: "unsubscribe-token",
};

function getSentEmail() {
  expect(mocks.sendEmail).toHaveBeenCalledTimes(1);

  return mocks.sendEmail.mock.calls[0][0] as {
    from: string;
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
  };
}

describe("Newsletter confirmation canonical URLs", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://www.veiloraclub.com"
    );
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    mocks.sendEmail.mockResolvedValue({
      ok: true,
      id: "mock-newsletter-confirm-id",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses the canonical confirmation URL", async () => {
    await sendNewsletterConfirmEmail(options);

    expect(getSentEmail().html).toContain(
      "https://www.veiloraclub.com/api/newsletter/confirm?token=confirm-token"
    );
  });

  it("uses the canonical unsubscribe URL", async () => {
    await sendNewsletterConfirmEmail(options);

    expect(getSentEmail().html).toContain(
      "https://www.veiloraclub.com/api/newsletter/unsubscribe?token=unsubscribe-token"
    );
  });

  it("encodes confirmation tokens safely", async () => {
    await sendNewsletterConfirmEmail({
      ...options,
      confirmToken: "a&b=c+d /?",
    });

    expect(getSentEmail().html).toContain(
      "token=a%26b%3Dc%2Bd%20%2F%3F"
    );
  });

  it("encodes unsubscribe tokens safely", async () => {
    await sendNewsletterConfirmEmail({
      ...options,
      unsubscribeToken: "x&y=z+w /?",
    });

    expect(getSentEmail().html).toContain(
      "token=x%26y%3Dz%2Bw%20%2F%3F"
    );
  });

  it("keeps confirmation and unsubscribe tokens separate", async () => {
    await sendNewsletterConfirmEmail(options);

    const html = getSentEmail().html;

    expect(html).toContain(
      "/confirm?token=confirm-token"
    );
    expect(html).toContain(
      "/unsubscribe?token=unsubscribe-token"
    );

    expect(html).not.toContain(
      "/confirm?token=unsubscribe-token"
    );
    expect(html).not.toContain(
      "/unsubscribe?token=confirm-token"
    );
  });

  it("preserves the confirmation subject", async () => {
    await sendNewsletterConfirmEmail(options);

    expect(getSentEmail().subject).toBe(
      "Confirm your subscription 💌"
    );
  });

  it("preserves the recipient", async () => {
    await sendNewsletterConfirmEmail(options);

    expect(getSentEmail().to).toBe(
      "shopper@example.com"
    );
  });

  it("preserves the marketing sender", async () => {
    await sendNewsletterConfirmEmail(options);

    expect(getSentEmail().from).toBe(
      "Veilora Club <marketing@example.com>"
    );
  });

  it("preserves the marketing reply-to address", async () => {
    await sendNewsletterConfirmEmail(options);

    expect(getSentEmail().replyTo).toBe(
      "marketing@example.com"
    );
  });

  it("preserves the confirmation call to action", async () => {
    await sendNewsletterConfirmEmail(options);

    expect(getSentEmail().html).toContain(
      "Confirm subscription"
    );
  });

  it("preserves the unsolicited-email notice", async () => {
    await sendNewsletterConfirmEmail(options);

    expect(getSentEmail().html).toContain(
      "If you didn’t request this"
    );
  });

  it("preserves the unsubscribe link label", async () => {
    await sendNewsletterConfirmEmail(options);

    expect(getSentEmail().html).toContain(
      ">Unsubscribe</a>"
    );
  });

  it("rejects missing production SITE_URL without sending", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    await expect(
      sendNewsletterConfirmEmail(options)
    ).rejects.toThrow(/NEXT_PUBLIC_SITE_URL/);

    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("rejects malformed production SITE_URL without sending", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "not-a-valid-url"
    );

    await expect(
      sendNewsletterConfirmEmail(options)
    ).rejects.toThrow();

    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("rejects HTTP production SITE_URL without sending", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "http://www.veiloraclub.com"
    );

    await expect(
      sendNewsletterConfirmEmail(options)
    ).rejects.toThrow();

    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("rejects production localhost without sending", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://localhost:3000"
    );

    await expect(
      sendNewsletterConfirmEmail(options)
    ).rejects.toThrow();

    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("does not fall back to legacy APP_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv(
      "NEXT_PUBLIC_APP_URL",
      "https://legacy.example.com"
    );

    await expect(
      sendNewsletterConfirmEmail(options)
    ).rejects.toThrow(/NEXT_PUBLIC_SITE_URL/);

    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("does not allow APP_URL to override SITE_URL", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_APP_URL",
      "https://legacy.example.com"
    );

    await sendNewsletterConfirmEmail(options);

    expect(getSentEmail().html).not.toContain(
      "legacy.example.com"
    );
  });

  it("propagates email delivery failures", async () => {
    mocks.sendEmail.mockRejectedValue(
      new Error("Mock delivery failure")
    );

    await expect(
      sendNewsletterConfirmEmail(options)
    ).rejects.toThrow("Mock delivery failure");
  });

  it("returns the shared email sender result", async () => {
    await expect(
      sendNewsletterConfirmEmail(options)
    ).resolves.toEqual({
      ok: true,
      id: "mock-newsletter-confirm-id",
    });
  });
});
