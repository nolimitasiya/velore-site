import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SecurityEventSeverity, SecurityEventType } from "@prisma/client";

const { recordSecurityEventMock, allowAuditMock } = vi.hoisted(() => ({
  recordSecurityEventMock: vi.fn(),
  allowAuditMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/security/auditIngestion", () => ({
  allowUnauthenticatedLoginAudit: allowAuditMock,
}));

vi.mock("@/lib/security/securityEvents", () => ({
  recordSecurityEvent: recordSecurityEventMock,
}));

import { isLoginAuditEnabled, recordLoginAudit } from "./loginAudit";

const originalEnabled = process.env.SECURITY_AUDIT_ENABLED;

describe("login security audit", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.SECURITY_AUDIT_ENABLED;
    allowAuditMock.mockResolvedValue(true);

    recordSecurityEventMock.mockResolvedValue({
      id: "test-security-event",
    });
  });

  afterEach(() => {
    if (originalEnabled === undefined) {
      delete process.env.SECURITY_AUDIT_ENABLED;
    } else {
      process.env.SECURITY_AUDIT_ENABLED = originalEnabled;
    }

    vi.restoreAllMocks();
  });

  it("is disabled by default", () => {
    expect(isLoginAuditEnabled()).toBe(false);
  });

  it("remains disabled when the flag is false", async () => {
    process.env.SECURITY_AUDIT_ENABLED = "false";

    await recordLoginAudit({
      type: "ADMIN_LOGIN_FAILED",
      email: "admin@example.com",
    });

    expect(recordSecurityEventMock).not.toHaveBeenCalled();
  });

  it("only enables auditing for the exact value true", () => {
    process.env.SECURITY_AUDIT_ENABLED = "TRUE";
    expect(isLoginAuditEnabled()).toBe(false);

    process.env.SECURITY_AUDIT_ENABLED = "1";
    expect(isLoginAuditEnabled()).toBe(false);

    process.env.SECURITY_AUDIT_ENABLED = "true";
    expect(isLoginAuditEnabled()).toBe(true);
  });

  it("records successful administrator logins as INFO", async () => {
    process.env.SECURITY_AUDIT_ENABLED = "true";

    await recordLoginAudit({
      type: "ADMIN_LOGIN_SUCCEEDED",
      email: "admin@example.com",
      adminId: "admin-123",
    });

    expect(recordSecurityEventMock).toHaveBeenCalledWith({
      type: SecurityEventType.ADMIN_LOGIN_SUCCEEDED,
      severity: SecurityEventSeverity.INFO,
      email: "admin@example.com",
      adminId: "admin-123",
      userId: undefined,
    });
  });

  it("records failed administrator logins as WARNING", async () => {
    process.env.SECURITY_AUDIT_ENABLED = "true";

    await recordLoginAudit({
      type: "ADMIN_LOGIN_FAILED",
      email: "admin@example.com",
    });

    expect(recordSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SecurityEventType.ADMIN_LOGIN_FAILED,
        severity: SecurityEventSeverity.WARNING,
      }),
    );
  });

  it("records administrator rate-limit events as WARNING", async () => {
    process.env.SECURITY_AUDIT_ENABLED = "true";

    await recordLoginAudit({
      type: "ADMIN_LOGIN_RATE_LIMITED",
      email: "admin@example.com",
    });

    expect(recordSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SecurityEventType.ADMIN_LOGIN_RATE_LIMITED,
        severity: SecurityEventSeverity.WARNING,
      }),
    );
  });

  it("records successful brand logins as INFO", async () => {
    process.env.SECURITY_AUDIT_ENABLED = "true";

    await recordLoginAudit({
      type: "BRAND_LOGIN_SUCCEEDED",
      email: "brand@example.com",
      userId: "user-123",
    });

    expect(recordSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SecurityEventType.BRAND_LOGIN_SUCCEEDED,
        severity: SecurityEventSeverity.INFO,
        userId: "user-123",
      }),
    );
  });

  it("records failed brand logins as WARNING", async () => {
    process.env.SECURITY_AUDIT_ENABLED = "true";

    await recordLoginAudit({
      type: "BRAND_LOGIN_FAILED",
      email: "brand@example.com",
    });

    expect(recordSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SecurityEventType.BRAND_LOGIN_FAILED,
        severity: SecurityEventSeverity.WARNING,
      }),
    );
  });

  it("records brand rate-limit events as WARNING", async () => {
    process.env.SECURITY_AUDIT_ENABLED = "true";

    await recordLoginAudit({
      type: "BRAND_LOGIN_RATE_LIMITED",
      email: "brand@example.com",
    });

    expect(recordSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SecurityEventType.BRAND_LOGIN_RATE_LIMITED,
        severity: SecurityEventSeverity.WARNING,
      }),
    );
  });

  it("does not throw when audit recording fails", async () => {
    process.env.SECURITY_AUDIT_ENABLED = "true";

    recordSecurityEventMock.mockRejectedValue(
      new Error("Simulated database failure"),
    );

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      recordLoginAudit({
        type: "ADMIN_LOGIN_FAILED",
        email: "admin@example.com",
      }),
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      "[security-audit] Failed to record login event",
    );
  });

  it("does not include sensitive details in audit failure logs", async () => {
    process.env.SECURITY_AUDIT_ENABLED = "true";

    recordSecurityEventMock.mockRejectedValue(
      new Error("Sensitive database details"),
    );

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await recordLoginAudit({
      type: "ADMIN_LOGIN_FAILED",
      email: "private@example.com",
    });

    const loggedOutput = JSON.stringify(consoleSpy.mock.calls);

    expect(loggedOutput).not.toContain("private@example.com");
    expect(loggedOutput).not.toContain("Sensitive database details");
  });
  it("skips unauthenticated events when the global ingestion cap is reached", async () => {
    process.env.SECURITY_AUDIT_ENABLED = "true";

    allowAuditMock.mockResolvedValue(false);

    await recordLoginAudit({
      type: "ADMIN_LOGIN_FAILED",
      email: "admin@example.com",
    });

    expect(allowAuditMock).toHaveBeenCalledOnce();
    expect(recordSecurityEventMock).not.toHaveBeenCalled();
  });

  it("does not block successful logins when the ingestion cap is exhausted", async () => {
    process.env.SECURITY_AUDIT_ENABLED = "true";

    allowAuditMock.mockResolvedValue(false);

    await recordLoginAudit({
      type: "BRAND_LOGIN_SUCCEEDED",
      email: "brand@example.com",
      userId: "test-user-id",
    });

    expect(allowAuditMock).not.toHaveBeenCalled();

    expect(recordSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SecurityEventType.BRAND_LOGIN_SUCCEEDED,
        severity: SecurityEventSeverity.INFO,
      }),
    );
  });
});
