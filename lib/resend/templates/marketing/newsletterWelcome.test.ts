import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  veiloraEmailTemplate: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("../../send", () => ({
  sendEmail: mocks.sendEmail,
}));

vi.mock("../../client", () => ({
  FROM_MARKETING: "Veilora Club <marketing@example.com>",
  REPLY_TO_MARKETING: "marketing@example.com",
}));

vi.mock("../base/veiloraBase", () => ({
  veiloraEmailTemplate: mocks.veiloraEmailTemplate,
}));

import { sendNewsletterWelcomeEmail } from "./newsletterWelcome";

const options = {
  to: "shopper@example.com",
  unsubscribeToken: "unsubscribe-token",
};

type TemplateOptions = {
  preheader: string;
  heading: string;
  bodyHtml: string;
  cta: {
    label: string;
    href: string;
  };
  footerNote: string;
};

function getTemplateOptions(): TemplateOptions {
  expect(mocks.veiloraEmailTemplate).toHaveBeenCalledTimes(1);

  return mocks.veiloraEmailTemplate.mock.calls[0][0] as TemplateOptions;
}

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

describe("Newsletter welcome canonical URLs", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://www.veiloraclub.com"
    );
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    mocks.veiloraEmailTemplate.mockImplementation(
      (input: TemplateOptions) =>
        `<html>${input.bodyHtml}${input.footerNote}<a href="${input.cta.href}">${input.cta.label}</a></html>`
    );

    mocks.sendEmail.mockResolvedValue({
      ok: true,
      id: "mock-newsletter-welcome-id",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses the canonical homepage for the CTA", async () => {
    await sendNewsletterWelcomeEmail(options);

    expect(getTemplateOptions().cta.href).toBe(
      "https://www.veiloraclub.com"
    );
  });

  it("preserves the homepage CTA label", async () => {
    await sendNewsletterWelcomeEmail(options);

    expect(getTemplateOptions().cta.label).toBe(
      "Explore Veilora Club"
    );
  });

  it("uses the canonical unsubscribe URL", async () => {
    await sendNewsletterWelcomeEmail(options);

    expect(getTemplateOptions().footerNote).toContain(
      "https://www.veiloraclub.com/api/newsletter/unsubscribe?token=unsubscribe-token"
    );
  });

  it("encodes unsubscribe tokens safely", async () => {
    await sendNewsletterWelcomeEmail({
      ...options,
      unsubscribeToken: "a&b=c+d /?",
    });

    expect(getTemplateOptions().footerNote).toContain(
      "token=a%26b%3Dc%2Bd%20%2F%3F"
    );
  });

  it("preserves the unsubscribe link label", async () => {
    await sendNewsletterWelcomeEmail(options);

    expect(getTemplateOptions().footerNote).toContain(
      "Unsubscribe"
    );
  });

  it("preserves the subscription explanation", async () => {
    await sendNewsletterWelcomeEmail(options);

    expect(getTemplateOptions().footerNote).toContain(
      "because you subscribed to the Veilora Club newsletter"
    );
  });

  it("preserves the welcome subject", async () => {
    await sendNewsletterWelcomeEmail(options);

    expect(getSentEmail().subject).toBe(
      "Welcome to Veilora Club ✨"
    );
  });

  it("preserves the recipient", async () => {
    await sendNewsletterWelcomeEmail(options);

    expect(getSentEmail().to).toBe(
      "shopper@example.com"
    );
  });

  it("preserves the marketing sender", async () => {
    await sendNewsletterWelcomeEmail(options);

    expect(getSentEmail().from).toBe(
      "Veilora Club <marketing@example.com>"
    );
  });

  it("preserves the marketing reply-to address", async () => {
    await sendNewsletterWelcomeEmail(options);

    expect(getSentEmail().replyTo).toBe(
      "marketing@example.com"
    );
  });

  it("preserves the email preheader", async () => {
    await sendNewsletterWelcomeEmail(options);

    expect(getTemplateOptions().preheader).toBe(
      "You're officially subscribed to the Veilora Club newsletter."
    );
  });

  it("preserves the welcome heading", async () => {
    await sendNewsletterWelcomeEmail(options);

    expect(getTemplateOptions().heading).toBe(
      "Welcome to Veilora Club"
    );
  });

  it("preserves the editorial welcome content", async () => {
    await sendNewsletterWelcomeEmail(options);

    const body = getTemplateOptions().bodyHtml;

    expect(body).toContain("modest fashion inspiration");
    expect(body).toContain("emerging brands");
    expect(body).toContain("exclusive collections");
    expect(body).toContain("styling ideas");
  });

  it("preserves the founder sign-off", async () => {
    await sendNewsletterWelcomeEmail(options);

    expect(getTemplateOptions().bodyHtml).toContain(
      "Asiya"
    );
  });

  it("passes the rendered template to the email sender", async () => {
    await sendNewsletterWelcomeEmail(options);

    const email = getSentEmail();

    expect(email.html).toContain(
      "https://www.veiloraclub.com"
    );
    expect(email.html).toContain(
      "/api/newsletter/unsubscribe?token=unsubscribe-token"
    );
  });

  it("rejects missing production SITE_URL without sending", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    await expect(
      sendNewsletterWelcomeEmail(options)
    ).rejects.toThrow(/NEXT_PUBLIC_SITE_URL/);

    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.veiloraEmailTemplate).not.toHaveBeenCalled();
  });

  it("rejects malformed production SITE_URL without sending", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "not-a-valid-url"
    );

    await expect(
      sendNewsletterWelcomeEmail(options)
    ).rejects.toThrow();

    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("rejects HTTP production SITE_URL without sending", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "http://www.veiloraclub.com"
    );

    await expect(
      sendNewsletterWelcomeEmail(options)
    ).rejects.toThrow();

    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("rejects production localhost without sending", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://localhost:3000"
    );

    await expect(
      sendNewsletterWelcomeEmail(options)
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
      sendNewsletterWelcomeEmail(options)
    ).rejects.toThrow(/NEXT_PUBLIC_SITE_URL/);

    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("does not allow APP_URL to override SITE_URL", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_APP_URL",
      "https://legacy.example.com"
    );

    await sendNewsletterWelcomeEmail(options);

    const template = getTemplateOptions();

    expect(template.cta.href).toBe(
      "https://www.veiloraclub.com"
    );
    expect(template.footerNote).not.toContain(
      "legacy.example.com"
    );
  });

  it("propagates email delivery failures", async () => {
    mocks.sendEmail.mockRejectedValue(
      new Error("Mock delivery failure")
    );

    await expect(
      sendNewsletterWelcomeEmail(options)
    ).rejects.toThrow("Mock delivery failure");
  });

  it("returns the shared email sender result", async () => {
    await expect(
      sendNewsletterWelcomeEmail(options)
    ).resolves.toEqual({
      ok: true,
      id: "mock-newsletter-welcome-id",
    });
  });
});
