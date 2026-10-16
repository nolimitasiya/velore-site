import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  findUniqueMock,
  updateMock,
  createMock,
  executeRawMock,
  getAuthenticatedShopperMock,
  checkAnalyticsSessionCreationLimitMock,
} = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  updateMock: vi.fn(),
  createMock: vi.fn(),
  executeRawMock: vi.fn(),
  getAuthenticatedShopperMock: vi.fn(),
  checkAnalyticsSessionCreationLimitMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $executeRaw: executeRawMock,
    analyticsSession: {
      findUnique: findUniqueMock,
      update: updateMock,
      create: createMock,
    },
  },
}));

vi.mock("@/lib/auth/ShopperSession", () => ({
  getAuthenticatedShopper: getAuthenticatedShopperMock,
}));

vi.mock("@/lib/security/analyticsSessionCreationLimit", () => ({
  checkAnalyticsSessionCreationLimit:
    checkAnalyticsSessionCreationLimitMock,
}));

import { NextRequest } from "next/server";

import {
  getOrCreateAnalyticsSession,
} from "./session";

function makeRequest(
  sessionId?: string,
) {
  return new NextRequest(
    "https://example.com/",
    {
      headers: sessionId
        ? {
            cookie: `vc_session=${sessionId}`,
          }
        : {},
    },
  );
}

