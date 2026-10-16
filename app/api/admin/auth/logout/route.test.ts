import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock, revokeAdminSessionMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  revokeAdminSessionMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/lib/auth/adminDbSession", () => ({
  revokeAdminSession: revokeAdminSessionMock,
}));

import { POST } from "./route";

const SESSION_TOKEN = "a".repeat(64);

describe("admin logout API", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    revokeAdminSessionMock.mockResolvedValue(undefined);

    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue({
        value: SESSION_TOKEN,
      }),
    });
  });

  it("revokes the current admin session", async () => {
    const response = await POST();

    expect(response.status).toBe(200);

    expect(revokeAdminSessionMock).toHaveBeenCalledExactlyOnceWith(
      SESSION_TOKEN,
    );

    await expect(response.json()).resolves.toEqual({
      ok: true,
    });
  });

  it("clears the admin authentication cookie", async () => {
    const response = await POST();

    const setCookie = response.headers.get("set-cookie");

    expect(setCookie).not.toBeNull();
    expect(setCookie).toContain("admin_authed=");
    expect(setCookie).toMatch(/Max-Age=0/i);
    expect(setCookie).toMatch(/Path=\//i);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=lax/i);
  });

  it("succeeds without revocation when no session cookie exists", async () => {
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });

    const response = await POST();

    expect(response.status).toBe(200);

    expect(revokeAdminSessionMock).not.toHaveBeenCalled();

    expect(response.headers.get("set-cookie")).toContain(
      "admin_authed=",
    );

    await expect(response.json()).resolves.toEqual({
      ok: true,
    });
  });

  it("does not report successful logout if session revocation fails", async () => {
    revokeAdminSessionMock.mockRejectedValue(
      new Error("Simulated database failure"),
    );

    await expect(POST()).rejects.toThrow(
      "Simulated database failure",
    );
  });
});