import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/security/loginAudit", () => ({
  recordLoginAudit: recordLoginAuditMock,
}));

const {
  findAdminMock,
  rateLimitMock,
  compareMock,
  createSessionMock,
  recordLoginAuditMock,
} = vi.hoisted(() => ({
  findAdminMock: vi.fn(),
  rateLimitMock: vi.fn(),
  compareMock: vi.fn(),
  createSessionMock: vi.fn(),
  recordLoginAuditMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    adminUser: {
      findUnique: findAdminMock,
    },
  },
}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: rateLimitMock,
}));

vi.mock("@/lib/auth/passwordVerification", () => ({
  verifyLoginPassword: compareMock,
}));

vi.mock("@/lib/auth/adminDbSession", () => ({
  createAdminSession: createSessionMock,
}));

import { POST } from "./route";

const EMAIL = "admin@example.com";
const PASSWORD = "SecurePassword123!";

function makeRequest(email: string = EMAIL, password: string = PASSWORD) {
  return new Request("http://localhost/api/admin/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
}

describe("admin login API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    recordLoginAuditMock.mockResolvedValue(undefined);

    rateLimitMock.mockResolvedValue({
      ok: true,
      remaining: 4,
      resetAt: new Date(Date.now() + 15 * 60_000),
    });

    findAdminMock.mockResolvedValue({
      id: "admin-123",
      email: EMAIL,
      password: "stored-password-hash",
    });

    compareMock.mockResolvedValue(true);

    createSessionMock.mockResolvedValue("a".repeat(64));
  });

  it("rejects missing credentials before rate limiting", async () => {
    const response = await POST(makeRequest("", ""));

    expect(response.status).toBe(400);
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(findAdminMock).not.toHaveBeenCalled();
  });

  it("applies the account-based rate limit", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);

    expect(rateLimitMock).toHaveBeenCalledWith({
      key: expect.stringMatching(/^admin_login:account:[a-f0-9]{64}$/),
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });
  });

  it("returns 429 and Retry-After when the limit is exceeded", async () => {
    rateLimitMock.mockResolvedValue({
      ok: false,
      remaining: 0,
      resetAt: new Date(Date.now() + 60_000),
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toMatch(/^\d+$/);

    expect(findAdminMock).not.toHaveBeenCalled();
    expect(compareMock).not.toHaveBeenCalled();
    expect(createSessionMock).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("returns 401 for an unknown administrator", async () => {
    findAdminMock.mockResolvedValue(null);

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

  it("creates a secure session after successful authentication", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(createSessionMock).toHaveBeenCalledWith("admin-123");

    const cookie = response.headers.get("set-cookie");

    expect(cookie).toContain("admin_authed=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
  });

  it("fails closed if the rate limiter is unavailable", async () => {
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

  it("does not issue a cookie if session creation fails", async () => {
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
  it("returns 401 for an unknown administrator", async () => {
    findAdminMock.mockResolvedValue(null);

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);

    expect(compareMock).toHaveBeenCalledWith(PASSWORD, undefined);

    expect(createSessionMock).not.toHaveBeenCalled();
  });
  it("records a successful administrator login", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);

    expect(recordLoginAuditMock).toHaveBeenCalledWith({
      type: "ADMIN_LOGIN_SUCCEEDED",
      email: EMAIL,
      adminId: "admin-123",
    });
  });

  it("records a failed administrator login", async () => {
    compareMock.mockResolvedValue(false);

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);

    expect(recordLoginAuditMock).toHaveBeenCalledWith({
      type: "ADMIN_LOGIN_FAILED",
      email: EMAIL,
      adminId: "admin-123",
    });
  });

  it("records a rate-limited administrator login", async () => {
    rateLimitMock.mockResolvedValue({
      ok: false,
      remaining: 0,
      resetAt: new Date(Date.now() + 60_000),
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(429);

    expect(recordLoginAuditMock).toHaveBeenCalledWith({
      type: "ADMIN_LOGIN_RATE_LIMITED",
      email: EMAIL,
      rateLimitResetAt: expect.any(Date),
    });
  });
});
