import { beforeEach, describe, expect, it, vi } from "vitest";

const { rateLimitMock } = vi.hoisted(() => ({
  rateLimitMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: rateLimitMock,
}));

import { shouldReportAuditSuppression } from "./auditSuppressionGate";

describe("shouldReportAuditSuppression", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("allows the first reporting attempt", async () => {
    rateLimitMock.mockResolvedValue({
      ok: true,
      remaining: 0,
      resetAt: new Date(),
    });

    await expect(
      shouldReportAuditSuppression(
        "admin",
        new Date("2026-10-13T20:45:00.000Z"),
      ),
    ).resolves.toBe(true);

    expect(rateLimitMock).toHaveBeenCalledWith({
      key: expect.stringMatching(
        /^security_audit:suppression_report:[a-f0-9]{64}$/,
      ),
      limit: 1,
      windowMs: 60_000,
    });
  });

  it("rejects repeated reporting attempts", async () => {
    rateLimitMock.mockResolvedValue({
      ok: false,
      remaining: 0,
      resetAt: new Date(),
    });

    await expect(
      shouldReportAuditSuppression(
        "brand",
        new Date("2026-10-13T20:45:00.000Z"),
      ),
    ).resolves.toBe(false);
  });

  it("uses different keys for admin and brand suppression", async () => {
    rateLimitMock.mockResolvedValue({
      ok: true,
      remaining: 0,
      resetAt: new Date(),
    });

    const resetAt = new Date("2026-10-13T20:45:00.000Z");

    await shouldReportAuditSuppression("admin", resetAt);
    await shouldReportAuditSuppression("brand", resetAt);

    const adminKey = rateLimitMock.mock.calls[0][0].key;
    const brandKey = rateLimitMock.mock.calls[1][0].key;

    expect(adminKey).not.toBe(brandKey);
  });

  it("uses different keys for different audit windows", async () => {
    rateLimitMock.mockResolvedValue({
      ok: true,
      remaining: 0,
      resetAt: new Date(),
    });

    await shouldReportAuditSuppression(
      "brand",
      new Date("2026-10-13T20:45:00.000Z"),
    );

    await shouldReportAuditSuppression(
      "brand",
      new Date("2026-10-13T20:46:00.000Z"),
    );

    const firstKey = rateLimitMock.mock.calls[0][0].key;
    const secondKey = rateLimitMock.mock.calls[1][0].key;

    expect(firstKey).not.toBe(secondKey);
  });

  it("rejects an invalid audit window", async () => {
    await expect(
      shouldReportAuditSuppression("admin", new Date("invalid")),
    ).rejects.toThrow("Invalid audit suppression window");

    expect(rateLimitMock).not.toHaveBeenCalled();
  });

  it("propagates database failures", async () => {
    rateLimitMock.mockRejectedValue(new Error("Database unavailable"));

    await expect(
      shouldReportAuditSuppression(
        "admin",
        new Date("2026-10-13T20:45:00.000Z"),
      ),
    ).rejects.toThrow("Database unavailable");
  });
});