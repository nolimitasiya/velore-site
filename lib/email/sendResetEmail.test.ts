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

import { sendResetEmail } from "./sendResetEmail";

type ResetOptions = Parameters<typeof sendResetEmail>[0];

const adminOptions: ResetOptions = {
  to: "admin@example.com",
  userType: "ADMIN",
  resetUrl: "https://www.veiloraclub.com/admin/reset?token=admin-token",
};

const brandOptions: ResetOptions = {
  to: "brand@example.com",
  userType: "BRAND",
  resetUrl: "https://www.veiloraclub.com/brand/reset?token=brand-token",
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

describe("Admin/Brand reset email canonical URLs", () => {
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
      data: { id: "mock-email-id" },
      error: null,
    });
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses the canonical production homepage in Admin HTML", async () => {
    await sendResetEmail(adminOptions);

    const email = getSentEmail();

    expect(email.html).toContain(
      'href="https://www.veiloraclub.com"'
    );
    expect(email.to).toBe("admin@example.com");
  });

  it("preserves the Admin reset link exactly", async () => {
    await sendResetEmail(adminOptions);

    const email = getSentEmail();

    expect(email.html).toContain(
      `href="${adminOptions.resetUrl}"`
    );
    expect(email.text).toContain(adminOptions.resetUrl);
  });

  it("preserves the Brand reset link exactly", async () => {
    await sendResetEmail(brandOptions);

    const email = getSentEmail();

    expect(email.html).toContain(
      `href="${brandOptions.resetUrl}"`
    );
    expect(email.text).toContain(brandOptions.resetUrl);
  });

  it("uses the canonical homepage for Brand emails", async () => {
    await sendResetEmail(brandOptions);

    const email = getSentEmail();

    expect(email.html).toContain(
      'href="https://www.veiloraclub.com"'
    );
  });

  it("preserves the Admin subject", async () => {
    await sendResetEmail(adminOptions);

    expect(getSentEmail().subject).toBe(
      "Reset your Veilora Admin password"
    );
  });

  it("preserves the Brand subject", async () => {
    await sendResetEmail(brandOptions);

    expect(getSentEmail().subject).toBe(
      "Reset your Veilora Brand password"
    );
  });

  it("preserves the 60-minute expiry wording", async () => {
    await sendResetEmail(adminOptions);

    const email = getSentEmail();

    expect(email.html).toContain(
      "This link expires in 60 minutes."
    );
    expect(email.text).toContain(
      "This link expires in 60 minutes."
    );
  });

  it("rejects missing production SITE_URL without sending", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    await expect(
      sendResetEmail(adminOptions)
    ).rejects.toThrow(/NEXT_PUBLIC_SITE_URL/);

    expect(resendMocks.send).not.toHaveBeenCalled();
  });

  it("rejects malformed production SITE_URL without sending", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "not-a-valid-url");

    await expect(
      sendResetEmail(adminOptions)
    ).rejects.toThrow();

    expect(resendMocks.send).not.toHaveBeenCalled();
  });

  it("rejects HTTP production origins without sending", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "http://www.veiloraclub.com"
    );

    await expect(
      sendResetEmail(adminOptions)
    ).rejects.toThrow();

    expect(resendMocks.send).not.toHaveBeenCalled();
  });

  it("does not use legacy APP_URL as a fallback", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv(
      "NEXT_PUBLIC_APP_URL",
      "https://legacy.example.com"
    );

    await expect(
      sendResetEmail(adminOptions)
    ).rejects.toThrow(/NEXT_PUBLIC_SITE_URL/);

    expect(resendMocks.send).not.toHaveBeenCalled();
  });

  it("does not let APP_URL override SITE_URL", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_APP_URL",
      "https://legacy.example.com"
    );

    await sendResetEmail(adminOptions);

    const email = getSentEmail();

    expect(email.html).not.toContain("legacy.example.com");
    expect(email.html).toContain(
      'href="https://www.veiloraclub.com"'
    );
  });

  it("propagates Resend delivery errors", async () => {
    resendMocks.send.mockResolvedValue({
      data: null,
      error: { message: "Mock delivery failure" },
    });

    await expect(
      sendResetEmail(adminOptions)
    ).rejects.toThrow("Mock delivery failure");
  });

  it("preserves the recipient in the Resend payload", async () => {
    await sendResetEmail(brandOptions);

    expect(getSentEmail().to).toBe("brand@example.com");
  });
});
