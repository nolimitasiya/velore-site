import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  checkAnalyticsRateLimitMock,
  productFindUniqueMock,
  analyticsFindFirstMock,
  analyticsCreateMock,
  getSessionMock,
  attachCookieMock,
} = vi.hoisted(() => ({
  checkAnalyticsRateLimitMock: vi.fn(),
  productFindUniqueMock: vi.fn(),
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
    product: {
      findUnique: productFindUniqueMock,
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
import { AnalyticsEventType } from "@prisma/client";
import { POST } from "./route";

function makeRequest(
  body: unknown = { productId: "product-1" },
  userAgent = "Mozilla/5.0",
) {
  return new NextRequest(
    "https://example.com/api/events/product-view",
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

describe("POST /api/events/product-view", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    checkAnalyticsRateLimitMock.mockResolvedValue({
      status: "ALLOWED",
      resetAt: new Date("2026-10-14T09:00:00Z"),
    });

    productFindUniqueMock.mockResolvedValue({
      id: "product-1",
      brandId: "brand-1",
      status: "APPROVED",
      isActive: true,
      publishedAt: new Date("2026-10-01T10:00:00Z"),
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

  it("returns 429 when rate-limited without querying products", async () => {
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

    expect(productFindUniqueMock).not.toHaveBeenCalled();
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(analyticsCreateMock).not.toHaveBeenCalled();
  });

  it("records a view for an eligible product", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      duplicate: false,
    });

    expect(checkAnalyticsRateLimitMock).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "product-view",
    );

    expect(analyticsCreateMock).toHaveBeenCalledOnce();

    expect(analyticsCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sessionId: "session-1",
        productId: "product-1",
        brandId: "brand-1",
        eventType: AnalyticsEventType.PRODUCT_VIEW,
      }),
    });

    expect(attachCookieMock).toHaveBeenCalledOnce();
  });

  it("does not create a duplicate product view", async () => {
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

  it("rejects an unavailable product", async () => {
    productFindUniqueMock.mockResolvedValue(null);

    const response = await POST(makeRequest());

    expect(response.status).toBe(404);
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(analyticsCreateMock).not.toHaveBeenCalled();
  });

  it("rejects an unpublished product", async () => {
    productFindUniqueMock.mockResolvedValue({
      id: "product-1",
      brandId: "brand-1",
      status: "APPROVED",
      isActive: true,
      publishedAt: null,
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(404);
    expect(analyticsCreateMock).not.toHaveBeenCalled();
  });

  it("rejects bots before rate limiting", async () => {
    const response = await POST(
      makeRequest({ productId: "product-1" }, "Googlebot"),
    );

    expect(response.status).toBe(403);
    expect(checkAnalyticsRateLimitMock).not.toHaveBeenCalled();
    expect(analyticsCreateMock).not.toHaveBeenCalled();
  });

  it("continues tracking when trusted IP is unavailable", async () => {
    checkAnalyticsRateLimitMock.mockResolvedValue({
      status: "NOT_ENFORCED",
      reason: "CLIENT_IP_NOT_TRUSTED",
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(analyticsCreateMock).toHaveBeenCalledOnce();
  });

  it("rejects a missing product ID", async () => {
    const response = await POST(makeRequest({}));

    expect(response.status).toBe(400);
    expect(productFindUniqueMock).not.toHaveBeenCalled();
    expect(analyticsCreateMock).not.toHaveBeenCalled();
  });
  it("preserves Search entry separately from Brand Grid placement", async () => {
  const response = await POST(
    makeRequest({
      productId: "product-1",
      discoverySource: "BRAND",
      entrySource: "SEARCH",
      sectionKey: "brand_product_grid",
      searchPosition: 3,
      pageNumber: 1,
      contextType: "BRAND_GRID",
      entrySectionKey: "search_results",
      entryPosition: 5,
      entryPageNumber: 4,
      entryContextType: "SEARCH_RESULTS",
    }),
  );

  expect(response.status).toBe(200);

  expect(analyticsCreateMock).toHaveBeenCalledWith({
    data: expect.objectContaining({
      sessionId: "session-1",
      productId: "product-1",
      position: 3,
      sectionKey: "brand_product_grid",
      pageNumber: 1,
      contextType: "BRAND_GRID",
      metadata: expect.objectContaining({
        discoverySource: "BRAND",
        entrySource: "SEARCH",
        entrySectionKey: "search_results",
        entryPosition: 5,
        entryPageNumber: 4,
        entryContextType: "SEARCH_RESULTS",
      }),
    }),
  });
});
it("does not invent journey attribution when entry is missing", async () => {
  const response = await POST(
    makeRequest({
      productId: "product-1",
      discoverySource: "BRAND",
      sectionKey: "brand_product_grid",
      searchPosition: 3,
      pageNumber: 1,
      contextType: "BRAND_GRID",
    }),
  );

  expect(response.status).toBe(200);

  expect(analyticsCreateMock).toHaveBeenCalledWith({
    data: expect.objectContaining({
      metadata: expect.objectContaining({
        discoverySource: "BRAND",
        entrySource: null,
        entrySectionKey: null,
        entryPosition: null,
        entryPageNumber: null,
        entryContextType: null,
      }),
    }),
  });
});
});
