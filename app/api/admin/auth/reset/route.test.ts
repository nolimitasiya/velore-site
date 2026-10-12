import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  transaction: vi.fn(),
  claimToken: vi.fn(),
  updateAdmin: vi.fn(),
  revokeSessions: vi.fn(),
  hashPassword: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    passwordResetToken: {
      findUnique: mocks.findUnique,
    },
    adminUser: {
      findFirst: mocks.findFirst,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: mocks.hashPassword,
  },
}));

vi.mock("@/lib/auth/passwordReset", () => ({
  hashToken: vi.fn(() => "hashed-reset-token"),
}));

vi.mock("@/lib/auth/passwordStrength", () => ({
  validatePassword: vi.fn((password: string) => ({
    ok: password.length >= 12,
    errors: password.length >= 12 ? [] : ["Password too short"],
  })),
}));

import { POST } from "./route";

const EMAIL = "admin@example.com";
const PASSWORD = "SecurePassword123!";

function makeRequest(overrides: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/admin/auth/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: EMAIL,
      token: "reset-token",
      password: PASSWORD,
      ...overrides,
    }),
  });
}

function validToken(overrides: Record<string, unknown> = {}) {
  return {
    id: "reset-123",
    email: EMAIL,
    userType: "ADMIN",
    usedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  };
}

describe("admin password reset", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mocks.findUnique.mockImplementation(async () => validToken());
    mocks.findFirst.mockResolvedValue({ id: "admin-123" });
    mocks.hashPassword.mockResolvedValue("hashed-new-password");

    mocks.claimToken.mockResolvedValue({ count: 1 });
    mocks.updateAdmin.mockResolvedValue({ id: "admin-123" });
    mocks.revokeSessions.mockResolvedValue({ count: 2 });

    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        passwordResetToken: {
          updateMany: mocks.claimToken,
        },
        adminUser: {
          update: mocks.updateAdmin,
        },
        adminAuthSession: {
          updateMany: mocks.revokeSessions,
        },
      })
    );
  });

  it("rejects weak passwords", async () => {
    const response = await POST(makeRequest({ password: "weak" }));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("WEAK_PASSWORD");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects expired tokens", async () => {
    mocks.findUnique.mockResolvedValue(
      validToken({ expiresAt: new Date(Date.now() - 1000) })
    );

    const response = await POST(makeRequest());

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("INVALID_OR_EXPIRED");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects previously used tokens", async () => {
    mocks.findUnique.mockResolvedValue(
      validToken({ usedAt: new Date() })
    );

    const response = await POST(makeRequest());

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects tokens belonging to another account type", async () => {
    mocks.findUnique.mockResolvedValue(
      validToken({ userType: "BRAND" })
    );

    const response = await POST(makeRequest());

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("updates the password and revokes sessions after claiming the token", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    expect(mocks.claimToken).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          usedAt: null,
          userType: "ADMIN",
          expiresAt: { gt: expect.any(Date) },
        }),
      })
    );

    expect(mocks.updateAdmin).toHaveBeenCalledWith({
      where: { id: "admin-123" },
      data: { password: "hashed-new-password" },
    });

    expect(mocks.revokeSessions).toHaveBeenCalledWith({
      where: {
        adminId: "admin-123",
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
  });

  it("rejects a token already claimed by another request", async () => {
    mocks.claimToken.mockResolvedValue({ count: 0 });

    const response = await POST(makeRequest());

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("INVALID_OR_EXPIRED");

    expect(mocks.updateAdmin).not.toHaveBeenCalled();
    expect(mocks.revokeSessions).not.toHaveBeenCalled();
  });

  it("returns a safe error if the transaction fails", async () => {
    mocks.updateAdmin.mockRejectedValue(new Error("Database failure"));

    const response = await POST(makeRequest());

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("RESET_FAILED");
  });
});