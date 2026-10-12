import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createAdminSessionToken,
  verifyAdminSessionToken,
} from "./adminSessionToken";

const TEST_SECRET = "a".repeat(32);

describe("adminSessionToken", () => {
  const originalSecret = process.env.ADMIN_SESSION_SECRET;

  beforeEach(() => {
    process.env.ADMIN_SESSION_SECRET = TEST_SECRET;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();

    if (originalSecret === undefined) {
      delete process.env.ADMIN_SESSION_SECRET;
    } else {
      process.env.ADMIN_SESSION_SECRET = originalSecret;
    }
  });

  it("creates and verifies a valid admin session", () => {
    const token = createAdminSessionToken("admin-123");

    expect(verifyAdminSessionToken(token)).toEqual({
      adminId: "admin-123",
      expiresAt: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
      type: "admin",
    });
  });

  it("rejects a modified payload", () => {
    const token = createAdminSessionToken("admin-123");
    const [, signature] = token.split(".");

    const modifiedPayload = Buffer.from(
      JSON.stringify({
        adminId: "different-admin",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        type: "admin",
      })
    ).toString("base64url");

    expect(
      verifyAdminSessionToken(`${modifiedPayload}.${signature}`)
    ).toBeNull();
  });

  it("rejects a modified signature", () => {
    const token = createAdminSessionToken("admin-123");
    const [payload] = token.split(".");

    expect(
      verifyAdminSessionToken(`${payload}.invalid-signature`)
    ).toBeNull();
  });

  it("rejects an expired session", () => {
    const token = createAdminSessionToken("admin-123");

    vi.advanceTimersByTime(12 * 60 * 60 * 1000 + 1000);

    expect(verifyAdminSessionToken(token)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifyAdminSessionToken("invalid")).toBeNull();
    expect(verifyAdminSessionToken("a.b.c")).toBeNull();
    expect(verifyAdminSessionToken(".")).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = createAdminSessionToken("admin-123");

    process.env.ADMIN_SESSION_SECRET = "b".repeat(32);

    expect(verifyAdminSessionToken(token)).toBeNull();
  });

  it("rejects a missing signing secret", () => {
    delete process.env.ADMIN_SESSION_SECRET;

    expect(() => createAdminSessionToken("admin-123")).toThrow(
      "ADMIN_SESSION_SECRET must contain at least 32 bytes."
    );
  });

  it("rejects a weak signing secret", () => {
    process.env.ADMIN_SESSION_SECRET = "too-short";

    expect(() => createAdminSessionToken("admin-123")).toThrow(
      "ADMIN_SESSION_SECRET must contain at least 32 bytes."
    );
  });

  it("rejects an empty admin ID", () => {
    const token = createAdminSessionToken("");

    expect(verifyAdminSessionToken(token)).toBeNull();
  });
});