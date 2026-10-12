import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const {
  inviteFindUniqueMock,
  userFindUniqueMock,
  inviteUpdateManyMock,
  userCreateMock,
  membershipCreateMock,
  sessionCreateMock,
  transactionMock,
} = vi.hoisted(() => ({
  inviteFindUniqueMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  inviteUpdateManyMock: vi.fn(),
  userCreateMock: vi.fn(),
  membershipCreateMock: vi.fn(),
  sessionCreateMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    brandInvite: {
      findUnique: inviteFindUniqueMock,
    },
    user: {
      findUnique: userFindUniqueMock,
    },
    $transaction: transactionMock,
  },
}));

import { GET, POST } from "./route";

const VALID_TOKEN = "test-invitation-token";

const validInvite = {
  id: "invite-123",
  email: "brand@example.com",
  brandId: "00000000-0000-0000-0000-000000000001",
  role: "owner",
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  usedAt: null,
};

const createdUser = {
  id: "00000000-0000-0000-0000-000000000002",
  email: "brand@example.com",
  name: null,
};

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/brand/onboarding", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(token = VALID_TOKEN) {
  return new Request(
    `http://localhost/api/brand/onboarding?token=${encodeURIComponent(token)}`,
  );
}

describe("brand onboarding API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    inviteFindUniqueMock.mockResolvedValue({
      ...validInvite,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    userFindUniqueMock.mockResolvedValue(null);

    inviteUpdateManyMock.mockResolvedValue({ count: 1 });
    userCreateMock.mockResolvedValue(createdUser);
    membershipCreateMock.mockResolvedValue({ id: "membership-123" });
    sessionCreateMock.mockResolvedValue({ id: "session-123" });

    transactionMock.mockImplementation(async (callback) =>
      callback({
        brandInvite: {
          updateMany: inviteUpdateManyMock,
        },
        user: {
          create: userCreateMock,
        },
        brandMembership: {
          create: membershipCreateMock,
        },
        brandAuthSession: {
          create: sessionCreateMock,
        },
      }),
    );
  });

  it("creates a user and membership for a valid invitation", async () => {
    const response = await POST(
      makePostRequest({
        token: VALID_TOKEN,
        email: "brand@example.com",
        password: "SecurePassword123!",
      }),
    );

    expect(response.status).toBe(200);
    expect(sessionCreateMock).toHaveBeenCalledWith({
      data: {
        userId: expect.any(String),
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        expiresAt: expect.any(Date),
      },
    });

    expect(inviteUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: validInvite.id,
          usedAt: null,
          expiresAt: {
            gt: expect.any(Date),
          },
        }),
      }),
    );

    expect(userCreateMock).toHaveBeenCalledTimes(1);

    expect(membershipCreateMock).toHaveBeenCalledWith({
      data: {
        userId: createdUser.id,
        brandId: validInvite.brandId,
        role: validInvite.role,
      },
    });

    expect(response.headers.get("set-cookie")).toContain("brand_authed=");
  });

  it("rejects an already-used invitation", async () => {
    inviteFindUniqueMock.mockResolvedValue({
      ...validInvite,
      usedAt: new Date(),
    });

    const response = await POST(
      makePostRequest({
        token: VALID_TOKEN,
        password: "SecurePassword123!",
      }),
    );

    expect(response.status).toBe(400);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("rejects an expired invitation", async () => {
    inviteFindUniqueMock.mockResolvedValue({
      ...validInvite,
      expiresAt: new Date(Date.now() - 60_000),
    });

    const response = await POST(
      makePostRequest({
        token: VALID_TOKEN,
        password: "SecurePassword123!",
      }),
    );

    expect(response.status).toBe(400);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("rejects an email address different from the invited email", async () => {
    const response = await POST(
      makePostRequest({
        token: VALID_TOKEN,
        email: "attacker@example.com",
        password: "SecurePassword123!",
      }),
    );

    expect(response.status).toBe(400);
    expect(userCreateMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("does not overwrite an existing user's password", async () => {
    userFindUniqueMock.mockResolvedValue({
      id: "existing-user",
    });

    const response = await POST(
      makePostRequest({
        token: VALID_TOKEN,
        password: "ReplacementPassword123!",
      }),
    );

    expect(response.status).toBe(409);
    expect(userCreateMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("rejects an invitation claimed by another request", async () => {
    inviteUpdateManyMock.mockResolvedValue({ count: 0 });

    const response = await POST(
      makePostRequest({
        token: VALID_TOKEN,
        password: "SecurePassword123!",
      }),
    );

    expect(response.status).toBe(409);
    expect(userCreateMock).not.toHaveBeenCalled();
    expect(membershipCreateMock).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("does not establish a session when membership creation fails", async () => {
    membershipCreateMock.mockRejectedValue(
      new Error("Simulated membership failure"),
    );

    const response = await POST(
      makePostRequest({
        token: VALID_TOKEN,
        password: "SecurePassword123!",
      }),
    );

    expect(response.status).toBe(500);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("handles a concurrent duplicate account conflict", async () => {
    userCreateMock.mockRejectedValue({
      code: "P2002",
    });

    const response = await POST(
      makePostRequest({
        token: VALID_TOKEN,
        password: "SecurePassword123!",
      }),
    );

    expect(response.status).toBe(409);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("returns invitation details for a valid GET request", async () => {
    inviteFindUniqueMock.mockResolvedValue({
      ...validInvite,
      brand: {
        name: "Example Fashion",
      },
    });

    const response = await GET(makeGetRequest());

    expect(response.status).toBe(200);

    const data = await response.json();

    expect(data).toMatchObject({
      ok: true,
      email: "brand@example.com",
      brandName: "Example Fashion",
    });
  });

  it("does not establish authentication cookies when session creation fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      sessionCreateMock.mockRejectedValue(
        new Error("Simulated session creation failure"),
      );

      const response = await POST(
        new Request("http://localhost/api/brand/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: "VALID_TOKEN",
            email: "brand@example.com",
            password: "SecurePassword123!",
          }),
        }),
      );

      expect(response.status).toBe(500);
      expect((await response.json()).ok).toBe(false);

      expect(sessionCreateMock).toHaveBeenCalled();

      expect(response.cookies.get("brand_authed")).toBeUndefined();
      expect(response.cookies.get("brand_id")).toBeUndefined();
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
