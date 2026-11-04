import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  update: vi.fn(),
  sendNewsletterWelcomeEmail: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    newsletterSubscriber: {
      findFirst: mocks.findFirst,
      update: mocks.update,
    },
  },
}));

vi.mock(
  "@/lib/resend/templates/marketing/newsletterWelcome",
  () => ({
    sendNewsletterWelcomeEmail: mocks.sendNewsletterWelcomeEmail,
  })
);

import { GET } from "./route";

function request(token?: string): Request {
  const url = new URL(
    "https://www.veiloraclub.com/api/newsletter/confirm"
  );

  if (token !== undefined) {
    url.searchParams.set("token", token);
  }

  return new Request(url);
}

function expectNoDatabaseAccess() {
  expect(mocks.findFirst).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
}

function expectNoMutationOrEmail() {
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.sendNewsletterWelcomeEmail).not.toHaveBeenCalled();
}

function expectRedirect(response: Response, status: string) {
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe(
    `https://www.veiloraclub.com/newsletter/confirm?status=${status}`
  );
}

describe("Newsletter confirmation route canonical URL safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://www.veiloraclub.com"
    );
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    vi.spyOn(console, "error").mockImplementation(() => {});

    mocks.findFirst.mockResolvedValue({
      id: "subscriber-1",
      email: "shopper@example.com",
      status: "pending",
      unsubscribeToken: "unsubscribe-token",
    });

    mocks.update.mockResolvedValue({
      id: "subscriber-1",
    });

    mocks.sendNewsletterWelcomeEmail.mockResolvedValue({
      id: "mock-email-id",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("redirects missing tokens to the canonical confirmation page", async () => {
    const response = await GET(request());

    expectRedirect(response, "missing");
    expectNoDatabaseAccess();
    expect(mocks.sendNewsletterWelcomeEmail).not.toHaveBeenCalled();
  });

  it("does not query the database for an empty token", async () => {
    const response = await GET(request(""));

    expectRedirect(response, "missing");
    expectNoDatabaseAccess();
  });

  it("looks up the supplied confirmation token", async () => {
    await GET(request("confirm-token"));

    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { confirmToken: "confirm-token" },
      select: {
        id: true,
        email: true,
        status: true,
        unsubscribeToken: true,
      },
    });
  });

  it("redirects unknown tokens as invalid", async () => {
    mocks.findFirst.mockResolvedValue(null);

    const response = await GET(request("unknown-token"));

    expectRedirect(response, "invalid");
    expectNoMutationOrEmail();
  });

  it("rejects tokens for already subscribed records", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "subscriber-1",
      email: "shopper@example.com",
      status: "subscribed",
      unsubscribeToken: "unsubscribe-token",
    });

    const response = await GET(request("used-token"));

    expectRedirect(response, "invalid");
    expectNoMutationOrEmail();
  });

  it("rejects tokens for unsubscribed records", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "subscriber-1",
      email: "shopper@example.com",
      status: "unsubscribed",
      unsubscribeToken: "unsubscribe-token",
    });

    const response = await GET(request("old-token"));

    expectRedirect(response, "invalid");
    expectNoMutationOrEmail();
  });

  it("confirms pending subscribers", async () => {
    const response = await GET(request("confirm-token"));

    expectRedirect(response, "ok");

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "subscriber-1" },
      data: {
        status: "subscribed",
        confirmedAt: expect.any(Date),
        confirmToken: null,
      },
    });
  });

  it("sends a welcome email after confirmation", async () => {
    await GET(request("confirm-token"));

    expect(mocks.sendNewsletterWelcomeEmail).toHaveBeenCalledWith({
      to: "shopper@example.com",
      unsubscribeToken: "unsubscribe-token",
    });
  });

  it("confirms the subscription before sending the welcome email", async () => {
    const order: string[] = [];

    mocks.update.mockImplementation(async () => {
      order.push("update");
      return {};
    });

    mocks.sendNewsletterWelcomeEmail.mockImplementation(async () => {
      order.push("email");
      return {};
    });

    await GET(request("confirm-token"));

    expect(order).toEqual(["update", "email"]);
  });

  it("generates and stores a missing unsubscribe token", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "subscriber-1",
      email: "shopper@example.com",
      status: "pending",
      unsubscribeToken: null,
    });

    await GET(request("confirm-token"));

    expect(mocks.update).toHaveBeenCalledTimes(2);

    const tokenUpdate = mocks.update.mock.calls[1][0];

    expect(tokenUpdate.where).toEqual({
      id: "subscriber-1",
    });

    expect(tokenUpdate.data.unsubscribeToken).toMatch(
      /^[0-9a-f-]{36}$/i
    );

    expect(mocks.sendNewsletterWelcomeEmail).toHaveBeenCalledWith({
      to: "shopper@example.com",
      unsubscribeToken: tokenUpdate.data.unsubscribeToken,
    });
  });

  it("does not rotate an existing unsubscribe token", async () => {
    await GET(request("confirm-token"));

    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it("preserves successful confirmation when email delivery fails", async () => {
    mocks.sendNewsletterWelcomeEmail.mockRejectedValue(
      new Error("Mock delivery failure")
    );

    const response = await GET(request("confirm-token"));

    expectRedirect(response, "ok");
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it("does not send email when confirmation database update fails", async () => {
    mocks.update.mockRejectedValue(
      new Error("Mock database failure")
    );

    await expect(
      GET(request("confirm-token"))
    ).rejects.toThrow("Mock database failure");

    expect(mocks.sendNewsletterWelcomeEmail).not.toHaveBeenCalled();
  });

  it("rejects missing production SITE_URL before database access", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    const response = await GET(request("confirm-token"));

    expect(response.status).toBe(503);
    expect(await response.text()).toBe(
      "Service temporarily unavailable."
    );
    expect(response.headers.get("cache-control")).toBe("no-store");

    expectNoDatabaseAccess();
    expect(mocks.sendNewsletterWelcomeEmail).not.toHaveBeenCalled();
  });

  it("rejects malformed production SITE_URL before database access", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "not-a-valid-url");

    const response = await GET(request("confirm-token"));

    expect(response.status).toBe(503);
    expectNoDatabaseAccess();
    expect(mocks.sendNewsletterWelcomeEmail).not.toHaveBeenCalled();
  });

  it("rejects HTTP production SITE_URL before database access", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "http://www.veiloraclub.com"
    );

    const response = await GET(request("confirm-token"));

    expect(response.status).toBe(503);
    expectNoDatabaseAccess();
    expect(mocks.sendNewsletterWelcomeEmail).not.toHaveBeenCalled();
  });

  it("rejects localhost production SITE_URL before database access", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://localhost:3000"
    );

    const response = await GET(request("confirm-token"));

    expect(response.status).toBe(503);
    expectNoDatabaseAccess();
    expect(mocks.sendNewsletterWelcomeEmail).not.toHaveBeenCalled();
  });

  it("does not fall back to legacy APP_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv(
      "NEXT_PUBLIC_APP_URL",
      "https://legacy.example.com"
    );

    const response = await GET(request("confirm-token"));

    expect(response.status).toBe(503);
    expectNoDatabaseAccess();
    expect(mocks.sendNewsletterWelcomeEmail).not.toHaveBeenCalled();
  });

  it("does not fall back to VERCEL_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_URL", "preview.example.com");

    const response = await GET(request("confirm-token"));

    expect(response.status).toBe(503);
    expectNoDatabaseAccess();
    expect(mocks.sendNewsletterWelcomeEmail).not.toHaveBeenCalled();
  });

  it("rejects a URL containing credentials", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://user:password@www.veiloraclub.com"
    );

    const response = await GET(request("confirm-token"));

    expect(response.status).toBe(503);
    expectNoDatabaseAccess();
    expect(mocks.sendNewsletterWelcomeEmail).not.toHaveBeenCalled();
  });

  it("rejects a URL containing a path", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://www.veiloraclub.com/unexpected"
    );

    const response = await GET(request("confirm-token"));

    expect(response.status).toBe(503);
    expectNoDatabaseAccess();
    expect(mocks.sendNewsletterWelcomeEmail).not.toHaveBeenCalled();
  });

  it("does not expose URL configuration errors to visitors", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "not-a-valid-url"
    );

    const response = await GET(request());

    expect(response.status).toBe(503);

    const body = await response.text();

    expect(body).not.toContain("NEXT_PUBLIC_SITE_URL");
    expect(body).not.toContain("not-a-valid-url");
    expectNoDatabaseAccess();
  });
});
