import { beforeEach, describe, expect, it, vi } from "vitest";

const { rateLimitMock } = vi.hoisted(() => ({
  rateLimitMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: rateLimitMock,
}));

import { allowUnauthenticatedLoginAudit } from "./auditIngestion";

describe("allowUnauthenticatedLoginAudit", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("uses a shared global allowance of 300 events per minute", async () => {
    rateLimitMock.mockResolvedValue({
      ok: true,
      remaining: 299,
      resetAt: new Date(),
    });

    const allowed = await allowUnauthenticatedLoginAudit();

    expect(allowed).toBe(true);

    expect(rateLimitMock).toHaveBeenCalledWith({
      key: "security_audit:unauthenticated_login:global",
      limit: 300,
      windowMs: 60_000,
    });
  });

  it("rejects audit ingestion when the allowance is exhausted", async () => {
    rateLimitMock.mockResolvedValue({
      ok: false,
      remaining: 0,
      resetAt: new Date(),
    });

    await expect(allowUnauthenticatedLoginAudit()).resolves.toBe(false);
  });
});
