import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { checkRateLimitMock } = vi.hoisted(() => ({
  checkRateLimitMock: vi.fn(),
}));

vi.mock("@/lib/security/rateLimit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

import { hashRateLimitIp } from "@/lib/security/hashRateLimitIp";
import { checkAnalyticsSessionCreationLimit } from "./analyticsSessionCreationLimit";

const TEST_HMAC_KEY =
  "test-only-session-creation-hmac-key-with-sufficient-length";

function makeRequest(ip?: string) {
  return new Request("https://example.test/api/events/session", {
    headers: ip ? { "x-forwarded-for": ip } : {},
  });
}

describe("analytics session creation limiter", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("RATE_LIMIT_IP_HMAC_KEY", TEST_HMAC_KEY);
    vi.stubEnv("ANALYTICS_SESSION_CREATION_LIMIT_ENABLED", "false");

    checkRateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 59,
      resetAt: new Date("2026-10-14T20:00:00.000Z"),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not enforce limits when disabled", async () => {
    const result = await checkAnalyticsSessionCreationLimit(
      makeRequest("192.0.2.10"),
    );

    expect(result).toEqual({
      status: "NOT_ENFORCED",
      reason: "DISABLED",
    });

    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });

  it("does not enforce limits when the IP is unavailable", async () => {
    vi.stubEnv("ANALYTICS_SESSION_CREATION_LIMIT_ENABLED", "true");

    const result = await checkAnalyticsSessionCreationLimit(
      makeRequest(),
    );

    expect(result).toEqual({
      status: "NOT_ENFORCED",
      reason: "CLIENT_IP_NOT_TRUSTED",
    });

    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });

  it("does not enforce limits outside the trusted deployment environment", async () => {
    vi.stubEnv("ANALYTICS_SESSION_CREATION_LIMIT_ENABLED", "true");
    vi.stubEnv("VERCEL", "");

    const result = await checkAnalyticsSessionCreationLimit(
      makeRequest("192.0.2.10"),
    );

    expect(result).toEqual({
      status: "NOT_ENFORCED",
      reason: "CLIENT_IP_NOT_TRUSTED",
    });

    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });

  it("uses a hashed IP key for trusted requests", async () => {
    vi.stubEnv("ANALYTICS_SESSION_CREATION_LIMIT_ENABLED", "true");

    const result = await checkAnalyticsSessionCreationLimit(
      makeRequest("192.0.2.10"),
    );

    expect(result.status).toBe("ALLOWED");

    expect(checkRateLimitMock).toHaveBeenCalledWith({
      key: `analytics:session-creation:${hashRateLimitIp("192.0.2.10")}`,
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });

    const key = checkRateLimitMock.mock.calls[0][0].key;

    expect(key).not.toContain("192.0.2.10");
  });

  it("returns BLOCKED when the allowance is exhausted", async () => {
    vi.stubEnv("ANALYTICS_SESSION_CREATION_LIMIT_ENABLED", "true");

    checkRateLimitMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date("2026-10-14T20:00:00.000Z"),
    });

    const result = await checkAnalyticsSessionCreationLimit(
      makeRequest("192.0.2.10"),
    );

    expect(result.status).toBe("BLOCKED");
  });

  it("does not fall back to a raw IP when the HMAC key is missing", async () => {
    vi.stubEnv("ANALYTICS_SESSION_CREATION_LIMIT_ENABLED", "true");
    vi.stubEnv("RATE_LIMIT_IP_HMAC_KEY", "");

    await expect(
      checkAnalyticsSessionCreationLimit(makeRequest("192.0.2.10")),
    ).rejects.toThrow("RATE_LIMIT_IP_HMAC_KEY is not configured");

    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });

  it("rejects multiple forwarded IPs rather than trusting an ambiguous chain", async () => {
    vi.stubEnv("ANALYTICS_SESSION_CREATION_LIMIT_ENABLED", "true");

    const result = await checkAnalyticsSessionCreationLimit(
      makeRequest("192.0.2.10, 198.51.100.20"),
    );

    expect(result).toEqual({
      status: "NOT_ENFORCED",
      reason: "CLIENT_IP_NOT_TRUSTED",
    });

    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });
});
