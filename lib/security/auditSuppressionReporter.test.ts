import { beforeEach, describe, expect, it, vi } from "vitest";

const { recordIncidentMock } = vi.hoisted(() => ({
  recordIncidentMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("./recordAuditSuppressionIncident", () => ({
  recordAuditSuppressionIncident: recordIncidentMock,
}));

import { reportAuditSuppression } from "./auditSuppressionReporter";

describe("audit suppression reporter", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    recordIncidentMock.mockResolvedValue({
      id: "test-incident",
    });
  });

  it("records the first suppression incident", async () => {
    const window = new Date("2099-01-01T00:01:00.000Z");

    await reportAuditSuppression("admin", window);

    expect(recordIncidentMock).toHaveBeenCalledWith({
      category: "admin",
      auditResetAt: window,
    });
  });

  it("does not record the same category/window twice", async () => {
    const window = new Date("2099-01-01T00:02:00.000Z");

    await reportAuditSuppression("admin", window);
    await reportAuditSuppression("admin", window);

    expect(recordIncidentMock).toHaveBeenCalledTimes(1);
  });

  it("keeps admin and brand windows separate", async () => {
    const window = new Date("2099-01-01T00:03:00.000Z");

    await reportAuditSuppression("admin", window);
    await reportAuditSuppression("brand", window);

    expect(recordIncidentMock).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight operation for concurrent calls", async () => {
    const window = new Date("2099-01-01T00:04:00.000Z");

    await Promise.all(
      Array.from({ length: 10 }, () =>
        reportAuditSuppression("admin", window),
      ),
    );

    expect(recordIncidentMock).toHaveBeenCalledTimes(1);
  });

  it("allows retry after an incident write fails", async () => {
    const window = new Date("2099-01-01T00:05:00.000Z");

    recordIncidentMock
      .mockRejectedValueOnce(new Error("Temporary database failure"))
      .mockResolvedValueOnce({ id: "recovered-incident" });

    await expect(
      reportAuditSuppression("brand", window),
    ).rejects.toThrow("Temporary database failure");

    await expect(
      reportAuditSuppression("brand", window),
    ).resolves.toBeUndefined();

    expect(recordIncidentMock).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid audit windows", async () => {
    await expect(
      reportAuditSuppression("admin", new Date("invalid")),
    ).rejects.toThrow("Invalid audit suppression window");

    expect(recordIncidentMock).not.toHaveBeenCalled();
  });
});