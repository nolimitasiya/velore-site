import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminNotificationType, SecurityEventType } from "@prisma/client";

const { createMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

import { createSecurityNotification } from "./createSecurityNotification";

const db = {
  adminNotification: {
    create: createMock,
  },
} as unknown as Parameters<typeof createSecurityNotification>[1];

describe("createSecurityNotification", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    createMock.mockResolvedValue({
      id: "notification-test-id",
    });
  });

  it("creates an alert for administrator login rate limiting", async () => {
    await createSecurityNotification(
      {
        securityEventId: "security-event-1",
        securityEventType: SecurityEventType.ADMIN_LOGIN_RATE_LIMITED,
      },
      db,
    );

    expect(createMock).toHaveBeenCalledWith({
      data: {
        type: AdminNotificationType.SECURITY_ADMIN_LOGIN_RATE_LIMITED,
        securityEventId: "security-event-1",
      },
    });
  });

  it("does not create alerts for brand login rate limiting", async () => {
    const result = await createSecurityNotification(
      {
        securityEventId: "security-event-2",
        securityEventType: SecurityEventType.BRAND_LOGIN_RATE_LIMITED,
      },
      db,
    );

    expect(result).toBeNull();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("does not create alerts for successful administrator logins", async () => {
    const result = await createSecurityNotification(
      {
        securityEventId: "security-event-3",
        securityEventType: SecurityEventType.ADMIN_LOGIN_SUCCEEDED,
      },
      db,
    );

    expect(result).toBeNull();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("does not expose sensitive information in notification data", async () => {
    await createSecurityNotification(
      {
        securityEventId: "security-event-4",
        securityEventType: SecurityEventType.ADMIN_LOGIN_RATE_LIMITED,
      },
      db,
    );

    const data = createMock.mock.calls[0][0].data;

    expect(Object.keys(data).sort()).toEqual(["securityEventId", "type"]);

    expect(data).not.toHaveProperty("email");
    expect(data).not.toHaveProperty("password");
    expect(data).not.toHaveProperty("token");
    expect(data).not.toHaveProperty("ipAddress");
  });
});
