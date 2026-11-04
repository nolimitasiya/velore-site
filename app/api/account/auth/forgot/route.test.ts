import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const {
  findShopperMock,
  deleteTokensMock,
  createTokenMock,
  sendShopperResetEmailMock,
} = vi.hoisted(() => ({
  findShopperMock: vi.fn(),
  deleteTokensMock: vi.fn(),
  createTokenMock: vi.fn(),
  sendShopperResetEmailMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    shopper: {
      findUnique: findShopperMock,
    },
    passwordResetToken: {
      deleteMany: deleteTokensMock,
      create: createTokenMock,
    },
  },
}));

vi.mock("@/lib/email/sendShopperResetEmail", () => ({
  sendShopperResetEmail: sendShopperResetEmailMock,
}));

import { POST } from "./route";

const SHOPPER = {
  id: "shopper-test-id",
  email: "shopper@example.test",
  firstName: "Test",
};

function requestForgot(body: unknown = { email: SHOPPER.email }) {
  return POST(
    new Request("http://localhost:3000/api/account/auth/forgot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }) as NextRequest,
  );
}

describe("shopper forgot-password security", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.veiloraclub.com");

    findShopperMock.mockResolvedValue(SHOPPER);
    deleteTokensMock.mockResolvedValue({ count: 0 });
    createTokenMock.mockResolvedValue({});
    sendShopperResetEmailMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses the canonical production origin for reset links", async () => {
    const response = await requestForgot();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    expect(sendShopperResetEmailMock).toHaveBeenCalledTimes(1);

    const payload = sendShopperResetEmailMock.mock.calls[0][0];
    const url = new URL(payload.resetUrl);

    expect(url.origin).toBe("https://www.veiloraclub.com");
    expect(url.pathname).toBe("/account/reset");
    expect(url.searchParams.get("token")).toMatch(/^[a-f0-9]{64}$/);
    expect(payload.to).toBe(SHOPPER.email);
    expect(payload.firstName).toBe(SHOPPER.firstName);
  });

  it("returns generic success for unknown accounts", async () => {
    findShopperMock.mockResolvedValue(null);

    const response = await requestForgot();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(deleteTokensMock).not.toHaveBeenCalled();
    expect(createTokenMock).not.toHaveBeenCalled();
    expect(sendShopperResetEmailMock).not.toHaveBeenCalled();
  });

  it("requires an email address", async () => {
    const response = await requestForgot({});

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Email is required.",
    });
    expect(findShopperMock).not.toHaveBeenCalled();
  });

  it("normalises email before lookup and token storage", async () => {
    const response = await requestForgot({
      email: "  SHOPPER@EXAMPLE.TEST  ",
    });

    expect(response.status).toBe(200);
    expect(findShopperMock).toHaveBeenCalledWith({
      where: { email: SHOPPER.email },
      select: { id: true, email: true, firstName: true },
    });

    expect(deleteTokensMock).toHaveBeenCalledWith({
      where: {
        userType: "SHOPPER",
        email: SHOPPER.email,
      },
    });

    expect(createTokenMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userType: "SHOPPER",
        email: SHOPPER.email,
      }),
    });
  });

  it("rejects missing production URL configuration before lookup", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    const response = await requestForgot();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Server configuration unavailable.",
    });

    expect(findShopperMock).not.toHaveBeenCalled();
    expect(deleteTokensMock).not.toHaveBeenCalled();
    expect(createTokenMock).not.toHaveBeenCalled();
    expect(sendShopperResetEmailMock).not.toHaveBeenCalled();
  });

  it("rejects invalid production URL configuration before token mutations", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");

    const response = await requestForgot();

    expect(response.status).toBe(503);
    expect(findShopperMock).not.toHaveBeenCalled();
    expect(deleteTokensMock).not.toHaveBeenCalled();
    expect(createTokenMock).not.toHaveBeenCalled();
    expect(sendShopperResetEmailMock).not.toHaveBeenCalled();
  });

  it("returns identical configuration errors for existing and unknown accounts", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    const existingResponse = await requestForgot();
    const existingBody = await existingResponse.json();

    findShopperMock.mockResolvedValue(null);

    const unknownResponse = await requestForgot({
      email: "unknown@example.test",
    });
    const unknownBody = await unknownResponse.json();

    expect(existingResponse.status).toBe(503);
    expect(unknownResponse.status).toBe(503);
    expect(existingBody).toEqual(unknownBody);
    expect(findShopperMock).not.toHaveBeenCalled();
  });

  it("does not fall back to legacy URL variables", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://legacy.example.com");
    vi.stubEnv("VERCEL_URL", "preview.example.com");

    const response = await requestForgot();

    expect(response.status).toBe(503);
    expect(findShopperMock).not.toHaveBeenCalled();
    expect(createTokenMock).not.toHaveBeenCalled();
    expect(sendShopperResetEmailMock).not.toHaveBeenCalled();
  });

  it("stores only a hash of the raw reset token", async () => {
    await requestForgot();

    const payload = sendShopperResetEmailMock.mock.calls[0][0];
    const rawToken = new URL(payload.resetUrl).searchParams.get("token");

    expect(rawToken).not.toBeNull();

    const storedToken = createTokenMock.mock.calls[0][0].data.tokenHash;

    expect(storedToken).toBe(
      createHash("sha256").update(rawToken!).digest("hex"),
    );
    expect(storedToken).not.toBe(rawToken);
  });

  it("sets reset token expiry to approximately 60 minutes", async () => {
    const before = Date.now();

    await requestForgot();

    const after = Date.now();
    const expiresAt = createTokenMock.mock.calls[0][0].data.expiresAt;

    expect(expiresAt).toBeInstanceOf(Date);
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(
      before + 60 * 60 * 1000,
    );
    expect(expiresAt.getTime()).toBeLessThanOrEqual(
      after + 60 * 60 * 1000,
    );
  });

  it("does not reveal email delivery failures", async () => {
    sendShopperResetEmailMock.mockRejectedValue(
      new Error("Simulated delivery failure"),
    );

    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const response = await requestForgot();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(createTokenMock).toHaveBeenCalledTimes(1);
    expect(sendShopperResetEmailMock).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("returns a server error when Shopper lookup fails", async () => {
    findShopperMock.mockRejectedValue(new Error("Simulated database failure"));

    const response = await requestForgot();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Something went wrong.",
    });
    expect(createTokenMock).not.toHaveBeenCalled();
    expect(sendShopperResetEmailMock).not.toHaveBeenCalled();
  });

  it("does not send an email when token creation fails", async () => {
    createTokenMock.mockRejectedValue(new Error("Simulated token failure"));

    const response = await requestForgot();

    expect(response.status).toBe(500);
    expect(sendShopperResetEmailMock).not.toHaveBeenCalled();
  });

  it("returns a server error for malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/account/auth/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{invalid-json",
      }) as NextRequest,
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Something went wrong.",
    });
    expect(findShopperMock).not.toHaveBeenCalled();
  });
});
