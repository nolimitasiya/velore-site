import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdminSessionMock,
  applicationFindUniqueMock,
  transactionMock,
  txApplicationFindUniqueMock,
  txBrandFindUniqueMock,
  txBrandCreateMock,
  txInviteCreateMock,
  sendInvitationMock,
  syncProfileMock,
} = vi.hoisted(() => ({
  requireAdminSessionMock: vi.fn(),
  applicationFindUniqueMock: vi.fn(),
  transactionMock: vi.fn(),
  txApplicationFindUniqueMock: vi.fn(),
  txBrandFindUniqueMock: vi.fn(),
  txBrandCreateMock: vi.fn(),
  txInviteCreateMock: vi.fn(),
  sendInvitationMock: vi.fn(),
  syncProfileMock: vi.fn(),
}));

vi.mock("@/lib/auth/AdminSession", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    brandApplication: {
      findUnique: applicationFindUniqueMock,
    },
    $transaction: transactionMock,
  },
}));

vi.mock("@/lib/klaviyo/brandInvitations", () => ({
  sendBrandInvitationToKlaviyo: sendInvitationMock,
}));

vi.mock("@/lib/klaviyo/brandLifecycle", () => ({
  syncBrandProfileToKlaviyo: syncProfileMock,
}));

import { POST } from "./route";

const application = {
  id: "application-001",
  status: "contract_signed",
  email: " Founder@Example.com ",
  website: "example.com",
  socialMedia: null,
  companyName: "Example Fashion",
  countryCode: "GB",
  city: "London",
  firstName: "Example",
  lastName: "Founder",
  phone: null,
};

const brand = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Example Fashion",
  slug: "example-fashion",
};

const transactionClient = {
  brandApplication: {
    findUnique: txApplicationFindUniqueMock,
  },
  brand: {
    findUnique: txBrandFindUniqueMock,
    create: txBrandCreateMock,
  },
  brandInvite: {
    create: txInviteCreateMock,
  },
};

