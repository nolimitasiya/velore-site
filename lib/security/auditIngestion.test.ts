import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  allowUnauthenticatedLoginAudit,
  checkUnauthenticatedLoginAudit,
} from "./auditIngestion";

const { rateLimitMock } = vi.hoisted(() => ({
  rateLimitMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: rateLimitMock,
}));


describe("allowUnauthenticatedLoginAudit", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("uses a dedicated admin audit allowance", async () => {
    rateLimitMock.mockResolvedValue({
      ok: true,
      remaining: 299,
      resetAt: new Date(),
    });

    await expect(
      allowUnauthenticatedLoginAudit("admin"),
    ).resolves.toBe(true);

    expect(rateLimitMock).toHaveBeenCalledWith({
      key: "security_audit:unauthenticated_login:admin",
      limit: 300,
      windowMs: 60_000,
    });
  });

  it("uses a separate brand audit allowance", async () => {
    rateLimitMock.mockResolvedValue({
      ok: true,
      remaining: 299,
      resetAt: new Date(),
    });

    await expect(
      allowUnauthenticatedLoginAudit("brand"),
    ).resolves.toBe(true);

    expect(rateLimitMock).toHaveBeenCalledWith({
      key: "security_audit:unauthenticated_login:brand",
      limit: 300,
      windowMs: 60_000,
    });
  });

  it("rejects ingestion when the category allowance is exhausted", async () => {
    rateLimitMock.mockResolvedValue({
      ok: false,
      remaining: 0,
      resetAt: new Date(),
    });

    await expect(
      allowUnauthenticatedLoginAudit("brand"),
    ).resolves.toBe(false);
  });

  it("propagates limiter failures to the caller", async () => {
    rateLimitMock.mockRejectedValue(new Error("Database unavailable"));

    await expect(
      allowUnauthenticatedLoginAudit("admin"),
    ).rejects.toThrow("Database unavailable");
  });
  it("returns a structured decision when ingestion is allowed", async () => {
  const resetAt = new Date("2026-10-13T20:45:00.000Z");

  rateLimitMock.mockResolvedValue({
    ok: true,
    remaining: 299,
    resetAt,
  });

  await expect(
    checkUnauthenticatedLoginAudit("admin"),
  ).resolves.toEqual({
    allowed: true,
    category: "admin",
    resetAt,
  });
});

it("returns the category and window when ingestion is suppressed", async () => {
  const resetAt = new Date("2026-10-13T20:45:00.000Z");

  rateLimitMock.mockResolvedValue({
    ok: false,
    remaining: 0,
    resetAt,
  });

  await expect(
    checkUnauthenticatedLoginAudit("brand"),
  ).resolves.toEqual({
    allowed: false,
    category: "brand",
    resetAt,
  });
});

it("keeps admin and brand decisions independent", async () => {
  const resetAt = new Date("2026-10-13T20:45:00.000Z");

  rateLimitMock
    .mockResolvedValueOnce({
      ok: false,
      remaining: 0,
      resetAt,
    })
    .mockResolvedValueOnce({
      ok: true,
      remaining: 10,
      resetAt,
    });

  const adminDecision = await checkUnauthenticatedLoginAudit("admin");
  const brandDecision = await checkUnauthenticatedLoginAudit("brand");

  expect(adminDecision.allowed).toBe(false);
  expect(brandDecision.allowed).toBe(true);

  expect(rateLimitMock).toHaveBeenNthCalledWith(1, {
    key: "security_audit:unauthenticated_login:admin",
    limit: 300,
    windowMs: 60_000,
  });

  expect(rateLimitMock).toHaveBeenNthCalledWith(2, {
    key: "security_audit:unauthenticated_login:brand",
    limit: 300,
    windowMs: 60_000,
  });
});
});