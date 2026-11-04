import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  sendNewsletterConfirmEmail: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/AdminSession", () => ({
  requireAdminSession: mocks.requireAdminSession,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    newsletterSubscriber: {
      findUnique: mocks.findUnique,
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

function request(body: unknown = { id: "subscriber-1" }): Request {
  return new Request(
    "https://www.veiloraclub.com/api/admin/newsletter/remind",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

function expectNoDatabaseAccess() {
  expect(mocks.findUnique).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
}

function expectNoMutationOrEmail() {
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
}

describe("Individual Admin newsletter reminder URL safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://www.veiloraclub.com"
    );
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    vi.spyOn(console, "error").mockImplementation(() => {});

    mocks.requireAdminSession.mockResolvedValue({
      id: "admin-1",
    });

    mocks.findUnique.mockResolvedValue({
      id: "subscriber-1",
      email: "shopper@example.com",
      status: "pending",
      unsubscribeToken: "unsubscribe-token",
    });

    mocks.update.mockResolvedValue({
      email: "shopper@example.com",
      confirmToken: "new-confirm-token",
      unsubscribeToken: "unsubscribe-token",
    });

    mocks.sendNewsletterConfirmEmail.mockResolvedValue({
      id: "mock-email-id",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("requires Admin authentication", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.requireAdminSession).toHaveBeenCalledOnce();
  });

  it("rejects unauthenticated requests before database access", async () => {
    mocks.requireAdminSession.mockRejectedValue(
      new Error("UNAUTHENTICATED")
    );

    const response = await POST(request());

    expect(response.status).toBe(401);
    expectNoDatabaseAccess();
    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("preserves authentication precedence over URL configuration errors", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    mocks.requireAdminSession.mockRejectedValue(
      new Error("UNAUTHENTICATED")
    );

    const response = await POST(request());

    expect(response.status).toBe(401);
    expectNoDatabaseAccess();
  });

  it("rejects missing production SITE_URL before database access", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Server configuration unavailable.",
    });

    expectNoDatabaseAccess();
    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("rejects malformed production SITE_URL before database access", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "not-a-valid-url");

    const response = await POST(request());

    expect(response.status).toBe(503);
    expectNoDatabaseAccess();
    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("rejects HTTP production SITE_URL before database access", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "http://www.veiloraclub.com"
    );

    const response = await POST(request());

    expect(response.status).toBe(503);
    expectNoDatabaseAccess();
  });

  it("rejects localhost production SITE_URL before database access", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://localhost:3000"
    );

    const response = await POST(request());

    expect(response.status).toBe(503);
    expectNoDatabaseAccess();
  });

  it("rejects URL credentials before database access", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://user:password@www.veiloraclub.com"
    );

    const response = await POST(request());

    expect(response.status).toBe(503);
    expectNoDatabaseAccess();
  });

  it("rejects URL paths before database access", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://www.veiloraclub.com/unexpected"
    );

    const response = await POST(request());

    expect(response.status).toBe(503);
    expectNoDatabaseAccess();
  });

  it("does not fall back to legacy APP_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv(
      "NEXT_PUBLIC_APP_URL",
      "https://legacy.example.com"
    );

    const response = await POST(request());

    expect(response.status).toBe(503);
    expectNoDatabaseAccess();
  });

  it("does not fall back to VERCEL_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_URL", "preview.example.com");

    const response = await POST(request());

    expect(response.status).toBe(503);
    expectNoDatabaseAccess();
  });

  it("rejects missing subscriber ids", async () => {
    const response = await POST(request({}));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Missing id",
    });

    expectNoDatabaseAccess();
  });

  it("trims subscriber ids before lookup", async () => {
    await POST(request({ id: "  subscriber-1  " }));

    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { id: "subscriber-1" },
      select: {
        id: true,
        email: true,
        status: true,
        unsubscribeToken: true,
      },
    });
  });

  it("returns 404 for unknown subscribers", async () => {
    mocks.findUnique.mockResolvedValue(null);

    const response = await POST(request());

    expect(response.status).toBe(404);
    expectNoMutationOrEmail();
  });

  it("rejects already subscribed records", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "subscriber-1",
      email: "shopper@example.com",
      status: "subscribed",
      unsubscribeToken: "unsubscribe-token",
    });

    const response = await POST(request());

    expect(response.status).toBe(400);
    expectNoMutationOrEmail();
  });

  it("rejects unsubscribed records", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "subscriber-1",
      email: "shopper@example.com",
      status: "unsubscribed",
      unsubscribeToken: "unsubscribe-token",
    });

    const response = await POST(request());

    expect(response.status).toBe(400);
    expectNoMutationOrEmail();
  });

  it("generates a fresh 48-character hexadecimal confirmation token", async () => {
    await POST(request());

    const updateArgs = mocks.update.mock.calls[0][0];

    expect(updateArgs.where).toEqual({
      id: "subscriber-1",
    });

    expect(updateArgs.data.confirmToken).toMatch(
      /^[0-9a-f]{48}$/
    );
  });

  it("sends the updated confirmation token by email", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    expect(mocks.sendNewsletterConfirmEmail).toHaveBeenCalledWith({
      to: "shopper@example.com",
      confirmToken: "new-confirm-token",
      unsubscribeToken: "unsubscribe-token",
    });
  });

  it("updates the confirmation token before sending email", async () => {
    const order: string[] = [];

    mocks.update.mockImplementation(async () => {
      order.push("update");
      return {
        email: "shopper@example.com",
        confirmToken: "new-confirm-token",
        unsubscribeToken: "unsubscribe-token",
      };
    });

    mocks.sendNewsletterConfirmEmail.mockImplementation(async () => {
      order.push("email");
      return {};
    });

    await POST(request());

    expect(order).toEqual(["update", "email"]);
  });

  it("does not send email when the database update fails", async () => {
    mocks.update.mockRejectedValue(
      new Error("Mock database failure")
    );

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("returns an error when email delivery fails", async () => {
    mocks.sendNewsletterConfirmEmail.mockRejectedValue(
      new Error("Mock delivery failure")
    );

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(mocks.update).toHaveBeenCalledOnce();
  });

  it("preserves existing missing-unsubscribe-token handling", async () => {
    mocks.update.mockResolvedValue({
      email: "shopper@example.com",
      confirmToken: "new-confirm-token",
      unsubscribeToken: null,
    });

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("supports explicitly configured HTTPS preview origins", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://preview.veiloraclub.com"
    );

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledOnce();
  });

  it("supports localhost configuration in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "http://localhost:3000"
    );

    const response = await POST(request());

    expect(response.status).toBe(200);
  });

  it("does not expose URL configuration details to Admin callers", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "not-a-valid-url"
    );

    const response = await POST(request());

    expect(response.status).toBe(503);

    const body = JSON.stringify(await response.json());

    expect(body).not.toContain("NEXT_PUBLIC_SITE_URL");
    expect(body).not.toContain("not-a-valid-url");

    expectNoDatabaseAccess();
  });
});
