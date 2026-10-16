import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { rateLimitMock } = vi.hoisted(() => ({
  rateLimitMock: vi.fn(),
}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: rateLimitMock,
}));

import { checkRateLimit } from "./rateLimit";

describe("analytics rate-limit compatibility wrapper", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("allows requests when the shared limiter allows them", async () => {
    const resetAt = new Date("2026-10-13T18:00:00.000Z");

    rateLimitMock.mockResolvedValue({
      ok: true,
      remaining: 29,
      resetAt,
    });

    const result = await checkRateLimit({
      key: "analytics:search:test",
      limit: 30,
      windowMs: 60_000,
    });

    expect(rateLimitMock).toHaveBeenCalledWith({
      key: "analytics:search:test",
      limit: 30,
      windowMs: 60_000,
    });

    expect(result).toEqual({
      allowed: true,
      remaining: 29,
      resetAt,
    });
  });

  it("blocks requests when the shared limiter blocks them", async () => {
    const resetAt = new Date("2026-10-13T18:00:00.000Z");

    rateLimitMock.mockResolvedValue({
      ok: false,
      remaining: 0,
      resetAt,
    });

    const result = await checkRateLimit({
      key: "analytics:product-view:test",
      limit: 120,
      windowMs: 60_000,
    });

    expect(result).toEqual({
      allowed: false,
      remaining: 0,
      resetAt,
    });
  });

  it("does not silently allow requests when the database fails", async () => {
    rateLimitMock.mockRejectedValue(
      new Error("Simulated database failure"),
    );

    await expect(
      checkRateLimit({
        key: "analytics:wishlist:test",
        limit: 120,
        windowMs: 60_000,
      }),
    ).rejects.toThrow("Simulated database failure");
  });
});