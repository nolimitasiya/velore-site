import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  checkAnalyticsRateLimitMock,
  brandFindUniqueMock,
  analyticsFindFirstMock,
  analyticsCreateMock,
  getSessionMock,
  attachCookieMock,
} = vi.hoisted(() => ({
  checkAnalyticsRateLimitMock: vi.fn(),
  brandFindUniqueMock: vi.fn(),
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
    brand: {
      findUnique: brandFindUniqueMock,
    },
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
  AffiliateStatus,
  BrandAccountStatus,
} from "@prisma/client";
import { POST } from "./route";

function makeRequest(body: unknown = { brandId: "brand-1" }) {
  return new NextRequest(
    "https://example.com/api/events/brand-view",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0",
      },
      body: JSON.stringify(body),
    },
  );
}

describe("POST /api/events/brand-view", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    checkAnalyticsRateLimitMock.mockResolvedValue({
      status: "ALLOWED",
      resetAt: new Date("2026-10-14T09:00:00Z"),
    });

    brandFindUniqueMock.mockResolvedValue({
      id: "brand-1",
      accountStatus: BrandAccountStatus.ACTIVE,
      affiliateStatus: AffiliateStatus.ACTIVE,
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

  it("returns 429 when rate-limited without querying analytics", async () => {
    checkAnalyticsRateLimitMock.mockResolvedValue({
      status: "BLOCKED",
      resetAt: new Date("2026-10-14T09:00:00Z"),
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Too many requests",
    });

    expect(brandFindUniqueMock).not.toHaveBeenCalled();
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(analyticsCreateMock).not.toHaveBeenCalled();
  });

  it("records an eligible brand view", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      duplicate: false,
    });

    expect(checkAnalyticsRateLimitMock).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "brand-view",
    );

    expect(analyticsCreateMock).toHaveBeenCalledOnce();

    expect(analyticsCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        brandId: "brand-1",
        sessionId: "session-1",
      }),
    });

    expect(attachCookieMock).toHaveBeenCalledOnce();
  });

  it("does not create a duplicate brand view", async () => {
    analyticsFindFirstMock.mockResolvedValue({
      id: "existing-event",
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      duplicate: true,
    });

    expect(analyticsCreateMock).not.toHaveBeenCalled();
    expect(attachCookieMock).toHaveBeenCalledOnce();
  });

  it("rejects unavailable brands", async () => {
    brandFindUniqueMock.mockResolvedValue(null);

    const response = await POST(makeRequest());

    expect(response.status).toBe(404);
    expect(analyticsCreateMock).not.toHaveBeenCalled();
  });

  it("rejects automated user agents before rate limiting", async () => {
    const request = new NextRequest(
      "https://example.com/api/events/brand-view",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "Googlebot",
        },
        body: JSON.stringify({ brandId: "brand-1" }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(403);

    expect(
      checkAnalyticsRateLimitMock,
    ).not.toHaveBeenCalled();

    expect(analyticsCreateMock).not.toHaveBeenCalled();
  });

  it("preserves tracking when IP enforcement is unavailable", async () => {
    checkAnalyticsRateLimitMock.mockResolvedValue({
      status: "NOT_ENFORCED",
      reason: "CLIENT_IP_NOT_TRUSTED",
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(analyticsCreateMock).toHaveBeenCalledOnce();
  });
  it("preserves an earlier Search entry on a brand view", async () => {
  const response = await POST(
    makeRequest({
      brandId: "brand-1",
      discoverySource: "SEARCH",
      entrySource: "SEARCH",
      sectionKey: "search_results",
      position: 5,
      pageNumber: 4,
      contextType: "SEARCH_RESULTS",
    }),
  );

  expect(response.status).toBe(200);

  expect(analyticsCreateMock).toHaveBeenCalledWith({
    data: expect.objectContaining({
      sessionId: "session-1",
      brandId: "brand-1",
      metadata: expect.objectContaining({
        discoverySource: "SEARCH",
        entrySource: "SEARCH",
        sectionKey: "search_results",
        position: 5,
        pageNumber: 4,
        contextType: "SEARCH_RESULTS",
      }),
    }),
  });
});
});