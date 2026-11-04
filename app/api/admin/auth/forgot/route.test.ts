import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import crypto from "node:crypto";

vi.mock("server-only", () => ({}));
import { hashRateLimitIp } from "@/lib/security/hashRateLimitIp";

const {
  rateLimitMock,
  findAdminMock,
  deleteTokensMock,
  createTokenMock,
  makeResetTokenMock,
  hashTokenMock,
  minutesFromNowMock,
  sendResetEmailMock,
} = vi.hoisted(() => ({
  rateLimitMock: vi.fn(),
  findAdminMock: vi.fn(),
  deleteTokensMock: vi.fn(),
  createTokenMock: vi.fn(),
  makeResetTokenMock: vi.fn(),
  hashTokenMock: vi.fn(),
  minutesFromNowMock: vi.fn(),
  sendResetEmailMock: vi.fn(),
}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: rateLimitMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    adminUser: {
      findFirst: findAdminMock,
    },
    passwordResetToken: {
      deleteMany: deleteTokensMock,
      create: createTokenMock,
    },
  },
}));

vi.mock("@/lib/auth/passwordReset", () => ({
  makeResetToken: makeResetTokenMock,
  hashToken: hashTokenMock,
  minutesFromNow: minutesFromNowMock,
}));

vi.mock("@/lib/email/sendResetEmail", () => ({
  sendResetEmail: sendResetEmailMock,
}));

import { POST } from "./route";

const EXPIRY = new Date("2026-10-13T12:00:00.000Z");

function requestForgot(
  email?: string,
  ip = "192.0.2.10",
) {
  return POST(
    new Request("http://localhost:3000/api/admin/auth/forgot", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify(email === undefined ? {} : { email }),
    }),
  );
}

