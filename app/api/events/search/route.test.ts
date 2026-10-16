import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  checkAnalyticsRateLimitMock,
  analyticsFindFirstMock,
  analyticsCreateMock,
  getSessionMock,
  attachCookieMock,
} = vi.hoisted(() => ({
  checkAnalyticsRateLimitMock: vi.fn(),
  analyticsFindFirstMock: vi.fn(),
  analyticsCreateMock: vi.fn(),
  getSessionMock: vi.fn(),
  attachCookieMock: vi.fn(),
}));

vi.mock("@/lib/security/analyticsRateLimit", () => ({
  checkAnalyticsRateLimit: checkAnalyticsRateLimitMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    analyticsEvent: {
      findFirst: analyticsFindFirstMock,
      create: analyticsCreateMock,
    },
  },
}));

vi.mock("@/lib/analytics/session", () => ({
  getOrCreateAnalyticsSession: getSessionMock,
  attachAnalyticsSessionCookie: attachCookieMock,
}));

import { NextRequest } from "next/server";
import {
  AnalyticsEventType,
  AnalyticsSourcePage,
} from "@prisma/client";
import { POST } from "./route";

function makeRequest(
  body: unknown = {
    query: "Modest Dresses",
    resultsCount: 12,
  },
  userAgent = "Mozilla/5.0",
) {
  return new NextRequest(
    "https://example.com/api/events/search",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": userAgent,
      },
      body: JSON.stringify(body),
    },
  );
}

describe("POST /api/events/search", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    checkAnalyticsRateLimitMock.mockResolvedValue({
      status: "ALLOWED",
      resetAt: new Date(Date.now() + 60_000),
    });

    getSessionMock.mockResolvedValue({
      sessionId: "session-1",
      shopperCountryCode: "GB",
      shopperCurrencyCode: "GBP",
    });

    analyticsFindFirstMock.mockResolvedValue(null);

    analyticsCreateMock.mockResolvedValue({
      id: "event-1",
    });
  });

  it("returns 429 with Retry-After when rate-limited", async () => {
    checkAnalyticsRateLimitMock.mockResolvedValue({
      status: "BLOCKED",
      resetAt: new Date(Date.now() + 30_000),
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Too many requests",
    });

    const retryAfter = Number(
      response.headers.get("Retry-After"),
    );

    expect(Number.isInteger(retryAfter)).toBe(true);
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(30);

    expect(checkAnalyticsRateLimitMock).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "search",
    );

    expect(getSessionMock).not.toHaveBeenCalled();
    expect(analyticsFindFirstMock).not.toHaveBeenCalled();
    expect(analyticsCreateMock).not.toHaveBeenCalled();
  });

  it("records a valid search with normalized query and metadata", async () => {
    const response = await POST(
      makeRequest({
        query: "  MODEST_Dresses   For Work  ",
        resultsCount: 12.8,
        sourcePath: "/discover",
        intent: {
          productTypes: ["DRESS"],
          occasions: ["WORKWEAR"],
          colours: ["BLACK"],
        },
        filters: {
          continent: "EUROPE",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      duplicate: false,
    });

    expect(analyticsCreateMock).toHaveBeenCalledOnce();

    expect(analyticsCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sessionId: "session-1",
        eventType: AnalyticsEventType.SEARCH,
        query: "MODEST_Dresses   For Work",
        normalizedQuery: "modest dresses for work",
        resultsCount: 12,
        sourcePage: AnalyticsSourcePage.SEARCH,
        sourcePath: "/discover",
        shopperCountryCode: "GB",
        shopperCurrencyCode: "GBP",
        filters: {
          continent: "EUROPE",
        },
        metadata: {
          intent: {
            productTypes: ["DRESS"],
            occasions: ["WORKWEAR"],
            colours: ["BLACK"],
            styles: [],
            materials: [],
          },
          zeroResults: false,
        },
      }),
    });

    expect(attachCookieMock).toHaveBeenCalledOnce();
  });

  it("deduplicates repeated searches within five seconds", async () => {
    analyticsFindFirstMock.mockResolvedValue({
      id: "existing-event",
    });

    const response = await POST(
      makeRequest({
        query: "Modest Dresses",
        resultsCount: 8,
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      duplicate: true,
    });

    expect(analyticsFindFirstMock).toHaveBeenCalledWith({
      where: {
        sessionId: "session-1",
        eventType: AnalyticsEventType.SEARCH,
        normalizedQuery: "modest dresses",
        createdAt: {
          gte: expect.any(Date),
        },
      },
      select: {
        id: true,
      },
    });

    expect(analyticsCreateMock).not.toHaveBeenCalled();
    expect(attachCookieMock).toHaveBeenCalledOnce();
  });

  it("rejects an empty search query", async () => {
    const response = await POST(
      makeRequest({
        query: "   ",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Search query is required",
    });

    expect(getSessionMock).not.toHaveBeenCalled();
    expect(analyticsCreateMock).not.toHaveBeenCalled();
  });

  it("rejects a missing search query", async () => {
    const response = await POST(makeRequest({}));

    expect(response.status).toBe(400);
    expect(analyticsCreateMock).not.toHaveBeenCalled();
  });

  it("rejects bots before rate limiting", async () => {
    const response = await POST(
      makeRequest(
        { query: "Modest Dresses" },
        "Googlebot",
      ),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Automated request rejected",
    });

    expect(checkAnalyticsRateLimitMock).not.toHaveBeenCalled();
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(analyticsCreateMock).not.toHaveBeenCalled();
  });

  it("continues tracking when trusted IP is unavailable", async () => {
    checkAnalyticsRateLimitMock.mockResolvedValue({
      status: "NOT_ENFORCED",
      reason: "CLIENT_IP_NOT_TRUSTED",
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      duplicate: false,
    });

    expect(analyticsCreateMock).toHaveBeenCalledOnce();
  });

  it("records zero results and defaults the source path", async () => {
    const response = await POST(
      makeRequest({
        query: "Unusual search",
        resultsCount: -5,
      }),
    );

    expect(response.status).toBe(200);

    expect(analyticsCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        resultsCount: 0,
        sourcePath: "/search",
        metadata: {
          intent: {
            productTypes: [],
            occasions: [],
            colours: [],
            styles: [],
            materials: [],
          },
          zeroResults: true,
        },
      }),
    });
  });

  it("returns a safe response when analytics storage fails", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      analyticsCreateMock.mockRejectedValue(
        new Error("Simulated analytics storage failure"),
      );

      const response = await POST(makeRequest());

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        ok: false,
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});