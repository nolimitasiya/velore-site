import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const resendMocks = vi.hoisted(() => ({
  send: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: resendMocks.send,
    };
  },
}));

import { sendShopperWelcomeEmail } from "./sendShopperWelcomeEmail";

type WelcomeOptions = Parameters<typeof sendShopperWelcomeEmail>[0];

const options: WelcomeOptions = {
  to: "shopper@example.com",
  firstName: "Amina",
};

function getSentEmail() {
  expect(resendMocks.send).toHaveBeenCalledTimes(1);

  return resendMocks.send.mock.calls[0][0] as {
    from: string;
    to: string;
    subject: string;
    html: string;
    text: string;
    replyTo?: string;
  };
}

describe("Shopper welcome email canonical URLs", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://www.veiloraclub.com"
    );
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    vi.stubEnv("RESEND_API_KEY", "mock-test-key");
    vi.stubEnv(
      "RESEND_FROM_NO_REPLY",
      "Veilora Club <no-reply@example.com>"
    );
    vi.stubEnv("RESEND_REPLY_TO", "");

    resendMocks.send.mockResolvedValue({
      data: { id: "mock-welcome-email-id" },
      error: null,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses the canonical production homepage in HTML", async () => {
    await sendShopperWelcomeEmail(options);

    expect(getSentEmail().html).toContain(
      'href="https://www.veiloraclub.com"'
    );
  });

  it("uses the canonical account link in HTML", async () => {
    await sendShopperWelcomeEmail(options);

    expect(getSentEmail().html).toContain(
      'href="https://www.veiloraclub.com/account"'
    );
  });

  it("uses the canonical account link in plain text", async () => {
    await sendShopperWelcomeEmail(options);

    expect(getSentEmail().text).toContain(
      "Go to your account: https://www.veiloraclub.com/account"
    );
  });

  it("includes the canonical homepage in plain text", async () => {
    await sendShopperWelcomeEmail(options);

    expect(getSentEmail().text).toContain(
      "https://www.veiloraclub.com"
    );
  });

  it("preserves the welcome email subject", async () => {
    await sendShopperWelcomeEmail(options);

    expect(getSentEmail().subject).toBe(
      "Welcome to Veilora Club ✦"
    );
  });

  it("preserves the recipient", async () => {
    await sendShopperWelcomeEmail(options);

    expect(getSentEmail().to).toBe("shopper@example.com");
  });

  it("preserves the sender configuration", async () => {
    await sendShopperWelcomeEmail(options);

    expect(getSentEmail().from).toBe(
      "Veilora Club <no-reply@example.com>"
    );
  });

  it("preserves the personalised greeting", async () => {
    await sendShopperWelcomeEmail(options);

    const email = getSentEmail();

    expect(email.html).toContain("Hi Amina,");
    expect(email.text).toContain(
      "Welcome to Veilora Club, Amina!"
    );
  });

  it("preserves the default greeting", async () => {
    await sendShopperWelcomeEmail({
      to: options.to,
    });

    const email = getSentEmail();

    expect(email.html).toContain("Welcome,");
    expect(email.text).toContain(
      "Welcome to Veilora Club!"
    );
  });

  it("preserves the account-ready wording", async () => {
    await sendShopperWelcomeEmail(options);

    const email = getSentEmail();

    expect(email.html).toContain("Your account is ready.");
    expect(email.text).toContain("Your account is ready.");
  });

  it("preserves the wishlist feature description", async () => {
    await sendShopperWelcomeEmail(options);

    const email = getSentEmail();

    expect(email.html).toContain(
      "Save pieces to your wishlist"
    );
    expect(email.text).toContain(
      "Save pieces to your wishlist"
    );
  });

  it("preserves the account-creation notice", async () => {
    await sendShopperWelcomeEmail(options);

    const email = getSentEmail();

    expect(email.html).toContain(
      "You're receiving this because you created a Veilora Club account"
    );
    expect(email.text).toContain(
      "You're receiving this because you created a Veilora Club account"
    );
  });

  it("rejects missing production SITE_URL without sending", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    await expect(
      sendShopperWelcomeEmail(options)
    ).rejects.toThrow(/NEXT_PUBLIC_SITE_URL/);

    expect(resendMocks.send).not.toHaveBeenCalled();
  });

  it("rejects malformed production SITE_URL without sending", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "not-a-valid-url");

    await expect(
      sendShopperWelcomeEmail(options)
    ).rejects.toThrow();

    expect(resendMocks.send).not.toHaveBeenCalled();
  });

  it("rejects HTTP production origins without sending", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "http://www.veiloraclub.com"
    );

    await expect(
      sendShopperWelcomeEmail(options)
    ).rejects.toThrow();

    expect(resendMocks.send).not.toHaveBeenCalled();
  });

  it("does not fall back to legacy APP_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv(
      "NEXT_PUBLIC_APP_URL",
      "https://legacy.example.com"
    );

    await expect(
      sendShopperWelcomeEmail(options)
    ).rejects.toThrow(/NEXT_PUBLIC_SITE_URL/);

    expect(resendMocks.send).not.toHaveBeenCalled();
  });

  it("does not allow APP_URL to override SITE_URL", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_APP_URL",
      "https://legacy.example.com"
    );

    await sendShopperWelcomeEmail(options);

    const email = getSentEmail();

    expect(email.html).not.toContain("legacy.example.com");
    expect(email.text).not.toContain("legacy.example.com");
  });

  it("preserves optional reply-to configuration", async () => {
    vi.stubEnv(
      "RESEND_REPLY_TO",
      "support@example.com"
    );

    await sendShopperWelcomeEmail(options);

    expect(getSentEmail().replyTo).toBe(
      "support@example.com"
    );
  });

  it("propagates a rejected Resend request", async () => {
    resendMocks.send.mockRejectedValue(
      new Error("Mock network failure")
    );

    await expect(
      sendShopperWelcomeEmail(options)
    ).rejects.toThrow("Mock network failure");
  });

  it("preserves current handling of a resolved Resend error", async () => {
    resendMocks.send.mockResolvedValue({
      data: null,
      error: { message: "Mock provider error" },
    });

    await expect(
      sendShopperWelcomeEmail(options)
    ).resolves.toBeUndefined();

    expect(resendMocks.send).toHaveBeenCalledTimes(1);
  });
});
