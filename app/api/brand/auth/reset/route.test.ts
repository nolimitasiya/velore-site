import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  transaction: vi.fn(),
  claimToken: vi.fn(),
  updateUser: vi.fn(),
  revokeSessions: vi.fn(),
  hashPassword: vi.fn(),
  findMembership: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    passwordResetToken: {
      findUnique: mocks.findUnique,
    },
    user: {
      findFirst: mocks.findFirst,
    },
    $transaction: mocks.transaction,
    brandMembership: {
      findFirst: mocks.findMembership,
    },
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

const EMAIL = "brand@example.com";
const PASSWORD = "SecurePassword123!";

function makeRequest(overrides: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/brand/auth/reset", {
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
    userType: "BRAND",
    usedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  };
}

describe("brand password reset", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mocks.findUnique.mockImplementation(async () => validToken());
    mocks.findFirst.mockResolvedValue({ id: "brand-user-123" });
    mocks.hashPassword.mockResolvedValue("hashed-new-password");

    mocks.claimToken.mockResolvedValue({ count: 1 });
    mocks.updateUser.mockResolvedValue({ id: "brand-user-123" });
    mocks.revokeSessions.mockResolvedValue({ count: 2 });
    mocks.findMembership.mockResolvedValue({brandId: "test-brand-id",});

mocks.transaction.mockImplementation(async (callback) =>
   callback({
    passwordResetToken: {
      updateMany: mocks.claimToken,
    },
    brandMembership: {
      findFirst: mocks.findMembership,
    },
    user: {
      update: mocks.updateUser,
    },
    brandAuthSession: {
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
      validToken({ userType: "ADMIN" })
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
          userType: "BRAND",
          expiresAt: { gt: expect.any(Date) },
        }),
      })
    );

    expect(mocks.updateUser).toHaveBeenCalledWith({
      where: { id: "brand-user-123" },
      data: { password: "hashed-new-password" },
    });

    expect(mocks.revokeSessions).toHaveBeenCalledWith({
      where: {
        userId: "brand-user-123",
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

    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(mocks.revokeSessions).not.toHaveBeenCalled();
  });

  it("returns a safe error if the transaction fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      mocks.updateUser.mockRejectedValue(new Error("Database failure"));

      const response = await POST(makeRequest());

      expect(response.status).toBe(500);
      expect((await response.json()).error).toBe("RESET_FAILED");
    } finally {
      consoleSpy.mockRestore();
    }
  });
  it("rejects existing Brand reset tokens belonging to shoppers without Brand membership", async () => {
  mocks.findFirst.mockResolvedValue({
    id: "shopper-user-123",
  });

  mocks.findMembership.mockResolvedValue(null);

  const response = await POST(makeRequest());

  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    ok: false,
    error: "INVALID_OR_EXPIRED",
  });

  expect(mocks.findMembership).toHaveBeenCalledWith({
    where: {
      userId: "shopper-user-123",
    },
    select: {
      brandId: true,
    },
  });

  expect(mocks.hashPassword).not.toHaveBeenCalled();
  expect(mocks.transaction).not.toHaveBeenCalled();
  expect(mocks.claimToken).not.toHaveBeenCalled();
  expect(mocks.updateUser).not.toHaveBeenCalled();
  expect(mocks.revokeSessions).not.toHaveBeenCalled();
});
it("rejects a reset if Brand membership disappears before the password update", async () => {
  mocks.findMembership
    .mockResolvedValueOnce({ brandId: "test-brand-id" })
    .mockResolvedValueOnce(null);

  const response = await POST(makeRequest());

  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    ok: false,
    error: "INVALID_OR_EXPIRED",
  });

  expect(mocks.findMembership).toHaveBeenCalledTimes(2);
  expect(mocks.claimToken).toHaveBeenCalled();

  expect(mocks.updateUser).not.toHaveBeenCalled();
  expect(mocks.revokeSessions).not.toHaveBeenCalled();
});
});