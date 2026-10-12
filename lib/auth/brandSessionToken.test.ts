import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createBrandSessionToken,
  verifyBrandSessionToken,
} from "./brandSessionToken";

describe("brand session token security", () => {
  beforeEach(() => {
    vi.stubEnv(
      "BRAND_SESSION_SECRET",
      "test-secret-with-at-least-32-characters-long"
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("creates a valid session", () => {
    const token = createBrandSessionToken("user-123");

    const session = verifyBrandSessionToken(token);

    expect(session?.userId).toBe("user-123");
    expect(session?.expiresAt).toBeGreaterThan(
      Math.floor(Date.now() / 1000)
    );
  });

  it("rejects a modified payload", () => {
    const token = createBrandSessionToken("user-123");

    const [, signature] = token.split(".");

    const modifiedPayload = Buffer.from(
      JSON.stringify({
        userId: "attacker",
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString("base64url");

    expect(
      verifyBrandSessionToken(`${modifiedPayload}.${signature}`)
    ).toBeNull();
  });

  it("rejects a modified signature", () => {
    const token = createBrandSessionToken("user-123");

    const [payload] = token.split(".");

    const invalidSignature = Buffer.alloc(32, 1).toString("base64url");

    expect(
      verifyBrandSessionToken(`${payload}.${invalidSignature}`)
    ).toBeNull();
  });

  it("rejects expired sessions", () => {
    vi.useFakeTimers();

    vi.setSystemTime(new Date("2026-10-09T12:00:00Z"));

    const token = createBrandSessionToken("user-123");

    vi.setSystemTime(new Date("2026-10-10T12:00:00Z"));

    expect(verifyBrandSessionToken(token)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifyBrandSessionToken("invalid")).toBeNull();
    expect(verifyBrandSessionToken("a.b.c")).toBeNull();
    expect(verifyBrandSessionToken("")).toBeNull();
  });

  it("rejects missing session secrets", () => {
    vi.stubEnv("BRAND_SESSION_SECRET", "");

    expect(() => createBrandSessionToken("user-123")).toThrow(
      "BRAND_SESSION_SECRET"
    );
  });

  it("rejects weak session secrets", () => {
    vi.stubEnv("BRAND_SESSION_SECRET", "weak");

    expect(() => createBrandSessionToken("user-123")).toThrow(
      "BRAND_SESSION_SECRET"
    );
  });
});