describe("admin forgot-password security", () => {
  const originalVercel = process.env.VERCEL;
  const originalHmacKey = process.env.RATE_LIMIT_IP_HMAC_KEY;
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.VERCEL = "1";
    process.env.RATE_LIMIT_IP_HMAC_KEY = "test-only-rate-limit-ip-key-with-sufficient-length";

    rateLimitMock.mockResolvedValue({
      ok: true,
      remaining: 4,
      resetAt: new Date(),
    });

    findAdminMock.mockResolvedValue(null);
    deleteTokensMock.mockResolvedValue({ count: 0 });
    createTokenMock.mockResolvedValue({});
    makeResetTokenMock.mockReturnValue("raw-test-token");
    hashTokenMock.mockReturnValue("hashed-test-token");
    minutesFromNowMock.mockReturnValue(EXPIRY);
    sendResetEmailMock.mockResolvedValue(undefined);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
  if (originalVercel === undefined) {
    delete process.env.VERCEL;
  } else {
    process.env.VERCEL = originalVercel;
  }
});

  afterEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    if (originalHmacKey === undefined) {
      delete process.env.RATE_LIMIT_IP_HMAC_KEY;
    } else {
      process.env.RATE_LIMIT_IP_HMAC_KEY = originalHmacKey;
    }
  });

  it("never passes the raw client IP to the rate limiter", async () => {
    await requestForgot("privacy@example.test", "192.0.2.10");

    const keys = rateLimitMock.mock.calls.map(
      ([options]) => options.key as string,
    );

    expect(keys.length).toBeGreaterThan(0);
    expect(keys.some((key) => key.includes("192.0.2.10"))).toBe(false);
  });

  it("does not fall back to raw IPs when the HMAC secret is missing", async () => {
    delete process.env.RATE_LIMIT_IP_HMAC_KEY;

    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      await expect(
        requestForgot("privacy@example.test", "192.0.2.10"),
      ).rejects.toThrow("RATE_LIMIT_IP_HMAC_KEY is not configured");

      const keys = rateLimitMock.mock.calls.map(
        ([options]) => options.key as string,
      );

      expect(keys.some((key) => key.includes("192.0.2.10"))).toBe(false);
    } finally {
      consoleSpy.mockRestore();
    }
  });
  it("never passes the raw client IP to the rate limiter", async () => {
    await requestForgot("privacy@example.test", "192.0.2.10");

    const keys = rateLimitMock.mock.calls.map(
      ([options]) => options.key as string,
    );

    expect(keys.length).toBeGreaterThan(0);
    expect(keys.some((key) => key.includes("192.0.2.10"))).toBe(false);
  });

  it("does not fall back to raw IPs when the HMAC secret is missing", async () => {
    delete process.env.RATE_LIMIT_IP_HMAC_KEY;

    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      await expect(
        requestForgot("privacy@example.test", "192.0.2.10"),
      ).rejects.toThrow("RATE_LIMIT_IP_HMAC_KEY is not configured");

      const keys = rateLimitMock.mock.calls.map(
        ([options]) => options.key as string,
      );

      expect(keys.some((key) => key.includes("192.0.2.10"))).toBe(false);
    } finally {
      consoleSpy.mockRestore();
    }
  });
  it("returns a generic response for unknown accounts", async () => {
    const response = await requestForgot("missing@example.test");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    expect(findAdminMock).toHaveBeenCalled();
    expect(createTokenMock).not.toHaveBeenCalled();
    expect(sendResetEmailMock).not.toHaveBeenCalled();
  });

  it("returns a generic response for missing email", async () => {
    const response = await requestForgot();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    expect(findAdminMock).not.toHaveBeenCalled();
    expect(createTokenMock).not.toHaveBeenCalled();
  });

  it("does not generate a token when rate-limited", async () => {
    rateLimitMock.mockResolvedValue({
      ok: false,
      remaining: 0,
      resetAt: new Date(),
    });

    const response = await requestForgot("admin@example.test");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    expect(findAdminMock).not.toHaveBeenCalled();
    expect(createTokenMock).not.toHaveBeenCalled();
    expect(sendResetEmailMock).not.toHaveBeenCalled();
  });

  it("normalises email and uses the IP rate-limit key", async () => {
    await requestForgot("  ADMIN@Example.Test  ");

    expect(rateLimitMock).toHaveBeenCalledWith({
      key: `admin_forgot:${hashRateLimitIp("192.0.2.10")}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    expect(findAdminMock).toHaveBeenCalledWith({
      where: {
        email: {
          equals: "admin@example.test",
          mode: "insensitive",
        },
      },
      select: {
        email: true,
        name: true,
      },
    });
  });

  it("uses the canonical production origin for admin reset links", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.veiloraclub.com");

    findAdminMock.mockResolvedValue({
      email: "admin@example.test",
      name: "Test Admin",
    });

    const response = await requestForgot("admin@example.test");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    expect(sendResetEmailMock).toHaveBeenCalledTimes(1);

    const emailPayload = sendResetEmailMock.mock.calls[0][0];
    const resetUrl = new URL(emailPayload.resetUrl);

    expect(resetUrl.origin).toBe("https://www.veiloraclub.com");
    expect(resetUrl.pathname).toBe("/admin/reset");
    expect(resetUrl.searchParams.get("token")).toBe("raw-test-token");
    expect(resetUrl.searchParams.get("email")).toBe("admin@example.test");
  });

  it("rejects missing production URL configuration before account lookup", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    const response = await requestForgot("admin@example.test");

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Server configuration unavailable.",
    });

    expect(findAdminMock).not.toHaveBeenCalled();
    expect(deleteTokensMock).not.toHaveBeenCalled();
    expect(createTokenMock).not.toHaveBeenCalled();
    expect(sendResetEmailMock).not.toHaveBeenCalled();
  });

  it("rejects invalid production URL configuration without token mutations", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");

    const response = await requestForgot("admin@example.test");

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Server configuration unavailable.",
    });

    expect(findAdminMock).not.toHaveBeenCalled();
    expect(deleteTokensMock).not.toHaveBeenCalled();
    expect(createTokenMock).not.toHaveBeenCalled();
    expect(sendResetEmailMock).not.toHaveBeenCalled();
  });

  it("returns identical configuration errors regardless of account existence", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    findAdminMock.mockResolvedValue({
      email: "admin@example.test",
      name: "Test Admin",
    });

    const existingResponse = await requestForgot("admin@example.test");
    const existingBody = await existingResponse.json();

    findAdminMock.mockResolvedValue(null);

    const unknownResponse = await requestForgot("missing@example.test");
    const unknownBody = await unknownResponse.json();

    expect(existingResponse.status).toBe(503);
    expect(unknownResponse.status).toBe(503);
    expect(existingBody).toEqual(unknownBody);

    expect(findAdminMock).not.toHaveBeenCalled();
    expect(deleteTokensMock).not.toHaveBeenCalled();
    expect(createTokenMock).not.toHaveBeenCalled();
    expect(sendResetEmailMock).not.toHaveBeenCalled();
  });

  it("does not fall back to legacy URL variables in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://legacy.example.com");
    vi.stubEnv("VERCEL_URL", "preview.example.com");

    const response = await requestForgot("admin@example.test");

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Server configuration unavailable.",
    });

    expect(findAdminMock).not.toHaveBeenCalled();
    expect(deleteTokensMock).not.toHaveBeenCalled();
    expect(createTokenMock).not.toHaveBeenCalled();
    expect(sendResetEmailMock).not.toHaveBeenCalled();
  });
  it("stores the hashed token and sends the raw token only in the reset link", async () => {
    findAdminMock.mockResolvedValue({
      email: "admin@example.test",
      name: "Test Admin",
    });

    const response = await requestForgot("admin@example.test");

    expect(response.status).toBe(200);

    expect(deleteTokensMock).toHaveBeenCalledWith({
      where: {
        userType: "ADMIN",
        email: "admin@example.test",
      },
    });

    expect(hashTokenMock).toHaveBeenCalledWith("raw-test-token");

    expect(createTokenMock).toHaveBeenCalledWith({
      data: {
        userType: "ADMIN",
        email: "admin@example.test",
        tokenHash: "hashed-test-token",
        expiresAt: EXPIRY,
      },
    });

    expect(sendResetEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "admin@example.test",
        userType: "ADMIN",
        name: "Test Admin",
        resetUrl: expect.stringContaining(
          "token=raw-test-token",
        ),
      }),
    );
  });

  it("does not reveal email delivery failures in its response", async () => {
    findAdminMock.mockResolvedValue({
      email: "admin@example.test",
      name: "Test Admin",
    });

    sendResetEmailMock.mockRejectedValue(
      new Error("Simulated email failure"),
    );

    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const response = await requestForgot("admin@example.test");

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
      expect(createTokenMock).toHaveBeenCalled();
      expect(sendResetEmailMock).toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });
  it("rate-limits reset requests by hashed email independently of IP", async () => {
  const email = "admin@example.test";

  const emailHash = crypto
    .createHash("sha256")
    .update(email)
    .digest("hex");

  await requestForgot("  ADMIN@Example.Test  ", "192.0.2.10");

  expect(rateLimitMock).toHaveBeenCalledWith({
    key: `admin_forgot:account:${emailHash}`,
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });
});
it("does not generate a reset token when the account limit is reached", async () => {
  rateLimitMock.mockImplementation(async ({ key }) => {
    if (key.startsWith("admin_forgot:account:")) {
      return {
        ok: false,
        remaining: 0,
        resetAt: new Date(),
      };
    }

    return {
      ok: true,
      remaining: 4,
      resetAt: new Date(),
    };
  });

  const response = await requestForgot("admin@example.test");

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true });

  expect(findAdminMock).not.toHaveBeenCalled();
  expect(createTokenMock).not.toHaveBeenCalled();
  expect(sendResetEmailMock).not.toHaveBeenCalled();
});
it("does not use an unverified IP as a rate-limit key", async () => {
  delete process.env.VERCEL;

  await requestForgot("admin@example.test");

  expect(rateLimitMock).toHaveBeenCalledTimes(1);

  expect(rateLimitMock).toHaveBeenCalledWith(
    expect.objectContaining({
      key: expect.stringMatching(/^admin_forgot:account:/),
    }),
  );
});

it("does not create a shared unknown-IP bucket", async () => {
  process.env.VERCEL = "1";

  await POST(
    new Request("http://localhost:3000/api/admin/auth/forgot", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "admin@example.test",
      }),
    }),
  );

  expect(rateLimitMock).toHaveBeenCalledTimes(1);

  expect(rateLimitMock).toHaveBeenCalledWith(
    expect.objectContaining({
      key: expect.stringMatching(/^admin_forgot:account:/),
    }),
  );
});
});