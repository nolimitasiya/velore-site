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

import { sendShopperResetEmail } from "./sendShopperResetEmail";

type ResetOptions = Parameters<typeof sendShopperResetEmail>[0];

const shopperOptions: ResetOptions = {
  to: "shopper@example.com",
  firstName: "Amina",
  resetUrl:
    "https://www.veiloraclub.com/account/reset?token=shopper-token",
};

function getSentEmail() {
  expect(resendMocks.send).toHaveBeenCalledTimes(1);

  return resendMocks.send.mock.calls[0][0] as {
    to: string;
    subject: string;
    html: string;
    text: string;
  };
}

describe("Shopper reset email canonical URLs", () => {
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

    resendMocks.send.mockResolvedValue({
      data: { id: "mock-shopper-email-id" },
      error: null,
    });

    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses the canonical production homepage in HTML", async () => {
    await sendShopperResetEmail(shopperOptions);

    const email = getSentEmail();

    expect(email.html).toContain(
      'href="https://www.veiloraclub.com"'
    );
  });

  it("preserves the shopper reset URL exactly in HTML", async () => {
    await sendShopperResetEmail(shopperOptions);

    expect(getSentEmail().html).toContain(
      `href="${shopperOptions.resetUrl}"`
    );
  });

  it("preserves the shopper reset URL in plain text", async () => {
    await sendShopperResetEmail(shopperOptions);

    expect(getSentEmail().text).toContain(
      shopperOptions.resetUrl
    );
  });

  it("preserves the shopper email subject", async () => {
    await sendShopperResetEmail(shopperOptions);

    expect(getSentEmail().subject).toBe(
      "Reset your Veilora Club password"
    );
  });

  it("preserves the recipient", async () => {
    await sendShopperResetEmail(shopperOptions);

    expect(getSentEmail().to).toBe("shopper@example.com");
  });

  it("preserves the 60-minute expiry wording", async () => {
    await sendShopperResetEmail(shopperOptions);

    const email = getSentEmail();

    expect(email.html).toContain(
      "This link expires in 60 minutes."
    );

    expect(email.text).toContain(
      "This link expires in 60 minutes."
    );
  });

  it("preserves the personalised greeting", async () => {
    await sendShopperResetEmail(shopperOptions);

    const email = getSentEmail();

    expect(email.html).toContain("Hi Amina,");
    expect(email.text).toContain("Hi Amina,");
  });

  it("rejects missing production SITE_URL without sending", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    await expect(
      sendShopperResetEmail(shopperOptions)
    ).rejects.toThrow(/NEXT_PUBLIC_SITE_URL/);

    expect(resendMocks.send).not.toHaveBeenCalled();
  });

  it("rejects malformed production SITE_URL without sending", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "not-a-valid-url");

    await expect(
      sendShopperResetEmail(shopperOptions)
    ).rejects.toThrow();

    expect(resendMocks.send).not.toHaveBeenCalled();
  });

  it("rejects HTTP production origins without sending", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "http://www.veiloraclub.com"
    );

    await expect(
      sendShopperResetEmail(shopperOptions)
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
      sendShopperResetEmail(shopperOptions)
    ).rejects.toThrow(/NEXT_PUBLIC_SITE_URL/);

    expect(resendMocks.send).not.toHaveBeenCalled();
  });

  it("does not allow APP_URL to override SITE_URL", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_APP_URL",
      "https://legacy.example.com"
    );

    await sendShopperResetEmail(shopperOptions);

    const email = getSentEmail();

    expect(email.html).not.toContain("legacy.example.com");

    expect(email.html).toContain(
      'href="https://www.veiloraclub.com"'
    );
  });

  it("propagates Resend delivery errors", async () => {
    resendMocks.send.mockResolvedValue({
      data: null,
      error: { message: "Mock shopper delivery failure" },
    });

    await expect(
      sendShopperResetEmail(shopperOptions)
    ).rejects.toThrow("Mock shopper delivery failure");
  });

  it("preserves the fallback greeting when no name is supplied", async () => {
    await sendShopperResetEmail({
      to: shopperOptions.to,
      resetUrl: shopperOptions.resetUrl,
    });

    const email = getSentEmail();

    expect(email.html).toContain("Hi there,");
    expect(email.text).toContain("Hi there,");
  });
});
