import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  sendNewsletterConfirmEmail: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    newsletterSubscriber: {
      findUnique: mocks.findUnique,
      create: mocks.create,
      update: mocks.update,
    },
  },
}));

vi.mock(
  "@/lib/resend/templates/marketing/newsletterConfirm",
  () => ({
    sendNewsletterConfirmEmail: mocks.sendNewsletterConfirmEmail,
  })
);

import { POST } from "./route";

function request(body: unknown): Request {
  return new Request("https://www.veiloraclub.com/api/newsletter/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validRequest(): Request {
  return request({
    email: "SHOPPER@EXAMPLE.COM",
    source: "launch",
    tags: ["waitlist"],
  });
}

async function responseBody(response: Response) {
  return response.json() as Promise<{
    ok: boolean;
    status?: string;
    error?: string;
    debugId?: string;
  }>;
}

function expectNoDatabaseAccess() {
  expect(mocks.findUnique).not.toHaveBeenCalled();
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
}

function expectNoMutationOrEmail() {
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
}

describe("Newsletter subscribe route canonical URL safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.veiloraclub.com");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("RESEND_API_KEY", "mock-key");
    vi.stubEnv("RESEND_FROM_MARKETING", "marketing@example.com");
    vi.stubEnv("RESEND_FROM_ONBOARDING", "");

    vi.spyOn(console, "error").mockImplementation(() => {});

    mocks.findUnique.mockResolvedValue(null);
    mocks.create.mockResolvedValue({
      email: "shopper@example.com",
      confirmToken: "new-confirm-token",
      unsubscribeToken: "new-unsubscribe-token",
    });
    mocks.update.mockResolvedValue({
      email: "shopper@example.com",
      confirmToken: "rotated-confirm-token",
      unsubscribeToken: "existing-unsubscribe-token",
    });
    mocks.sendNewsletterConfirmEmail.mockResolvedValue({
      id: "mock-email-id",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("creates a pending subscriber with valid configuration", async () => {
    const response = await POST(validRequest());

    expect(response.status).toBe(200);
    expect(await responseBody(response)).toEqual({
      ok: true,
      status: "pending",
    });

    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.create.mock.calls[0][0].data.status).toBe("pending");
  });

  it("normalises subscriber email before lookup", async () => {
    await POST(validRequest());

    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { email: "shopper@example.com" },
      select: {
        id: true,
        status: true,
        unsubscribeToken: true,
      },
    });
  });

  it("preserves subscriber source and tags", async () => {
    await POST(validRequest());

    expect(mocks.create.mock.calls[0][0].data).toMatchObject({
      email: "shopper@example.com",
      source: "launch",
      tags: ["waitlist"],
      status: "pending",
    });
  });

  it("generates separate confirmation and unsubscribe tokens", async () => {
    await POST(validRequest());

    const data = mocks.create.mock.calls[0][0].data;

    expect(data.confirmToken).toMatch(/^[a-f0-9]{48}$/);
    expect(data.unsubscribeToken).toMatch(/^[a-f0-9]{48}$/);
    expect(data.confirmToken).not.toBe(data.unsubscribeToken);
  });

  it("sends the new subscriber's confirmation tokens", async () => {
    await POST(validRequest());

    expect(mocks.sendNewsletterConfirmEmail).toHaveBeenCalledWith({
      to: "shopper@example.com",
      confirmToken: "new-confirm-token",
      unsubscribeToken: "new-unsubscribe-token",
    });
  });

  it("does not modify an already subscribed subscriber", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "subscriber-1",
      status: "subscribed",
      unsubscribeToken: "existing-unsubscribe-token",
    });

    const response = await POST(validRequest());

    expect(await responseBody(response)).toEqual({
      ok: true,
      status: "subscribed",
    });

    expectNoMutationOrEmail();
  });

  it("rotates the confirmation token for pending subscribers", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "subscriber-1",
      status: "pending",
      unsubscribeToken: "existing-unsubscribe-token",
    });

    const response = await POST(validRequest());

    expect(response.status).toBe(200);

    const update = mocks.update.mock.calls[0][0];

    expect(update.data.status).toBe("pending");
    expect(update.data.confirmToken).toMatch(/^[a-f0-9]{48}$/);
    expect(update.data.unsubscribeToken).toBeUndefined();
  });

  it("restores a missing unsubscribe token on resubscription", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "subscriber-1",
      status: "unsubscribed",
      unsubscribeToken: null,
    });

    await POST(validRequest());

    const update = mocks.update.mock.calls[0][0];

    expect(update.data.unsubscribeToken).toMatch(/^[a-f0-9]{48}$/);
    expect(update.data.status).toBe("pending");
  });

  it("sends the updated confirmation token", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "subscriber-1",
      status: "pending",
      unsubscribeToken: "existing-unsubscribe-token",
    });

    await POST(validRequest());

    expect(mocks.sendNewsletterConfirmEmail).toHaveBeenCalledWith({
      to: "shopper@example.com",
      confirmToken: "rotated-confirm-token",
      unsubscribeToken: "existing-unsubscribe-token",
    });
  });

  it("rejects missing production SITE_URL before database access", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    const response = await POST(validRequest());

    expect(response.status).toBe(503);
    expect(await responseBody(response)).toEqual({
      ok: false,
      error: "Server configuration unavailable.",
    });

    expectNoDatabaseAccess();
    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("rejects malformed production SITE_URL before database access", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "not-a-valid-url");

    const response = await POST(validRequest());

    expect(response.status).toBe(503);
    expectNoDatabaseAccess();
    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("rejects HTTP production SITE_URL before database access", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://www.veiloraclub.com");

    const response = await POST(validRequest());

    expect(response.status).toBe(503);
    expectNoDatabaseAccess();
    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("rejects localhost production SITE_URL before database access", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://localhost:3000");

    const response = await POST(validRequest());

    expect(response.status).toBe(503);
    expectNoDatabaseAccess();
    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("does not fall back to legacy APP_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://legacy.example.com");

    const response = await POST(validRequest());

    expect(response.status).toBe(503);
    expectNoDatabaseAccess();
    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("does not fall back to VERCEL_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_URL", "preview.example.com");

    const response = await POST(validRequest());

    expect(response.status).toBe(503);
    expectNoDatabaseAccess();
    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("rejects a URL containing credentials before database access", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://user:password@www.veiloraclub.com"
    );

    const response = await POST(validRequest());

    expect(response.status).toBe(503);
    expectNoDatabaseAccess();
    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("rejects a URL containing a path before database access", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://www.veiloraclub.com/unexpected"
    );

    const response = await POST(validRequest());

    expect(response.status).toBe(503);
    expectNoDatabaseAccess();
    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("rejects invalid subscriber email", async () => {
    const response = await POST(request({ email: "not-an-email" }));

    expect(response.status).toBe(400);
    expect(await responseBody(response)).toEqual({
      ok: false,
      error: "Invalid input.",
    });

    expectNoDatabaseAccess();
    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("rejects missing subscriber email", async () => {
    const response = await POST(request({ source: "launch" }));

    expect(response.status).toBe(400);
    expectNoDatabaseAccess();
    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("rejects tags exceeding the maximum length", async () => {
    const response = await POST(
      request({
        email: "shopper@example.com",
        tags: ["x".repeat(31)],
      })
    );

    expect(response.status).toBe(400);
    expectNoDatabaseAccess();
    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("rejects missing Resend API key before database access", async () => {
    vi.stubEnv("RESEND_API_KEY", "");

    const response = await POST(validRequest());

    expect(response.status).toBe(500);
    expectNoDatabaseAccess();
    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("rejects missing Resend sender configuration", async () => {
    vi.stubEnv("RESEND_FROM_MARKETING", "");
    vi.stubEnv("RESEND_FROM_ONBOARDING", "");

    const response = await POST(validRequest());

    expect(response.status).toBe(500);
    expectNoDatabaseAccess();
    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("returns a generic error when subscriber creation fails", async () => {
    mocks.create.mockRejectedValue(new Error("Mock database failure"));

    const response = await POST(validRequest());

    expect(response.status).toBe(500);
    expect((await responseBody(response)).error).toBe(
      "Something went wrong."
    );
    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("returns a generic error when confirmation email delivery fails", async () => {
    mocks.sendNewsletterConfirmEmail.mockRejectedValue(
      new Error("Mock delivery failure")
    );

    const response = await POST(validRequest());

    expect(response.status).toBe(500);
    expect((await responseBody(response)).error).toBe(
      "Something went wrong."
    );
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it("preserves existing unique-conflict retry behaviour", async () => {
    mocks.create.mockRejectedValue({ code: "P2002" });

    const response = await POST(validRequest());

    expect(response.status).toBe(200);
    expect(await responseBody(response)).toEqual({
      ok: true,
      status: "pending",
    });
    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });
});
