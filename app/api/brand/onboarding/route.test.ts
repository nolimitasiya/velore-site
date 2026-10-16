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
  applicationUpdateManyMock,
  applicationFindUniqueMock,
  syncBrandProfileMock,
  sendLifecycleEventMock,
} = vi.hoisted(() => ({
  inviteFindUniqueMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  inviteUpdateManyMock: vi.fn(),
  userCreateMock: vi.fn(),
  membershipCreateMock: vi.fn(),
  sessionCreateMock: vi.fn(),
  transactionMock: vi.fn(),
  applicationUpdateManyMock: vi.fn(),
  applicationFindUniqueMock: vi.fn(),
  syncBrandProfileMock: vi.fn(),
  sendLifecycleEventMock: vi.fn(),
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
    brandApplication: {
        findUnique: applicationFindUniqueMock,
     },
  },
}));

vi.mock("@/lib/klaviyo/brandLifecycle", () => ({
  syncBrandProfileToKlaviyo: syncBrandProfileMock,
  sendBrandLifecycleEventToKlaviyo: sendLifecycleEventMock,
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
  applicationId: null as string | null,
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
    brandApplication: {
      updateMany: applicationUpdateManyMock,
    },
  }),
);
    applicationUpdateManyMock.mockResolvedValue({ count: 1 });

applicationFindUniqueMock.mockResolvedValue({
  id: "application-001",
  firstName: "Example",
  lastName: "Founder",
  email: "brand@example.com",
  companyName: "Example Fashion",
  phone: null,
  website: null,
  socialMedia: null,
  countryCode: null,
  city: null,
});

syncBrandProfileMock.mockResolvedValue(undefined);
sendLifecycleEventMock.mockResolvedValue(undefined);
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
  it("rejects weak onboarding passwords before claiming an invitation", async () => {
  const response = await POST(
    makePostRequest({
      token: VALID_TOKEN,
      email: "brand@example.com",
      password: "123",
    }),
  );

  expect(response.status).toBe(400);

  const data = await response.json();

  expect(data.ok).toBe(false);
  expect(data.error).toBe("WEAK_PASSWORD");

  expect(transactionMock).not.toHaveBeenCalled();
  expect(userCreateMock).not.toHaveBeenCalled();
  expect(membershipCreateMock).not.toHaveBeenCalled();
  expect(sessionCreateMock).not.toHaveBeenCalled();
});
it("marks the linked application onboarded after successful account creation", async () => {
  inviteFindUniqueMock.mockResolvedValue({
    ...validInvite,
    applicationId: "application-001",
  });

  const response = await POST(
    makePostRequest({
      token: VALID_TOKEN,
      email: "brand@example.com",
      password: "SecurePassword123!",
    })
  );

  expect(response.status).toBe(200);

  expect(applicationUpdateManyMock).toHaveBeenCalledWith({
    where: {
      id: "application-001",
      status: "contract_signed",
    },
    data: {
      status: "onboarded",
    },
  });

  expect(sendLifecycleEventMock).toHaveBeenCalledWith(
    expect.objectContaining({
      applicationId: "application-001",
      stage: "onboarded",
      eventName: "Brand Onboarded",
    })
  );
});

it("does not update an application for a generic invitation", async () => {
  const response = await POST(
    makePostRequest({
      token: VALID_TOKEN,
      password: "SecurePassword123!",
    })
  );

  expect(response.status).toBe(200);
  expect(applicationUpdateManyMock).not.toHaveBeenCalled();
  expect(applicationFindUniqueMock).not.toHaveBeenCalled();
  expect(sendLifecycleEventMock).not.toHaveBeenCalled();
});

