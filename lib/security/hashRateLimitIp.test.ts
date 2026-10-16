import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { hashRateLimitIp } from "./hashRateLimitIp";

const TEST_KEY = "test-only-rate-limit-ip-key-with-sufficient-length";

describe("hashRateLimitIp", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("produces a deterministic opaque identifier", () => {
    vi.stubEnv("RATE_LIMIT_IP_HMAC_KEY", TEST_KEY);

    const first = hashRateLimitIp("203.0.113.10");
    const second = hashRateLimitIp("203.0.113.10");

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain("203.0.113.10");
  });

  it("separates different IP addresses", () => {
    vi.stubEnv("RATE_LIMIT_IP_HMAC_KEY", TEST_KEY);

    expect(hashRateLimitIp("203.0.113.10")).not.toBe(
      hashRateLimitIp("203.0.113.11"),
    );
  });

  it("normalizes whitespace and IPv6 case", () => {
    vi.stubEnv("RATE_LIMIT_IP_HMAC_KEY", TEST_KEY);

    expect(hashRateLimitIp(" 2001:DB8::1 ")).toBe(
      hashRateLimitIp("2001:db8::1"),
    );
  });

  it("rejects malformed IP addresses", () => {
    vi.stubEnv("RATE_LIMIT_IP_HMAC_KEY", TEST_KEY);

    expect(() => hashRateLimitIp("not-an-ip")).toThrow(
      "Invalid client IP",
    );
  });

  it("fails closed when the secret is missing", () => {
    vi.stubEnv("RATE_LIMIT_IP_HMAC_KEY", "");

    expect(() => hashRateLimitIp("203.0.113.10")).toThrow(
      "RATE_LIMIT_IP_HMAC_KEY is not configured",
    );
  });

  it("rejects weak secrets", () => {
    vi.stubEnv("RATE_LIMIT_IP_HMAC_KEY", "short");

    expect(() => hashRateLimitIp("203.0.113.10")).toThrow(
      "RATE_LIMIT_IP_HMAC_KEY is not configured",
    );
  });
  it("canonicalizes equivalent IPv6 representations", () => {
  vi.stubEnv("RATE_LIMIT_IP_HMAC_KEY", TEST_KEY);

  expect(hashRateLimitIp("2001:db8::1")).toBe(
    hashRateLimitIp(
      "2001:0db8:0000:0000:0000:0000:0000:0001",
    ),
  );
});
});
