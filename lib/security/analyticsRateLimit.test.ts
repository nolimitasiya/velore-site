import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("server-only", () => ({}));

const { checkRateLimitMock } = vi.hoisted(() => ({
  checkRateLimitMock: vi.fn(),
}));

vi.mock("@/lib/security/rateLimit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

import { checkAnalyticsRateLimit } from "./analyticsRateLimit";
import { hashRateLimitIp } from "./hashRateLimitIp";

const TEST_KEY =
  "test-only-rate-limit-ip-key-with-sufficient-length";

const originalVercel = process.env.VERCEL;
const originalHmacKey = process.env.RATE_LIMIT_IP_HMAC_KEY;

function makeRequest(ip?: string) {
  return new Request(
    "https://example.com/api/events/search",
    {
      headers: ip
        ? { "x-forwarded-for": ip }
        : {},
    },
  );
}

describe("checkAnalyticsRateLimit", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    process.env.VERCEL = "1";
    process.env.RATE_LIMIT_IP_HMAC_KEY = TEST_KEY;

    checkRateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 29,
      resetAt: new Date("2026-10-14T09:00:00Z"),
    });
  });

  afterEach(() => {
    if (originalVercel === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = originalVercel;
    }

    if (originalHmacKey === undefined) {
      delete process.env.RATE_LIMIT_IP_HMAC_KEY;
    } else {
      process.env.RATE_LIMIT_IP_HMAC_KEY =
        originalHmacKey;
    }
  });

  it.each([
    ["brand-view", 120],
    ["product-impression", 600],
    ["product-view", 120],
    ["search", 30],
    ["wishlist", 120],
  ] as const)(
    "preserves the %s limit using an opaque key",
    async (event, limit) => {
      const result = await checkAnalyticsRateLimit(
        makeRequest("203.0.113.10"),
        event,
      );

      expect(result.status).toBe("ALLOWED");

      expect(checkRateLimitMock).toHaveBeenCalledWith({
        key: `analytics:${event}:${hashRateLimitIp("203.0.113.10")}`,
        limit,
        windowMs: 60_000,
      });

      const call = checkRateLimitMock.mock.calls[0][0];

      expect(call.key).not.toContain("203.0.113.10");
    },
  );

  it("returns BLOCKED when the limiter denies the request", async () => {
    checkRateLimitMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetAt: new Date("2026-10-14T09:00:00Z"),
    });

    const result = await checkAnalyticsRateLimit(
      makeRequest("203.0.113.10"),
      "search",
    );

    expect(result.status).toBe("BLOCKED");
  });

  it("uses different buckets for different IPs", async () => {
    await checkAnalyticsRateLimit(
      makeRequest("203.0.113.10"),
      "search",
    );

    await checkAnalyticsRateLimit(
      makeRequest("203.0.113.11"),
      "search",
    );

    const firstKey =
      checkRateLimitMock.mock.calls[0][0].key;

    const secondKey =
      checkRateLimitMock.mock.calls[1][0].key;

    expect(firstKey).not.toBe(secondKey);
  });

  it("uses one bucket for equivalent IPv6 representations", async () => {
    await checkAnalyticsRateLimit(
      makeRequest("2001:db8::1"),
      "search",
    );

    await checkAnalyticsRateLimit(
      makeRequest(
        "2001:0db8:0000:0000:0000:0000:0000:0001",
      ),
      "search",
    );

    const firstKey =
      checkRateLimitMock.mock.calls[0][0].key;

    const secondKey =
      checkRateLimitMock.mock.calls[1][0].key;

    expect(firstKey).toBe(secondKey);
  });

  it("does not rate-limit unverified IP addresses", async () => {
    delete process.env.VERCEL;

    const result = await checkAnalyticsRateLimit(
      makeRequest("203.0.113.10"),
      "search",
    );

    expect(result).toEqual({
      status: "NOT_ENFORCED",
      reason: "CLIENT_IP_NOT_TRUSTED",
    });

    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });

  it("does not create a shared bucket when IP is missing", async () => {
    const result = await checkAnalyticsRateLimit(
      makeRequest(),
      "search",
    );

    expect(result.status).toBe("NOT_ENFORCED");
    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });

  it("rejects ambiguous forwarded chains as untrusted", async () => {
    const result = await checkAnalyticsRateLimit(
      makeRequest(
        "203.0.113.10, 198.51.100.20",
      ),
      "search",
    );

    expect(result.status).toBe("NOT_ENFORCED");
    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });

  it("fails explicitly if the HMAC secret is missing", async () => {
    delete process.env.RATE_LIMIT_IP_HMAC_KEY;

    await expect(
      checkAnalyticsRateLimit(
        makeRequest("203.0.113.10"),
        "search",
      ),
    ).rejects.toThrow(
      "RATE_LIMIT_IP_HMAC_KEY is not configured",
    );

    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });
});