function makeRequest(body: unknown = { sendEmail: true }) {
  return new Request(
    "http://localhost/api/admin/brand-applications/application-001/invite",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

function context() {
  return {
    params: Promise.resolve({ id: application.id }),
  };
}

describe("admin application-based brand invitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    requireAdminSessionMock.mockResolvedValue({ id: "admin-1" });
    applicationFindUniqueMock.mockResolvedValue({ ...application });

    txApplicationFindUniqueMock.mockResolvedValue({
      status: "contract_signed",
    });

    txBrandFindUniqueMock.mockResolvedValue(null);
    txBrandCreateMock.mockResolvedValue({ ...brand });
    txInviteCreateMock.mockResolvedValue({ id: "invite-001" });

    transactionMock.mockImplementation(async (callback) =>
      callback(transactionClient)
    );

    sendInvitationMock.mockResolvedValue(undefined);
    syncProfileMock.mockResolvedValue(undefined);
  });

  it("requires an authenticated Admin", async () => {
    requireAdminSessionMock.mockRejectedValue(
      new Error("Unauthorized")
    );

    await expect(
      POST(makeRequest(), context())
    ).rejects.toThrow("Unauthorized");

    expect(transactionMock).not.toHaveBeenCalled();
    expect(sendInvitationMock).not.toHaveBeenCalled();
  });

  it("rejects applications that do not exist", async () => {
    applicationFindUniqueMock.mockResolvedValue(null);

    const response = await POST(makeRequest(), context());

    expect(response.status).toBe(404);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("requires a signed contract before creating an invitation", async () => {
    applicationFindUniqueMock.mockResolvedValue({
      ...application,
      status: "contract_sent",
    });

    const response = await POST(makeRequest(), context());

    expect(response.status).toBe(400);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("creates a hashed invitation linked to the correct application", async () => {
    const response = await POST(makeRequest(), context());

    expect(response.status).toBe(200);

    expect(txBrandCreateMock).toHaveBeenCalledTimes(1);
    expect(txInviteCreateMock).toHaveBeenCalledTimes(1);

    expect(txInviteCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "founder@example.com",
          brandId: brand.id,
          applicationId: application.id,
          role: "owner",
          tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          expiresAt: expect.any(Date),
        }),
      })
    );

    const result = await response.json();

    expect(result.ok).toBe(true);

    const rawToken = new URL(
      result.onboardingUrl
    ).searchParams.get("token");

    expect(rawToken).toMatch(/^[a-f0-9]{64}$/);

    expect(
      txInviteCreateMock.mock.calls[0][0].data.tokenHash
    ).not.toBe(rawToken);
  });

  it("keeps the application at contract_signed while the invitation is pending", async () => {
    const response = await POST(makeRequest(), context());

    expect(response.status).toBe(200);

    expect(txApplicationFindUniqueMock).toHaveBeenCalledWith({
      where: { id: application.id },
      select: { status: true },
    });

    expect(transactionClient.brandApplication).not.toHaveProperty(
      "update"
    );

    expect(syncProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: application.id,
        stage: "contract_signed",
      })
    );
  });

  it("rejects an existing brand slug without creating an invitation", async () => {
    txBrandFindUniqueMock.mockResolvedValue({
      id: "existing-brand-id",
    });

    const response = await POST(makeRequest(), context());

    expect(response.status).toBe(409);

    expect(txBrandCreateMock).not.toHaveBeenCalled();
    expect(txInviteCreateMock).not.toHaveBeenCalled();
    expect(sendInvitationMock).not.toHaveBeenCalled();
  });

  it("rejects concurrent brand slug collisions", async () => {
    txBrandCreateMock.mockRejectedValue({
      code: "P2002",
    });

    const response = await POST(makeRequest(), context());

    expect(response.status).toBe(409);

    expect(txInviteCreateMock).not.toHaveBeenCalled();
    expect(sendInvitationMock).not.toHaveBeenCalled();
  });

  it("rejects an application that becomes ineligible before the transaction", async () => {
    txApplicationFindUniqueMock.mockResolvedValue({
      status: "rejected",
    });

    const response = await POST(makeRequest(), context());

    expect(response.status).toBe(400);

    expect(txBrandCreateMock).not.toHaveBeenCalled();
    expect(txInviteCreateMock).not.toHaveBeenCalled();
  });

  it("does not send Klaviyo events when invitation creation fails", async () => {
    txInviteCreateMock.mockRejectedValue(
      new Error("SIMULATED_INVITATION_FAILURE")
    );

    await expect(
      POST(makeRequest(), context())
    ).rejects.toThrow("SIMULATED_INVITATION_FAILURE");

    expect(sendInvitationMock).not.toHaveBeenCalled();
    expect(syncProfileMock).not.toHaveBeenCalled();
  });

  it("sends an invitation event, not a Brand Onboarded event", async () => {
    const response = await POST(makeRequest(), context());

    expect(response.status).toBe(200);

    expect(sendInvitationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        inviteId: "invite-001",
        email: "founder@example.com",
        brandName: brand.name,
        onboardingUrl: expect.stringContaining(
          "/brand/onboarding?token="
        ),
      })
    );

    expect(syncProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "contract_signed",
      })
    );
  });

  it("supports creating an invitation without sending an email event", async () => {
    const response = await POST(
      makeRequest({ sendEmail: false }),
      context()
    );

    expect(response.status).toBe(200);
    expect(txInviteCreateMock).toHaveBeenCalledTimes(1);
    expect(sendInvitationMock).not.toHaveBeenCalled();
  });

  it("does not claim email delivery when Klaviyo fails", async () => {
    sendInvitationMock.mockRejectedValue(
      new Error("Simulated Klaviyo failure")
    );

    const response = await POST(makeRequest(), context());

    expect(response.status).toBe(200);

    expect(txInviteCreateMock).toHaveBeenCalledTimes(1);
    expect(syncProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: "contract_signed",
      })
    );
  });
});