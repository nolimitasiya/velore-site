import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/security/loginAudit", () => ({
  recordLoginAudit: recordLoginAuditMock,
}));

const {
  findUserMock,
  findMembershipsMock,
  rateLimitMock,
  compareMock,
  createSessionMock,
  recordLoginAuditMock,
} = vi.hoisted(() => ({
  findUserMock: vi.fn(),
  findMembershipsMock: vi.fn(),
  rateLimitMock: vi.fn(),
  compareMock: vi.fn(),
  createSessionMock: vi.fn(),
  recordLoginAuditMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: findUserMock,
    },
    brandMembership: {
      findMany: findMembershipsMock,
    },
  },
}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: rateLimitMock,
}));

vi.mock("@/lib/auth/passwordVerification", () => ({
  verifyLoginPassword: compareMock,
}));

vi.mock("@/lib/auth/brandDbSession", () => ({
  createBrandSession: createSessionMock,
}));

import { POST } from "./route";

const EMAIL = "brand@example.com";
const PASSWORD = "SecurePassword123!";
const USER_ID = "00000000-0000-0000-0000-000000000002";
const BRAND_ID = "00000000-0000-0000-0000-000000000001";

function makeRequest(email = EMAIL, password = PASSWORD) {
  return new Request("http://localhost/api/brand/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
}

describe("brand login API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    recordLoginAuditMock.mockResolvedValue(undefined);

    rateLimitMock.mockResolvedValue({
      ok: true,
      remaining: 9,
      resetAt: new Date(Date.now() + 15 * 60_000),
    });

    findUserMock.mockResolvedValue({
      id: USER_ID,
      email: EMAIL,
      password: "stored-password-hash",
      name: "Example Founder",
    });

    compareMock.mockResolvedValue(true);

    findMembershipsMock.mockResolvedValue([
      {
        role: "owner",
        brand: {
          id: BRAND_ID,
          slug: "example-fashion",
          name: "Example Fashion",
        },
      },
    ]);

    createSessionMock.mockResolvedValue("a".repeat(64));
  });

  it("rejects missing credentials before rate limiting", async () => {
    const response = await POST(makeRequest("", ""));

    expect(response.status).toBe(400);
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(findUserMock).not.toHaveBeenCalled();
  });

  it("applies the brand account-based rate limit", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);

    expect(rateLimitMock).toHaveBeenCalledWith({
      key: expect.stringMatching(/^brand_login:account:[a-f0-9]{64}$/),
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
  });

  it("returns 429 and Retry-After when rate limited", async () => {
    rateLimitMock.mockResolvedValue({
      ok: false,
      remaining: 0,
      resetAt: new Date(Date.now() + 60_000),
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toMatch(/^\d+$/);

    expect(findUserMock).not.toHaveBeenCalled();
    expect(compareMock).not.toHaveBeenCalled();
    expect(createSessionMock).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("returns 401 for an unknown account", async () => {
    findUserMock.mockResolvedValue(null);

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe("Invalid email or password");
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it("returns 401 for an incorrect password", async () => {
    compareMock.mockResolvedValue(false);

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe("Invalid email or password");
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it("rejects users without brand access", async () => {
    findMembershipsMock.mockResolvedValue([]);

    const response = await POST(makeRequest());

    expect(response.status).toBe(403);
    expect(createSessionMock).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("requires explicit selection for multiple brands", async () => {
    findMembershipsMock.mockResolvedValue([
      {
        role: "owner",
        brand: {
          id: BRAND_ID,
          slug: "example-fashion",
          name: "Example Fashion",
        },
      },
      {
        role: "editor",
        brand: {
          id: "00000000-0000-0000-0000-000000000003",
          slug: "second-brand",
          name: "Second Brand",
        },
      },
    ]);

    const response = await POST(makeRequest());

    expect(response.status).toBe(409);

    const data = await response.json();

    expect(data.brands).toHaveLength(2);
    expect(createSessionMock).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("creates a session and sets both brand cookies", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(createSessionMock).toHaveBeenCalledWith(USER_ID);

    const cookieHeader = response.headers.get("set-cookie");

    expect(cookieHeader).toContain("brand_authed=");
    expect(cookieHeader).toContain("brand_id=");
    expect(cookieHeader).toContain("HttpOnly");
  });

  it("fails closed when the rate limiter is unavailable", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      rateLimitMock.mockRejectedValue(
        new Error("Simulated rate limiter failure"),
      );

      const response = await POST(makeRequest());

      expect(response.status).toBe(500);
      expect(createSessionMock).not.toHaveBeenCalled();
      expect(response.headers.get("set-cookie")).toBeNull();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("does not issue cookies when session creation fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      createSessionMock.mockRejectedValue(
        new Error("Simulated session failure"),
      );

      const response = await POST(makeRequest());

      expect(response.status).toBe(500);
      expect(response.headers.get("set-cookie")).toBeNull();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("performs password verification even when the brand account does not exist", async () => {
    findUserMock.mockResolvedValue(null);

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);

    expect(compareMock).toHaveBeenCalledWith(PASSWORD, undefined);

    expect(createSessionMock).not.toHaveBeenCalled();
  });
  it("records a successful brand login", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);

    expect(recordLoginAuditMock).toHaveBeenCalledWith({
      type: "BRAND_LOGIN_SUCCEEDED",
      email: EMAIL,
      userId: USER_ID,
    });
  });

  it("records a failed brand login", async () => {
    compareMock.mockResolvedValue(false);

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);

    expect(recordLoginAuditMock).toHaveBeenCalledWith({
      type: "BRAND_LOGIN_FAILED",
      email: EMAIL,
      userId: USER_ID,
    });
  });

  it("records a rate-limited brand login", async () => {
    rateLimitMock.mockResolvedValue({
      ok: false,
      remaining: 0,
      resetAt: new Date(Date.now() + 60_000),
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(429);

    expect(recordLoginAuditMock).toHaveBeenCalledWith({
      type: "BRAND_LOGIN_RATE_LIMITED",
      email: EMAIL,
      rateLimitResetAt: expect.any(Date),
    });
  });
});
