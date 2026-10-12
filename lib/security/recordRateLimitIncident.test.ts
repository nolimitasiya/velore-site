import { beforeEach, describe, expect, it, vi } from "vitest";

import { SecurityEventSeverity, SecurityEventType } from "@prisma/client";

const { transactionMock, queryRawMock, findUniqueMock, notificationMock } =
  vi.hoisted(() => ({
    transactionMock: vi.fn(),
    queryRawMock: vi.fn(),
    findUniqueMock: vi.fn(),
    notificationMock: vi.fn(),
  }));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
  },
}));

vi.mock("./createSecurityNotification", () => ({
  createSecurityNotification: notificationMock,
}));

import { recordRateLimitIncident } from "./recordRateLimitIncident";

const adminIncident = {
  type: SecurityEventType.ADMIN_LOGIN_RATE_LIMITED,
  severity: SecurityEventSeverity.WARNING,
  subjectHash: "a".repeat(64),
  adminId: null,
  userId: null,
  deduplicationKey: "b".repeat(64),
};

const brandIncident = {
  ...adminIncident,
  type: SecurityEventType.BRAND_LOGIN_RATE_LIMITED,
  deduplicationKey: "c".repeat(64),
};

const storedEvent = {
  id: "new-security-event",
  type: SecurityEventType.ADMIN_LOGIN_RATE_LIMITED,
  severity: SecurityEventSeverity.WARNING,
  subjectHash: adminIncident.subjectHash,
  adminId: null,
  userId: null,
  deduplicationKey: adminIncident.deduplicationKey,
  createdAt: new Date("2026-10-11T12:00:00.000Z"),
};

const transactionClient = {
  $queryRaw: queryRawMock,
  securityEvent: {
    findUnique: findUniqueMock,
  },
};

describe("recordRateLimitIncident", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    queryRawMock.mockResolvedValue([{ id: "new-security-event" }]);

    findUniqueMock.mockResolvedValue(storedEvent);

    notificationMock.mockResolvedValue({
      id: "new-admin-notification",
    });

    transactionMock.mockImplementation(async (callback) =>
      callback(transactionClient),
    );
  });

  it("returns the complete event and creates an alert for a new administrator incident", async () => {
    const result = await recordRateLimitIncident(adminIncident);

    expect(result).toEqual(storedEvent);

    expect(transactionMock).toHaveBeenCalledOnce();
    expect(queryRawMock).toHaveBeenCalledOnce();

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: {
        id: "new-security-event",
      },
    });

    expect(notificationMock).toHaveBeenCalledWith(
      {
        securityEventId: "new-security-event",
        securityEventType: SecurityEventType.ADMIN_LOGIN_RATE_LIMITED,
      },
      transactionClient,
    );
  });

  it("returns the existing event without creating another notification", async () => {
    queryRawMock.mockResolvedValue([]);

    const result = await recordRateLimitIncident(adminIncident);

    expect(result).toEqual(storedEvent);

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: {
        deduplicationKey: adminIncident.deduplicationKey,
      },
    });

    expect(notificationMock).not.toHaveBeenCalled();
  });

  it("passes new brand incidents to the notification helper", async () => {
    await recordRateLimitIncident(brandIncident);

    expect(notificationMock).toHaveBeenCalledWith(
      {
        securityEventId: "new-security-event",
        securityEventType: SecurityEventType.BRAND_LOGIN_RATE_LIMITED,
      },
      transactionClient,
    );
  });

  it("propagates notification failures so the transaction can roll back", async () => {
    notificationMock.mockRejectedValue(new Error("Notification write failed"));

    await expect(recordRateLimitIncident(adminIncident)).rejects.toThrow(
      "Notification write failed",
    );

    expect(transactionMock).toHaveBeenCalledOnce();
  });

  it("reuses an existing transaction", async () => {
    const result = await recordRateLimitIncident(
      adminIncident,
      transactionClient as unknown as NonNullable<
        Parameters<typeof recordRateLimitIncident>[1]
      >,
    );

    expect(result).toEqual(storedEvent);
    expect(transactionMock).not.toHaveBeenCalled();

    expect(notificationMock).toHaveBeenCalledWith(
      expect.anything(),
      transactionClient,
    );
  });

  it("rejects an inconsistent duplicate lookup", async () => {
    queryRawMock.mockResolvedValue([]);
    findUniqueMock.mockResolvedValue(null);

    await expect(recordRateLimitIncident(adminIncident)).rejects.toThrow(
      "Security incident deduplication failed: existing event not found",
    );

    expect(notificationMock).not.toHaveBeenCalled();
  });

  it("rejects when a newly inserted event cannot be retrieved", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(recordRateLimitIncident(adminIncident)).rejects.toThrow(
      "Security incident insertion failed: new event not found",
    );

    expect(notificationMock).not.toHaveBeenCalled();
  });
});
