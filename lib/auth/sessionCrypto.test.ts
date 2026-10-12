import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("server-only", () => ({}));

import {
  generateSessionToken,
  hashSessionToken,
  sessionExpiresAt,
} from "./sessionCrypto";

describe("sessionCrypto", () => {
  it("generates a random 32-byte token", () => {
    const token = generateSessionToken();

    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it("generates unique tokens", () => {
    const first = generateSessionToken();
    const second = generateSessionToken();

    expect(first).not.toBe(second);
  });

  it("hashes tokens consistently", () => {
    const token = "test-session-token";

    expect(hashSessionToken(token)).toBe(
      hashSessionToken(token)
    );
  });

  it("produces different hashes for different tokens", () => {
    expect(hashSessionToken("token-one")).not.toBe(
      hashSessionToken("token-two")
    );
  });

  it("does not expose the raw token in the hash", () => {
    const token = generateSessionToken();
    const hash = hashSessionToken(token);

    expect(hash).not.toBe(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("calculates the session expiration", () => {
    vi.useFakeTimers();

    try {
      vi.setSystemTime(
        new Date("2026-10-10T12:00:00.000Z")
      );

      const expiresAt = sessionExpiresAt(3600);

      expect(expiresAt.toISOString()).toBe(
        "2026-10-10T13:00:00.000Z"
      );
    } finally {
      vi.useRealTimers();
    }
  });
});