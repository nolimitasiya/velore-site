import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";

import { SecurityEventSeverity, SecurityEventType } from "@prisma/client";

const { createMock, incidentMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  incidentMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    securityEvent: {
      create: createMock,
    },
  },
}));

vi.mock("./recordRateLimitIncident", () => ({
  recordRateLimitIncident: incidentMock,
}));

import { recordSecurityEvent } from "./securityEvents";

const originalKey = process.env.SECURITY_AUDIT_HMAC_KEY;

const TEST_KEY = "a".repeat(64);

describe("recordSecurityEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    process.env.SECURITY_AUDIT_HMAC_KEY = TEST_KEY;

    createMock.mockResolvedValue({
      id: "test-security-event",
    });

    incidentMock.mockResolvedValue({
      id: "test-security-event",
    });
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.SECURITY_AUDIT_HMAC_KEY;
    } else {
      process.env.SECURITY_AUDIT_HMAC_KEY = originalKey;
    }
  });

  it("normalizes emails before hashing", async () => {
    await recordSecurityEvent({
      type: SecurityEventType.ADMIN_LOGIN_FAILED,
      email: "  Founder@Example.com  ",
    });

    const expectedHash = crypto
      .createHmac("sha256", TEST_KEY)
      .update("founder@example.com")
      .digest("hex");

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subjectHash: expectedHash,
      }),
    });
  });

  it("does not store raw email addresses", async () => {
    await recordSecurityEvent({
      type: SecurityEventType.ADMIN_LOGIN_FAILED,
      email: "founder@example.com",
    });

    const data = createMock.mock.calls[0][0].data;

    expect(data).not.toHaveProperty("email");
    expect(JSON.stringify(data)).not.toContain("founder@example.com");
  });

  it("produces the same hash for the same normalized email", async () => {
    await recordSecurityEvent({
      type: SecurityEventType.ADMIN_LOGIN_FAILED,
      email: "FOUNDER@example.com",
    });

    await recordSecurityEvent({
      type: SecurityEventType.ADMIN_LOGIN_FAILED,
      email: "founder@example.com",
    });

    const firstHash = createMock.mock.calls[0][0].data.subjectHash;
    const secondHash = createMock.mock.calls[1][0].data.subjectHash;

    expect(firstHash).toBe(secondHash);
  });

  it("produces different hashes for different emails", async () => {
    await recordSecurityEvent({
      type: SecurityEventType.ADMIN_LOGIN_FAILED,
      email: "first@example.com",
    });

    await recordSecurityEvent({
      type: SecurityEventType.ADMIN_LOGIN_FAILED,
      email: "second@example.com",
    });

    const firstHash = createMock.mock.calls[0][0].data.subjectHash;
    const secondHash = createMock.mock.calls[1][0].data.subjectHash;

    expect(firstHash).not.toBe(secondHash);
  });

  it("rejects a missing HMAC key", async () => {
    delete process.env.SECURITY_AUDIT_HMAC_KEY;

    await expect(
      recordSecurityEvent({
        type: SecurityEventType.ADMIN_LOGIN_FAILED,
        email: "founder@example.com",
      }),
    ).rejects.toThrow("SECURITY_AUDIT_HMAC_KEY is not configured");

    expect(createMock).not.toHaveBeenCalled();
  });

  it("rejects a weak HMAC key", async () => {
    process.env.SECURITY_AUDIT_HMAC_KEY = "short";

    await expect(
      recordSecurityEvent({
        type: SecurityEventType.ADMIN_LOGIN_FAILED,
        email: "founder@example.com",
      }),
    ).rejects.toThrow("SECURITY_AUDIT_HMAC_KEY is not configured");

    expect(createMock).not.toHaveBeenCalled();
  });

  it("defaults event severity to INFO", async () => {
    await recordSecurityEvent({
      type: SecurityEventType.ADMIN_LOGIN_SUCCEEDED,
    });

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        severity: SecurityEventSeverity.INFO,
      }),
    });
  });

  it("preserves an explicitly supplied severity", async () => {
    await recordSecurityEvent({
      type: SecurityEventType.ADMIN_LOGIN_RATE_LIMITED,
      severity: SecurityEventSeverity.WARNING,
      email: "admin@example.com",
      rateLimitResetAt: new Date("2026-10-11T12:00:00.000Z"),
    });

    expect(incidentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SecurityEventType.ADMIN_LOGIN_RATE_LIMITED,
        severity: SecurityEventSeverity.WARNING,
        deduplicationKey: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
      undefined,
    );

    expect(createMock).not.toHaveBeenCalled();
  });

  it("records administrator and user identifiers", async () => {
    await recordSecurityEvent({
      type: SecurityEventType.SESSION_REVOKED,
      adminId: "admin-test-id",
      userId: "00000000-0000-4000-8000-000000000001",
    });

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        adminId: "admin-test-id",
        userId: "00000000-0000-4000-8000-000000000001",
      }),
    });
  });

  it("uses a supplied transaction client", async () => {
    const transactionCreateMock = vi.fn().mockResolvedValue({
      id: "transaction-event",
    });

    const transactionClient = {
      securityEvent: {
        create: transactionCreateMock,
      },
    };

    await recordSecurityEvent(
      {
        type: SecurityEventType.PASSWORD_RESET_COMPLETED,
        adminId: "admin-test-id",
      },
      transactionClient as unknown as Parameters<typeof recordSecurityEvent>[1],
    );

    expect(transactionCreateMock).toHaveBeenCalledOnce();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("generates the same deduplication key for the same account and window", async () => {
    const resetAt = new Date("2026-10-11T12:00:00.000Z");

    await recordSecurityEvent({
      type: SecurityEventType.ADMIN_LOGIN_RATE_LIMITED,
      email: "  Admin@Example.com ",
      rateLimitResetAt: resetAt,
    });

    await recordSecurityEvent({
      type: SecurityEventType.ADMIN_LOGIN_RATE_LIMITED,
      email: "admin@example.com",
      rateLimitResetAt: resetAt,
    });

    const firstKey = incidentMock.mock.calls[0][0].deduplicationKey;
    const secondKey = incidentMock.mock.calls[1][0].deduplicationKey;

    expect(firstKey).toBe(secondKey);
    expect(firstKey).toMatch(/^[a-f0-9]{64}$/);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("generates different deduplication keys for different accounts", async () => {
    const resetAt = new Date("2026-10-11T12:00:00.000Z");

    await recordSecurityEvent({
      type: SecurityEventType.ADMIN_LOGIN_RATE_LIMITED,
      email: "first@example.com",
      rateLimitResetAt: resetAt,
    });

    await recordSecurityEvent({
      type: SecurityEventType.ADMIN_LOGIN_RATE_LIMITED,
      email: "second@example.com",
      rateLimitResetAt: resetAt,
    });

    const firstKey = incidentMock.mock.calls[0][0].deduplicationKey;
    const secondKey = incidentMock.mock.calls[1][0].deduplicationKey;

    expect(firstKey).not.toBe(secondKey);
  });

  it("generates different deduplication keys for different windows", async () => {
    await recordSecurityEvent({
      type: SecurityEventType.ADMIN_LOGIN_RATE_LIMITED,
      email: "admin@example.com",
      rateLimitResetAt: new Date("2026-10-11T12:00:00.000Z"),
    });

    await recordSecurityEvent({
      type: SecurityEventType.ADMIN_LOGIN_RATE_LIMITED,
      email: "admin@example.com",
      rateLimitResetAt: new Date("2026-10-11T12:15:00.000Z"),
    });

    const firstKey = incidentMock.mock.calls[0][0].deduplicationKey;
    const secondKey = incidentMock.mock.calls[1][0].deduplicationKey;

    expect(firstKey).not.toBe(secondKey);
  });

  it("keeps administrator and brand rate-limit events separate", async () => {
    const resetAt = new Date("2026-10-11T12:00:00.000Z");

    await recordSecurityEvent({
      type: SecurityEventType.ADMIN_LOGIN_RATE_LIMITED,
      email: "shared@example.com",
      rateLimitResetAt: resetAt,
    });

    await recordSecurityEvent({
      type: SecurityEventType.BRAND_LOGIN_RATE_LIMITED,
      email: "shared@example.com",
      rateLimitResetAt: resetAt,
    });

    const adminKey = incidentMock.mock.calls[0][0].deduplicationKey;
    const brandKey = incidentMock.mock.calls[1][0].deduplicationKey;

    expect(adminKey).not.toBe(brandKey);
  });

  it("rejects rate-limited events without a reset time", async () => {
    await expect(
      recordSecurityEvent({
        type: SecurityEventType.ADMIN_LOGIN_RATE_LIMITED,
        email: "admin@example.com",
      }),
    ).rejects.toThrow(
      "Rate-limited security events require an email and reset time",
    );

    expect(incidentMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("does not deduplicate ordinary login events", async () => {
    await recordSecurityEvent({
      type: SecurityEventType.ADMIN_LOGIN_SUCCEEDED,
      email: "admin@example.com",
    });

    await recordSecurityEvent({
      type: SecurityEventType.ADMIN_LOGIN_SUCCEEDED,
      email: "admin@example.com",
    });

    expect(createMock).toHaveBeenCalledTimes(2);
    expect(incidentMock).not.toHaveBeenCalled();

    expect(createMock.mock.calls[0][0].data.deduplicationKey).toBeNull();
    expect(createMock.mock.calls[1][0].data.deduplicationKey).toBeNull();
  });

  it("forwards an existing transaction to the atomic incident helper", async () => {
    const transactionClient = {
      securityEvent: {
        create: vi.fn(),
      },
    };

    await recordSecurityEvent(
      {
        type: SecurityEventType.ADMIN_LOGIN_RATE_LIMITED,
        email: "admin@example.com",
        rateLimitResetAt: new Date("2026-10-11T12:00:00.000Z"),
      },
      transactionClient as unknown as NonNullable<
        Parameters<typeof recordSecurityEvent>[1]
      >,
    );

    expect(incidentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SecurityEventType.ADMIN_LOGIN_RATE_LIMITED,
        deduplicationKey: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
      transactionClient,
    );
  });
});