describe("getOrCreateAnalyticsSession", () => {
  it("bypasses the creation limiter for existing sessions", async () => {
    findUniqueMock.mockResolvedValue({
      id: "existing-session",
      lastSeenAt: new Date(),
      shopperId: null,
    });

    const result = await getOrCreateAnalyticsSession(
      makeRequest("existing-session"),
    );

    expect(result.sessionId).toBe("existing-session");
    expect(result.isNew).toBe(false);

    expect(checkAnalyticsSessionCreationLimitMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("checks the creation limiter exactly once for new sessions", async () => {
    const result = await getOrCreateAnalyticsSession(makeRequest());

    expect(result.sessionId).toBe("new-session");
    expect(result.isNew).toBe(true);

    expect(checkAnalyticsSessionCreationLimitMock).toHaveBeenCalledOnce();
    expect(createMock).toHaveBeenCalledOnce();
  });

  it("never creates a database session when creation is blocked", async () => {
    checkAnalyticsSessionCreationLimitMock.mockResolvedValue({
      status: "BLOCKED",
      resetAt: new Date("2026-10-14T20:00:00.000Z"),
    });

    await expect(
      getOrCreateAnalyticsSession(makeRequest()),
    ).rejects.toMatchObject({
      code: "ANALYTICS_SESSION_CREATION_BLOCKED",
    });

    expect(checkAnalyticsSessionCreationLimitMock).toHaveBeenCalledOnce();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("keeps authenticated shoppers in separate new sessions", async () => {
    getAuthenticatedShopperMock
      .mockResolvedValueOnce({ id: "shopper-1" })
      .mockResolvedValueOnce({ id: "shopper-2" });

    createMock
      .mockResolvedValueOnce({ id: "session-1" })
      .mockResolvedValueOnce({ id: "session-2" });

    const first = await getOrCreateAnalyticsSession(makeRequest());
    const second = await getOrCreateAnalyticsSession(makeRequest());

    expect(first.sessionId).toBe("session-1");
    expect(second.sessionId).toBe("session-2");

    expect(first.shopperId).toBe("shopper-1");
    expect(second.shopperId).toBe("shopper-2");

    expect(checkAnalyticsSessionCreationLimitMock).toHaveBeenCalledTimes(2);
    expect(createMock).toHaveBeenCalledTimes(2);
  });
  beforeEach(() => {
    vi.resetAllMocks();

    getAuthenticatedShopperMock.mockResolvedValue(null);

    checkAnalyticsSessionCreationLimitMock.mockResolvedValue({
      status: "NOT_ENFORCED",
      reason: "DISABLED",
    });

    findUniqueMock.mockResolvedValue(null);

    executeRawMock.mockResolvedValue(1);

    createMock.mockResolvedValue({
      id: "new-session",
    });
  });

  it("reuses a fresh session without creating another", async () => {
    findUniqueMock.mockResolvedValue({
      id: "existing-session",
      lastSeenAt: new Date(),
      shopperId: null,
    });

    const result = await getOrCreateAnalyticsSession(
      makeRequest("existing-session"),
    );

    expect(result.sessionId).toBe("existing-session");
    expect(result.isNew).toBe(false);

    expect(executeRawMock).toHaveBeenCalledOnce();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates a new session when no cookie exists", async () => {
    const result = await getOrCreateAnalyticsSession(
      makeRequest(),
    );

    expect(result.sessionId).toBe("new-session");
    expect(result.isNew).toBe(true);

    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(createMock).toHaveBeenCalledOnce();
  });

  it("creates a new session when the existing session expired", async () => {
    findUniqueMock.mockResolvedValue({
      id: "expired-session",
      lastSeenAt: new Date(
        Date.now() - 31 * 60 * 1000,
      ),
      shopperId: null,
    });

    const result = await getOrCreateAnalyticsSession(
      makeRequest("expired-session"),
    );

    expect(result.isNew).toBe(true);
    expect(createMock).toHaveBeenCalledOnce();
    expect(executeRawMock).not.toHaveBeenCalled();
  });

  it("creates a new session when shopper identity changes", async () => {
    getAuthenticatedShopperMock.mockResolvedValue({
      id: "shopper-1",
    });

    findUniqueMock.mockResolvedValue({
      id: "existing-session",
      lastSeenAt: new Date(),
      shopperId: null,
    });

    const result = await getOrCreateAnalyticsSession(
      makeRequest("existing-session"),
    );

    expect(result.isNew).toBe(true);
    expect(createMock).toHaveBeenCalledOnce();
    expect(executeRawMock).not.toHaveBeenCalled();
  });

  it("preserves acquisition attribution when creating a session", async () => {
    await getOrCreateAnalyticsSession(
      makeRequest(),
      {
        utmSource: "Instagram",
        utmMedium: "Organic_Social",
        utmCampaign: "Launch",
        landingPath: "/discover",
      },
    );

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          acquisitionSource: "instagram",
          acquisitionMedium: "organic_social",
          acquisitionCampaign: "launch",
          landingPath: "/discover",
        }),
      }),
    );
  });

  it("does not overwrite acquisition attribution when reusing a session", async () => {
    findUniqueMock.mockResolvedValue({
      id: "existing-session",
      lastSeenAt: new Date(),
      shopperId: null,
    });

    const result = await getOrCreateAnalyticsSession(
      makeRequest("existing-session"),
      {
        utmSource: "tiktok",
        utmCampaign: "new-campaign",
      },
    );

    expect(result.isNew).toBe(false);
    expect(result.shouldSetAttributionCookie).toBe(false);

    expect(createMock).not.toHaveBeenCalled();

    expect(executeRawMock).toHaveBeenCalledOnce();
    expect(updateMock).not.toHaveBeenCalled();
  });

   it("updates lastSeenAt even when the shopper was active 20 seconds ago", async () => {
  findUniqueMock.mockResolvedValue({
    id: "existing-session",
    lastSeenAt: new Date(
      Date.now() - 20 * 1000,
    ),
    shopperId: null,
  });

  const result = await getOrCreateAnalyticsSession(
    makeRequest("existing-session"),
  );

  expect(result.sessionId).toBe("existing-session");
  expect(result.isNew).toBe(false);

  expect(executeRawMock).toHaveBeenCalledOnce();

  expect(executeRawMock).toHaveBeenCalledOnce();
  expect(updateMock).not.toHaveBeenCalled();

  expect(createMock).not.toHaveBeenCalled();
});

  it("updates a session last seen more than 60 seconds ago", async () => {
    findUniqueMock.mockResolvedValue({
      id: "existing-session",
      lastSeenAt: new Date(
        Date.now() - 2 * 60 * 1000,
      ),
      shopperId: null,
    });

    const result = await getOrCreateAnalyticsSession(
      makeRequest("existing-session"),
    );

    expect(result.sessionId).toBe("existing-session");
    expect(result.isNew).toBe(false);

    expect(executeRawMock).toHaveBeenCalledOnce();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("preserves a session with continued activity beyond 30 minutes", async () => {
    findUniqueMock.mockResolvedValue({
      id: "existing-session",
      lastSeenAt: new Date(
        Date.now() - 2 * 60 * 1000,
      ),
      shopperId: null,
    });

    const result = await getOrCreateAnalyticsSession(
      makeRequest("existing-session"),
    );

    expect(result.sessionId).toBe("existing-session");
    expect(result.isNew).toBe(false);

    expect(executeRawMock).toHaveBeenCalledOnce();
    expect(createMock).not.toHaveBeenCalled();
  });
  it("creates a replacement session if the existing session disappears during update", async () => {
  findUniqueMock.mockResolvedValue({
    id: "existing-session",
    lastSeenAt: new Date(),
    shopperId: null,
  });

  executeRawMock.mockResolvedValue(0);

  const result = await getOrCreateAnalyticsSession(
    makeRequest("existing-session"),
  );

  expect(executeRawMock).toHaveBeenCalledOnce();

  expect(createMock).toHaveBeenCalledOnce();

  expect(result.sessionId).toBe("new-session");
  expect(result.isNew).toBe(true);
});
it("reuses the existing session when PostgreSQL updates one row", async () => {
  findUniqueMock.mockResolvedValue({
    id: "existing-session",
    lastSeenAt: new Date(),
    shopperId: null,
  });

  executeRawMock.mockResolvedValue(1);

  const result = await getOrCreateAnalyticsSession(
    makeRequest("existing-session"),
  );

  expect(executeRawMock).toHaveBeenCalledOnce();

  expect(createMock).not.toHaveBeenCalled();

  expect(result.sessionId).toBe("existing-session");
  expect(result.isNew).toBe(false);
});
});