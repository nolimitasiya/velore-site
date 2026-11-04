import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticated: true,
  findMany: vi.fn(),
  sendNewsletterConfirmEmail: vi.fn(),
  authWrapperCalls: 0,
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/withAdminAuth", () => ({
  withAdminAuth: (handler: (...args: any[]) => Promise<Response>) => {
    mocks.authWrapperCalls++;

    return async (...args: any[]) => {
      if (!mocks.authenticated) {
        return Response.json(
          { ok: false, error: "Unauthorized" },
          { status: 401 }
        );
      }

      return handler(...args);
    };
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    newsletterSubscriber: {
      findMany: mocks.findMany,
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


function pendingSubscriber(
  email: string,
  confirmToken: string | null = "confirm-token",
  unsubscribeToken: string | null = "unsubscribe-token"
) {
  return {
    email,
    confirmToken,
    unsubscribeToken,
  };
}

describe("Bulk Admin newsletter reminder URL safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.authenticated = true;

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://www.veiloraclub.com"
    );
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    vi.spyOn(console, "error").mockImplementation(() => {});

    mocks.findMany.mockResolvedValue([
      pendingSubscriber("first@example.com"),
    ]);

    mocks.sendNewsletterConfirmEmail.mockResolvedValue({
      id: "mock-email-id",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("retains the Admin authentication wrapper", () => {
    expect(mocks.authWrapperCalls).toBeGreaterThan(0);
    expect(POST).toBeTypeOf("function");
  });

  it("rejects unauthenticated callers before database access", async () => {
    mocks.authenticated = false;

    const response = await POST();

    expect(response.status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("preserves authentication precedence over URL errors", async () => {
    mocks.authenticated = false;
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    const response = await POST();

    expect(response.status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("rejects missing production SITE_URL before database access", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    const response = await POST();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Server configuration unavailable.",
    });

    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("rejects malformed production SITE_URL before database access", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "not-a-valid-url");

    const response = await POST();

    expect(response.status).toBe(503);
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("rejects HTTP production SITE_URL", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "http://www.veiloraclub.com"
    );

    const response = await POST();

    expect(response.status).toBe(503);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("rejects localhost production SITE_URL", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://localhost:3000"
    );

    const response = await POST();

    expect(response.status).toBe(503);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("rejects URL credentials", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://user:password@www.veiloraclub.com"
    );

    const response = await POST();

    expect(response.status).toBe(503);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("rejects URL paths", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://www.veiloraclub.com/unexpected"
    );

    const response = await POST();

    expect(response.status).toBe(503);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("rejects URL query strings", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://www.veiloraclub.com?unexpected=true"
    );

    const response = await POST();

    expect(response.status).toBe(503);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("rejects URL fragments", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://www.veiloraclub.com#unexpected"
    );

    const response = await POST();

    expect(response.status).toBe(503);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("does not fall back to legacy APP_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv(
      "NEXT_PUBLIC_APP_URL",
      "https://legacy.example.com"
    );

    const response = await POST();

    expect(response.status).toBe(503);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("does not fall back to VERCEL_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_URL", "preview.example.com");

    const response = await POST();

    expect(response.status).toBe(503);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("queries only pending subscribers", async () => {
    await POST();

    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { status: "pending" },
      select: {
        email: true,
        confirmToken: true,
        unsubscribeToken: true,
      },
    });
  });

  it("returns zero counts for an empty batch", async () => {
    mocks.findMany.mockResolvedValue([]);

    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      sent: 0,
      failed: 0,
      total: 0,
    });

    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("sends one confirmation email for a valid subscriber", async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      sent: 1,
      failed: 0,
      total: 1,
    });

    expect(mocks.sendNewsletterConfirmEmail).toHaveBeenCalledWith({
      to: "first@example.com",
      confirmToken: "confirm-token",
      unsubscribeToken: "unsubscribe-token",
    });
  });

  it("sends multiple valid reminders", async () => {
    mocks.findMany.mockResolvedValue([
      pendingSubscriber("first@example.com", "confirm-1", "unsub-1"),
      pendingSubscriber("second@example.com", "confirm-2", "unsub-2"),
    ]);

    const response = await POST();

    expect(await response.json()).toEqual({
      ok: true,
      sent: 2,
      failed: 0,
      total: 2,
    });

    expect(mocks.sendNewsletterConfirmEmail).toHaveBeenCalledTimes(2);
  });

  it("counts missing confirmation tokens as failures", async () => {
    mocks.findMany.mockResolvedValue([
      pendingSubscriber("first@example.com", null),
    ]);

    const response = await POST();

    expect(await response.json()).toEqual({
      ok: true,
      sent: 0,
      failed: 1,
      total: 1,
    });

    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("counts missing unsubscribe tokens as failures", async () => {
    mocks.findMany.mockResolvedValue([
      pendingSubscriber("first@example.com", "confirm-token", null),
    ]);

    const response = await POST();

    expect(await response.json()).toEqual({
      ok: true,
      sent: 0,
      failed: 1,
      total: 1,
    });

    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("continues processing after a missing-token record", async () => {
    mocks.findMany.mockResolvedValue([
      pendingSubscriber("missing@example.com", null),
      pendingSubscriber("valid@example.com", "valid-confirm", "valid-unsub"),
    ]);

    const response = await POST();

    expect(await response.json()).toEqual({
      ok: true,
      sent: 1,
      failed: 1,
      total: 2,
    });

    expect(mocks.sendNewsletterConfirmEmail).toHaveBeenCalledOnce();
  });

  it("counts an individual email failure without aborting the batch", async () => {
    mocks.findMany.mockResolvedValue([
      pendingSubscriber("first@example.com", "confirm-1", "unsub-1"),
      pendingSubscriber("second@example.com", "confirm-2", "unsub-2"),
    ]);

    mocks.sendNewsletterConfirmEmail
      .mockRejectedValueOnce(new Error("Mock delivery failure"))
      .mockResolvedValueOnce({ id: "mock-email-id" });

    const response = await POST();

    expect(await response.json()).toEqual({
      ok: true,
      sent: 1,
      failed: 1,
      total: 2,
    });

    expect(mocks.sendNewsletterConfirmEmail).toHaveBeenCalledTimes(2);
  });

  it("counts all email failures accurately", async () => {
    mocks.findMany.mockResolvedValue([
      pendingSubscriber("first@example.com", "confirm-1", "unsub-1"),
      pendingSubscriber("second@example.com", "confirm-2", "unsub-2"),
    ]);

    mocks.sendNewsletterConfirmEmail.mockRejectedValue(
      new Error("Mock delivery failure")
    );

    const response = await POST();

    expect(await response.json()).toEqual({
      ok: true,
      sent: 0,
      failed: 2,
      total: 2,
    });
  });

  it("does not attempt email delivery when database lookup fails", async () => {
    mocks.findMany.mockRejectedValue(
      new Error("Mock database failure")
    );

    await expect(
      POST()
    ).rejects.toThrow("Mock database failure");

    expect(mocks.sendNewsletterConfirmEmail).not.toHaveBeenCalled();
  });

  it("supports explicitly configured HTTPS preview origins", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "https://preview.veiloraclub.com"
    );

    const response = await POST();

    expect(response.status).toBe(200);
    expect(mocks.sendNewsletterConfirmEmail).toHaveBeenCalledOnce();
  });

  it("supports localhost configuration in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv(
      "NEXT_PUBLIC_SITE_URL",
      "http://localhost:3000"
    );

    const response = await POST();

    expect(response.status).toBe(200);
  });

  it("does not expose URL configuration details to Admin callers", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "not-a-valid-url");

    const response = await POST();

    expect(response.status).toBe(503);

    const body = JSON.stringify(await response.json());

    expect(body).not.toContain("NEXT_PUBLIC_SITE_URL");
    expect(body).not.toContain("not-a-valid-url");

    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});
