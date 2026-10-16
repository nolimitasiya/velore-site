import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdminSessionMock,
  brandFindUniqueMock,
  brandCreateMock,
  inviteCreateMock,
  sendKlaviyoMock,
  transactionMock,
} = vi.hoisted(() => ({
  requireAdminSessionMock: vi.fn(),
  brandFindUniqueMock: vi.fn(),
  brandCreateMock: vi.fn(),
  inviteCreateMock: vi.fn(),
  sendKlaviyoMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/auth/AdminSession", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    brand: {
      findUnique: brandFindUniqueMock,
       create: brandCreateMock,
    },
    brandInvite: {
      create: inviteCreateMock,
    },
    $transaction: transactionMock,
  },
}));

vi.mock("@/lib/klaviyo/brandInvitations", () => ({
  sendBrandInvitationToKlaviyo: sendKlaviyoMock,
}));

import { POST } from "./route";

const brand = {
  id: "00000000-0000-0000-0000-000000000001",
  slug: "example-fashion",
  name: "Example Fashion",
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/brand-invites/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  email: "brand@example.com",
  companyName: "Example Fashion",
  companySlug: "example-fashion",
  role: "owner",
};

describe("admin brand invitation creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    requireAdminSessionMock.mockResolvedValue({ id: "admin-1" });
    brandFindUniqueMock.mockResolvedValue(null);
    brandCreateMock.mockResolvedValue(brand);
    inviteCreateMock.mockResolvedValue({ id: "invite-1" });
    sendKlaviyoMock.mockResolvedValue(undefined);
    transactionMock.mockImplementation(async (callback) =>
    callback({
     brand: {
      findUnique: brandFindUniqueMock,
      create: brandCreateMock,
    },
    brandInvite: {
      create: inviteCreateMock,
    },
  })
);
  });

  it("rejects unauthenticated requests", async () => {
    requireAdminSessionMock.mockRejectedValue(new Error("Unauthorized"));

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(401);
    expect(brandCreateMock).not.toHaveBeenCalled();
    expect(inviteCreateMock).not.toHaveBeenCalled();
    expect(sendKlaviyoMock).not.toHaveBeenCalled();
  });

  it("rejects missing required fields", async () => {
    const response = await POST(makeRequest({ email: "brand@example.com" }));

    expect(response.status).toBe(400);
    expect(inviteCreateMock).not.toHaveBeenCalled();
  });

  it("creates a hashed invitation and sends a Klaviyo event", async () => {
    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(200);

    expect(inviteCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "brand@example.com",
          brandId: brand.id,
          role: "owner",
          tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          expiresAt: expect.any(Date),
        }),
      })
    );

    expect(sendKlaviyoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        inviteId: "invite-1",
        email: "brand@example.com",
        brandName: "Example Fashion",
        onboardingUrl: expect.stringContaining("/brand/onboarding?token="),
      })
    );

    const result = await response.json();

    expect(result.ok).toBe(true);
    expect(result.eventAccepted).toBe(true);

    // The raw token must not be stored as the database token hash.
    const rawToken = new URL(result.onboardingUrl).searchParams.get("token");
    expect(rawToken).toMatch(/^[a-f0-9]{64}$/);
    expect(inviteCreateMock.mock.calls[0][0].data.tokenHash).not.toBe(rawToken);
  });

  it("reports a Klaviyo failure without claiming delivery", async () => {
    sendKlaviyoMock.mockRejectedValue(new Error("Simulated Klaviyo failure"));

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(502);

    const result = await response.json();

    expect(result.ok).toBe(false);
    expect(result.inviteCreated).toBe(true);
    expect(result.inviteId).toBe("invite-1");
  });

  it("does not expose internal database errors", async () => {
    brandCreateMock.mockRejectedValue(new Error("PRIVATE_DATABASE_DETAILS"));

    const response = await POST(makeRequest(validBody));
    const result = await response.json();

    expect(response.status).toBe(500);
    expect(result.error).not.toContain("PRIVATE_DATABASE_DETAILS");
  });
  it("rejects an existing brand slug without creating an invitation", async () => {
  brandFindUniqueMock.mockResolvedValue({ id: brand.id });

  const response = await POST(makeRequest(validBody));
  const result = await response.json();

  expect(response.status).toBe(409);
  expect(result.ok).toBe(false);

  expect(brandCreateMock).not.toHaveBeenCalled();
  expect(inviteCreateMock).not.toHaveBeenCalled();
  expect(sendKlaviyoMock).not.toHaveBeenCalled();
});

it("handles concurrent brand slug collisions safely", async () => {
  brandCreateMock.mockRejectedValue({ code: "P2002" });

  const response = await POST(makeRequest(validBody));
  const result = await response.json();

  expect(response.status).toBe(409);
  expect(result.ok).toBe(false);

  expect(inviteCreateMock).not.toHaveBeenCalled();
  expect(sendKlaviyoMock).not.toHaveBeenCalled();
});
it("does not send an invitation when the transaction fails", async () => {
  // Simulate invitation creation failing inside the transaction.
  inviteCreateMock.mockRejectedValue(
    new Error("SIMULATED_INVITATION_INSERT_FAILURE")
  );

  const response = await POST(makeRequest(validBody));
  const result = await response.json();

  expect(response.status).toBe(500);
  expect(result.ok).toBe(false);

  // Brand creation was attempted before invitation creation failed.
  expect(brandCreateMock).toHaveBeenCalledTimes(1);
  expect(inviteCreateMock).toHaveBeenCalledTimes(1);

  // A failed transaction must never trigger the invitation event.
  expect(sendKlaviyoMock).not.toHaveBeenCalled();

  // Internal error details must not be exposed to the client.
  expect(JSON.stringify(result)).not.toContain(
    "SIMULATED_INVITATION_INSERT_FAILURE"
  );
});
});