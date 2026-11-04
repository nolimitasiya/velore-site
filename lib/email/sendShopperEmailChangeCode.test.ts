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

import { sendShopperEmailChangeCode } from "./sendShopperEmailChangeCode";

type EmailOptions = Parameters<typeof sendShopperEmailChangeCode>[0];

const options: EmailOptions = {
  to: "new-address@example.com",
  firstName: "Amina",
  code: "482913",
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

describe("Shopper email-change canonical URLs", () => {
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
      data: { id: "mock-email-id" },
      error: null,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses the canonical production homepage in HTML", async () => {
    await sendShopperEmailChangeCode(options);

    expect(getSentEmail().html).toContain(
      'href="https://www.veiloraclub.com"'
    );
  });

  it("includes the canonical homepage in plain text", async () => {
    await sendShopperEmailChangeCode(options);

    expect(getSentEmail().text).toContain(
      "https://www.veiloraclub.com"
    );
  });

  it("preserves the exact verification code in HTML", async () => {
    await sendShopperEmailChangeCode(options);

    expect(getSentEmail().html).toContain("482913");
  });

  it("preserves the exact verification code in plain text", async () => {
    await sendShopperEmailChangeCode(options);

    expect(getSentEmail().text).toContain("482913");
  });

  it("preserves the 15-minute expiry wording", async () => {
    await sendShopperEmailChangeCode(options);

    const email = getSentEmail();

    expect(email.html).toContain(
      "This code expires in 15 minutes."
    );
    expect(email.text).toContain(
      "This code expires in 15 minutes."
    );
  });

  it("preserves the personalised greeting", async () => {
    await sendShopperEmailChangeCode(options);

    const email = getSentEmail();

    expect(email.html).toContain("Hi Amina,");
    expect(email.text).toContain("Hi Amina,");
  });

  it("preserves the greeting when no name is supplied", async () => {
    await sendShopperEmailChangeCode({
      to: options.to,
      code: options.code,
    });

    const email = getSentEmail();

    expect(email.html).toContain("Hi,");
    expect(email.text).toContain("Hi,");
  });

  it("preserves the verification email subject", async () => {
    await sendShopperEmailChangeCode(options);

    expect(getSentEmail().subject).toBe(
      "Verify your new email address — Veilora Club"
    );
  });

  it("preserves the recipient", async () => {
    await sendShopperEmailChangeCode(options);

    expect(getSentEmail().to).toBe("new-address@example.com");
  });

  it("preserves the sender configuration", async () => {
    await sendShopperEmailChangeCode(options);

    expect(getSentEmail().from).toBe(
      "Veilora Club <no-reply@example.com>"
    );
  });

  it("rejects missing production SITE_URL without sending", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    await expect(
      sendShopperEmailChangeCode(options)
    ).rejects.toThrow(/NEXT_PUBLIC_SITE_URL/);

    expect(resendMocks.send).not.toHaveBeenCalled();
  });

  it("rejects malformed production SITE_URL without sending", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "not-a-valid-url");

    await expect(
      sendShopperEmailChangeCode(options)
    ).rejects.toThrow();

    expect(resendMocks.send).not.toHaveBeenCalled();
  });

  it("rejects HTTP production origins without sending", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "http://www.veiloraclub.com"
    );

    await expect(
      sendShopperEmailChangeCode(options)
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
      sendShopperEmailChangeCode(options)
    ).rejects.toThrow(/NEXT_PUBLIC_SITE_URL/);

    expect(resendMocks.send).not.toHaveBeenCalled();
  });

  it("does not allow APP_URL to override SITE_URL", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_APP_URL",
      "https://legacy.example.com"
    );

    await sendShopperEmailChangeCode(options);

    const email = getSentEmail();

    expect(email.html).not.toContain("legacy.example.com");
    expect(email.text).not.toContain("legacy.example.com");
  });

  it("preserves the no-change warning", async () => {
    await sendShopperEmailChangeCode(options);

    const email = getSentEmail();

    expect(email.html).toContain(
      "Your current Veilora Club email address will remain unchanged."
    );
    expect(email.text).toContain(
      "Your current Veilora Club email address will remain unchanged."
    );
  });

  it("preserves the optional reply-to configuration", async () => {
    vi.stubEnv(
      "RESEND_REPLY_TO",
      "support@example.com"
    );

    await sendShopperEmailChangeCode(options);

    expect(getSentEmail().replyTo).toBe(
      "support@example.com"
    );
  });

  it("propagates a rejected Resend request", async () => {
    resendMocks.send.mockRejectedValue(
      new Error("Mock network failure")
    );

    await expect(
      sendShopperEmailChangeCode(options)
    ).rejects.toThrow("Mock network failure");
  });

  it("preserves current handling of a resolved Resend error", async () => {
    resendMocks.send.mockResolvedValue({
      data: null,
      error: { message: "Mock provider error" },
    });

    await expect(
      sendShopperEmailChangeCode(options)
    ).resolves.toBeUndefined();

    expect(resendMocks.send).toHaveBeenCalledTimes(1);
  });
});
