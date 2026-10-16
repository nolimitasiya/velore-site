import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdminSessionMock,
  updateManyMock,
} = vi.hoisted(() => ({
  requireAdminSessionMock: vi.fn(),
  updateManyMock: vi.fn(),
}));

vi.mock("@/lib/auth/AdminSession", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    brandInvite: {
      updateMany: updateManyMock,
    },
  },
}));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/brand-invites/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("admin brand invitation revocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    requireAdminSessionMock.mockResolvedValue({ id: "admin-1" });
    updateManyMock.mockResolvedValue({ count: 1 });
  });

  it("rejects unauthenticated requests", async () => {
    requireAdminSessionMock.mockRejectedValue(
      new Error("Unauthorized")
    );

    const response = await POST(makeRequest({ id: "invite-1" }));

    expect(response.status).toBe(401);
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("rejects missing invitation IDs", async () => {
    const response = await POST(makeRequest({}));

    expect(response.status).toBe(400);
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("revokes an unused invitation", async () => {
    const response = await POST(makeRequest({ id: "invite-1" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        id: "invite-1",
        usedAt: null,
      },
      data: {
        usedAt: expect.any(Date),
      },
    });
  });

  it("does not overwrite an already-used invitation", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });

    const response = await POST(makeRequest({ id: "invite-1" }));

    expect(response.status).toBe(409);
    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "invite-1",
          usedAt: null,
        },
      })
    );
  });

  it("handles unknown invitation IDs safely", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });

    const response = await POST(makeRequest({ id: "nonexistent" }));
    const result = await response.json();

    expect(response.status).toBe(409);
    expect(result.ok).toBe(false);
  });

  it("does not expose database errors", async () => {
    updateManyMock.mockRejectedValue(
      new Error("PRIVATE_DATABASE_DETAILS")
    );

    const response = await POST(makeRequest({ id: "invite-1" }));
    const result = await response.json();

    expect(response.status).toBe(500);
    expect(result.error).not.toContain("PRIVATE_DATABASE_DETAILS");
  });
});