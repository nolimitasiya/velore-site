import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock, revokeBrandSessionMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  revokeBrandSessionMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: cookiesMock,
}));

vi.mock("@/lib/auth/brandDbSession", () => ({
  revokeBrandSession: revokeBrandSessionMock,
}));

import { POST } from "./route";

const SESSION_TOKEN = "b".repeat(64);

describe("brand logout API", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    revokeBrandSessionMock.mockResolvedValue(undefined);

    cookiesMock.mockResolvedValue({
      get: vi.fn((name: string) =>
        name === "brand_authed"
          ? { value: SESSION_TOKEN }
          : undefined,
      ),
    });
  });

  it("revokes the current brand session", async () => {
    const response = await POST();

    expect(response.status).toBe(200);

    expect(revokeBrandSessionMock).toHaveBeenCalledExactlyOnceWith(
      SESSION_TOKEN,
    );

    await expect(response.json()).resolves.toEqual({
      ok: true,
    });
  });

  it("clears both authentication and brand selection cookies", async () => {
    const response = await POST();

    const setCookie = response.headers.get("set-cookie");

    expect(setCookie).not.toBeNull();

    for (const name of ["brand_authed", "brand_id"]) {
      expect(setCookie).toContain(`${name}=`);
    }

    const cookies = response.cookies.getAll();

    for (const name of ["brand_authed", "brand_id"]) {
      const cookie = cookies.find((item) => item.name === name);

      expect(cookie).toBeDefined();
      expect(cookie?.value).toBe("");
      expect(cookie?.maxAge).toBe(0);
      expect(cookie?.httpOnly).toBe(true);
      expect(cookie?.sameSite).toBe("lax");
      expect(cookie?.path).toBe("/");
    }
  });

  it("succeeds without revocation when no session exists", async () => {
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });

    const response = await POST();

    expect(response.status).toBe(200);
    expect(revokeBrandSessionMock).not.toHaveBeenCalled();

    expect(response.cookies.get("brand_authed")?.maxAge).toBe(0);
    expect(response.cookies.get("brand_id")?.maxAge).toBe(0);
  });

  it("does not report successful logout when revocation fails", async () => {
    revokeBrandSessionMock.mockRejectedValue(
      new Error("Simulated database failure"),
    );

    await expect(POST()).rejects.toThrow(
      "Simulated database failure",
    );
  });
});