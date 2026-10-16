import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  SecurityAuditCategory,
  SecurityEventSeverity,
  SecurityEventType,
} from "@prisma/client";

const { recordIncidentMock } = vi.hoisted(() => ({
  recordIncidentMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("./recordRateLimitIncident", () => ({
  recordRateLimitIncident: recordIncidentMock,
}));

import { recordAuditSuppressionIncident } from "./recordAuditSuppressionIncident";

describe("recordAuditSuppressionIncident", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    recordIncidentMock.mockResolvedValue({
      id: "test-suppression-incident",
    });
  });

  it("records a warning-level suppression incident", async () => {
    await recordAuditSuppressionIncident({
      category: "admin",
      auditResetAt: new Date("2026-10-13T21:00:00.000Z"),
    });

expect(recordIncidentMock).toHaveBeenCalledWith({
  type: SecurityEventType.AUDIT_INGESTION_SUPPRESSED,
  auditCategory: SecurityAuditCategory.ADMIN,
  severity: SecurityEventSeverity.WARNING,
      subjectHash: null,
      adminId: null,
      userId: null,
      deduplicationKey: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  });

  it("uses the same deduplication key for the same category and window", async () => {
    const input = {
      category: "brand" as const,
      auditResetAt: new Date("2026-10-13T21:00:00.000Z"),
    };

    await recordAuditSuppressionIncident(input);
    await recordAuditSuppressionIncident(input);

    const firstKey =
      recordIncidentMock.mock.calls[0][0].deduplicationKey;

    const secondKey =
      recordIncidentMock.mock.calls[1][0].deduplicationKey;

    expect(firstKey).toBe(secondKey);
  });

  it("uses different keys for admin and brand categories", async () => {
    const auditResetAt = new Date("2026-10-13T21:00:00.000Z");

    await recordAuditSuppressionIncident({
      category: "admin",
      auditResetAt,
    });

    await recordAuditSuppressionIncident({
      category: "brand",
      auditResetAt,
    });

    expect(
      recordIncidentMock.mock.calls[0][0].deduplicationKey,
    ).not.toBe(
      recordIncidentMock.mock.calls[1][0].deduplicationKey,
    );
  });

  it("uses different keys for different audit windows", async () => {
    await recordAuditSuppressionIncident({
      category: "admin",
      auditResetAt: new Date("2026-10-13T21:00:00.000Z"),
    });

    await recordAuditSuppressionIncident({
      category: "admin",
      auditResetAt: new Date("2026-10-13T21:01:00.000Z"),
    });

    expect(
      recordIncidentMock.mock.calls[0][0].deduplicationKey,
    ).not.toBe(
      recordIncidentMock.mock.calls[1][0].deduplicationKey,
    );
  });

  it("rejects invalid dates before attempting database writes", async () => {
    await expect(
      recordAuditSuppressionIncident({
        category: "admin",
        auditResetAt: new Date("invalid"),
      }),
    ).rejects.toThrow("Invalid audit suppression window");

    expect(recordIncidentMock).not.toHaveBeenCalled();
  });

  it("propagates persistence failures to the caller", async () => {
    recordIncidentMock.mockRejectedValue(
      new Error("Simulated database failure"),
    );

    await expect(
      recordAuditSuppressionIncident({
        category: "brand",
        auditResetAt: new Date("2026-10-13T21:00:00.000Z"),
      }),
    ).rejects.toThrow("Simulated database failure");
  });
  it("records brand suppression with the BRAND audit category", async () => {
  await recordAuditSuppressionIncident({
    category: "brand",
    auditResetAt: new Date("2026-10-13T21:00:00.000Z"),
  });

  expect(recordIncidentMock).toHaveBeenCalledWith(
    expect.objectContaining({
      type: SecurityEventType.AUDIT_INGESTION_SUPPRESSED,
      auditCategory: SecurityAuditCategory.BRAND,
      severity: SecurityEventSeverity.WARNING,
    }),
  );
});
it("rejects unknown audit categories before database writes", async () => {
  await expect(
    recordAuditSuppressionIncident({
      category: "unknown" as "admin",
      auditResetAt: new Date("2026-10-13T21:00:00.000Z"),
    }),
  ).rejects.toThrow("Invalid audit suppression category");

  expect(recordIncidentMock).not.toHaveBeenCalled();
});
});