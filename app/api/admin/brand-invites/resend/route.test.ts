import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdminSessionMock,
  inviteFindUniqueMock,
  inviteCreateMock,
  sendKlaviyoMock,
  inviteUpdateManyMock,
  transactionMock,
} = vi.hoisted(() => ({
  requireAdminSessionMock: vi.fn(),
  inviteFindUniqueMock: vi.fn(),
  inviteCreateMock: vi.fn(),
  sendKlaviyoMock: vi.fn(),
  inviteUpdateManyMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/auth/AdminSession", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    brandInvite: {
      findUnique: inviteFindUniqueMock,
    },
    $transaction: transactionMock,
  },
}));

vi.mock("@/lib/klaviyo/brandInvitations", () => ({
  sendBrandInvitationToKlaviyo: sendKlaviyoMock,
}));

import { POST } from "./route";

const existingInvite = {
  id: "invite-original",
  email: "brand@example.com",
  brandId: "00000000-0000-0000-0000-000000000001",
  applicationId: "application-001",
  role: "owner",
  brand: {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Example Fashion",
  },
  usedAt: null,
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/brand-invites/resend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("admin brand invitation resend", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    requireAdminSessionMock.mockResolvedValue({ id: "admin-1" });
    inviteFindUniqueMock.mockResolvedValue(existingInvite);
    inviteCreateMock.mockResolvedValue({
      id: "invite-replacement",
      email: existingInvite.email,
      brandId: existingInvite.brandId,
      role: existingInvite.role,
    });
    sendKlaviyoMock.mockResolvedValue(undefined);
    inviteUpdateManyMock.mockResolvedValue({ count: 1 });

transactionMock.mockImplementation(async (callback) =>
  callback({
    brandInvite: {
      updateMany: inviteUpdateManyMock,
      create: inviteCreateMock,
    },
  }),
);
  });

  it("rejects unauthenticated requests", async () => {
    requireAdminSessionMock.mockRejectedValue(new Error("Unauthorized"));

    const response = await POST(makeRequest({ inviteId: "invite-original" }));

    expect(response.status).toBe(401);
    expect(inviteFindUniqueMock).not.toHaveBeenCalled();
    expect(inviteCreateMock).not.toHaveBeenCalled();
  });

  it("rejects requests without an invitation ID", async () => {
    const response = await POST(makeRequest({}));

    expect(response.status).toBe(400);
    expect(inviteCreateMock).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown invitation", async () => {
    inviteFindUniqueMock.mockResolvedValue(null);

    const response = await POST(makeRequest({ inviteId: "missing" }));

    expect(response.status).toBe(404);
    expect(inviteCreateMock).not.toHaveBeenCalled();
  });

 it("preserves the brand, email, role and application ID when resending", async () => {
  const response = await POST(makeRequest({ inviteId: "invite-original" }));

  expect(response.status).toBe(200);

  // Verify the original invitation was invalidated.
  expect(inviteUpdateManyMock).toHaveBeenCalledWith({
    where: {
      id: existingInvite.id,
      usedAt: null,
      expiresAt: {
        gt: expect.any(Date),
      },
    },
    data: {
      usedAt: expect.any(Date),
    },
  });

  // Verify the replacement preserves the correct brand and role.
  expect(inviteCreateMock).toHaveBeenCalledWith({
    data: expect.objectContaining({
      email: existingInvite.email,
      brandId: existingInvite.brandId,
      applicationId: existingInvite.applicationId,
      role: existingInvite.role,
      tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      expiresAt: expect.any(Date),
    }),
  });

  expect(sendKlaviyoMock).toHaveBeenCalledWith(
    expect.objectContaining({
      inviteId: "invite-replacement",
      email: existingInvite.email,
      brandName: "Example Fashion",
    }),
  );
});

  it("keeps the replacement invitation when Klaviyo fails", async () => {
    sendKlaviyoMock.mockRejectedValue(new Error("Simulated Klaviyo failure"));

    const response = await POST(makeRequest({ inviteId: "invite-original" }));

    expect(response.status).toBe(502);

    const result = await response.json();

    expect(result.inviteCreated).toBe(true);
    expect(result.inviteId).toBe("invite-replacement");

    expect(inviteUpdateManyMock).toHaveBeenCalledTimes(1);
    expect(inviteCreateMock).toHaveBeenCalledTimes(1);
  });
  it("rejects an already-used invitation", async () => {
  inviteFindUniqueMock.mockResolvedValue({
    ...existingInvite,
    usedAt: new Date(),
  });

  const response = await POST(
    makeRequest({ inviteId: existingInvite.id }),
  );

  expect(response.status).toBe(409);
  expect(transactionMock).not.toHaveBeenCalled();
  expect(sendKlaviyoMock).not.toHaveBeenCalled();
});

it("rejects an invitation claimed by another request", async () => {
  inviteUpdateManyMock.mockResolvedValue({ count: 0 });

  const response = await POST(
    makeRequest({ inviteId: existingInvite.id }),
  );

  expect(response.status).toBe(409);
  expect(inviteCreateMock).not.toHaveBeenCalled();
  expect(sendKlaviyoMock).not.toHaveBeenCalled();
});

it("does not send an invitation when replacement creation fails", async () => {
  inviteCreateMock.mockRejectedValue(
    new Error("Simulated replacement creation failure"),
  );

  const consoleSpy = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});

  try {
    const response = await POST(
      makeRequest({ inviteId: existingInvite.id }),
    );

    expect(response.status).toBe(500);
    expect(sendKlaviyoMock).not.toHaveBeenCalled();
  } finally {
    consoleSpy.mockRestore();
  }
});
it("preserves null applicationId for generic invitations", async () => {
  inviteFindUniqueMock.mockResolvedValue({
    ...existingInvite,
    applicationId: null,
  });

  const response = await POST(
    makeRequest({ inviteId: existingInvite.id })
  );

  expect(response.status).toBe(200);

  expect(inviteCreateMock).toHaveBeenCalledWith({
    data: expect.objectContaining({
      brandId: existingInvite.brandId,
      applicationId: null,
      role: existingInvite.role,
    }),
  });
});
});