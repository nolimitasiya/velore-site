import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdminSessionMock,
  inviteFindUniqueMock,
  inviteCreateMock,
  sendKlaviyoMock,
} = vi.hoisted(() => ({
  requireAdminSessionMock: vi.fn(),
  inviteFindUniqueMock: vi.fn(),
  inviteCreateMock: vi.fn(),
  sendKlaviyoMock: vi.fn(),
}));

vi.mock("@/lib/auth/AdminSession", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    brandInvite: {
      findUnique: inviteFindUniqueMock,
      create: inviteCreateMock,
    },
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
  role: "owner",
  brand: {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Example Fashion",
  },
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

  it("preserves the brand, email and role when resending", async () => {
    const response = await POST(makeRequest({ inviteId: "invite-original" }));

    expect(response.status).toBe(200);

    expect(inviteCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: existingInvite.email,
        brandId: existingInvite.brandId,
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
      })
    );
  });

  it("does not revoke the original invitation when Klaviyo fails", async () => {
    sendKlaviyoMock.mockRejectedValue(new Error("Simulated Klaviyo failure"));

    const response = await POST(makeRequest({ inviteId: "invite-original" }));

    expect(response.status).toBe(502);

    const result = await response.json();

    expect(result.inviteCreated).toBe(true);
    expect(result.inviteId).toBe("invite-replacement");

    // The endpoint only creates a replacement; it does not update
    // or revoke the original invitation.
    expect(inviteCreateMock).toHaveBeenCalledTimes(1);
  });
});