it("rejects onboarding when the linked application is no longer eligible", async () => {
  inviteFindUniqueMock.mockResolvedValue({
    ...validInvite,
    applicationId: "application-001",
  });

  applicationUpdateManyMock.mockResolvedValue({ count: 0 });

  const response = await POST(
    makePostRequest({
      token: VALID_TOKEN,
      password: "SecurePassword123!",
    })
  );

  expect(response.status).toBe(409);
  expect(response.headers.get("set-cookie")).toBeNull();
  expect(sendLifecycleEventMock).not.toHaveBeenCalled();
});
it("keeps onboarding successful when Klaviyo profile sync fails", async () => {
  inviteFindUniqueMock.mockResolvedValue({
    ...validInvite,
    applicationId: "application-001",
  });

  syncBrandProfileMock.mockRejectedValue(
    new Error("Simulated Klaviyo profile failure")
  );

  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  try {
    const response = await POST(
      makePostRequest({
        token: VALID_TOKEN,
        password: "SecurePassword123!",
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("brand_authed=");

    expect(applicationUpdateManyMock).toHaveBeenCalledTimes(1);
    expect(sendLifecycleEventMock).toHaveBeenCalledTimes(1);
  } finally {
    consoleSpy.mockRestore();
  }
});

it("keeps onboarding successful when the Klaviyo lifecycle event fails", async () => {
  inviteFindUniqueMock.mockResolvedValue({
    ...validInvite,
    applicationId: "application-001",
  });

  sendLifecycleEventMock.mockRejectedValue(
    new Error("Simulated Klaviyo event failure")
  );

  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  try {
    const response = await POST(
      makePostRequest({
        token: VALID_TOKEN,
        password: "SecurePassword123!",
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("brand_authed=");

    expect(applicationUpdateManyMock).toHaveBeenCalledTimes(1);
    expect(syncBrandProfileMock).toHaveBeenCalledTimes(1);
  } finally {
    consoleSpy.mockRestore();
  }
});
it("does not authenticate when the application status update fails", async () => {
  inviteFindUniqueMock.mockResolvedValue({
    ...validInvite,
    applicationId: "application-001",
  });

  applicationUpdateManyMock.mockRejectedValue(
    new Error("Simulated database update failure")
  );

  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  try {
    const response = await POST(
      makePostRequest({
        token: VALID_TOKEN,
        password: "SecurePassword123!",
      })
    );

    expect(response.status).toBe(500);
    expect(response.headers.get("set-cookie")).toBeNull();

    expect(sendLifecycleEventMock).not.toHaveBeenCalled();
    expect(syncBrandProfileMock).not.toHaveBeenCalled();
  } finally {
    consoleSpy.mockRestore();
  }
});
it("rejects a revoked invitation without creating an account or session", async () => {
  // Revocation marks usedAt, making the invitation unusable.
  inviteFindUniqueMock.mockResolvedValue({
    ...validInvite,
    usedAt: new Date(),
  });

  const response = await POST(
    makePostRequest({
      token: VALID_TOKEN,
      email: "brand@example.com",
      password: "SecurePassword123!",
    })
  );

  const result = await response.json();

  expect(response.status).toBe(400);
  expect(result.ok).toBe(false);

  // No onboarding transaction should begin.
  expect(transactionMock).not.toHaveBeenCalled();

  // No account, membership, or session should be created.
  expect(userCreateMock).not.toHaveBeenCalled();
  expect(membershipCreateMock).not.toHaveBeenCalled();
  expect(sessionCreateMock).not.toHaveBeenCalled();

  // The revoked invitation must not be claimed again.
  expect(inviteUpdateManyMock).not.toHaveBeenCalled();

  // No authentication cookie should be issued.
  expect(response.headers.has("set-cookie")).toBe(false);

  // No onboarding lifecycle events should be sent.
  expect(syncBrandProfileMock).not.toHaveBeenCalled();
  expect(sendLifecycleEventMock).not.toHaveBeenCalled();
});
it("does not validate a revoked invitation through GET", async () => {
  inviteFindUniqueMock.mockResolvedValue({
    ...validInvite,
    usedAt: new Date(),
  });

  const response = await GET(makeGetRequest());

  expect(response.status).toBe(400);

  // GET must never create an account or authentication session.
  expect(transactionMock).not.toHaveBeenCalled();
  expect(userCreateMock).not.toHaveBeenCalled();
  expect(membershipCreateMock).not.toHaveBeenCalled();
  expect(sessionCreateMock).not.toHaveBeenCalled();
});
});
