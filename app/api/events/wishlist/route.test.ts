import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  checkAnalyticsRateLimitMock,
  productFindUniqueMock,
  analyticsFindFirstMock,
  analyticsCreateMock,
  getSessionMock,
  attachCookieMock,
  normalizeDiscoverySourceMock,
} = vi.hoisted(() => ({
  checkAnalyticsRateLimitMock: vi.fn(),
  productFindUniqueMock: vi.fn(),
  analyticsFindFirstMock: vi.fn(),
  analyticsCreateMock: vi.fn(),
  getSessionMock: vi.fn(),
  attachCookieMock: vi.fn(),
  normalizeDiscoverySourceMock: vi.fn(),
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

vi.mock("@/lib/analytics/discoverySource", () => ({
  normalizeDiscoverySource: normalizeDiscoverySourceMock,
}));

import { NextRequest } from "next/server";
import {
  AnalyticsEventType,
  AnalyticsSourcePage,
} from "@prisma/client";
import { POST } from "./route";

function makeRequest(
  body: unknown = {
    productId: "product-1",
    action: "ADD",
  },
  userAgent = "Mozilla/5.0",
) {
  return new NextRequest(
    "https://example.com/api/events/wishlist",
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

describe("POST /api/events/wishlist", () => {
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

    normalizeDiscoverySourceMock.mockReturnValue("HOME");
  });

  it("returns 429 before querying products when rate-limited", async () => {
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

    expect(checkAnalyticsRateLimitMock).toHaveBeenCalledWith(
      expect.any(NextRequest),
      "wishlist",
    );

    expect(productFindUniqueMock).not.toHaveBeenCalled();
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(analyticsCreateMock).not.toHaveBeenCalled();
  });

  it("records WISHLIST_ADD for an eligible product", async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      duplicate: false,
    });

    expect(analyticsCreateMock).toHaveBeenCalledOnce();

    expect(analyticsCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sessionId: "session-1",
        productId: "product-1",
        brandId: "brand-1",
        eventType: AnalyticsEventType.WISHLIST_ADD,
      }),
    });

    expect(attachCookieMock).toHaveBeenCalledOnce();
  });

  it("records WISHLIST_REMOVE separately from ADD", async () => {
    const response = await POST(
      makeRequest({
        productId: "product-1",
        action: "REMOVE",
      }),
    );

    expect(response.status).toBe(200);

    expect(analyticsFindFirstMock).toHaveBeenCalledWith({
      where: {
        sessionId: "session-1",
        eventType: AnalyticsEventType.WISHLIST_REMOVE,
        productId: "product-1",
        createdAt: {
          gte: expect.any(Date),
        },
      },
      select: {
        id: true,
      },
    });

    expect(analyticsCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: AnalyticsEventType.WISHLIST_REMOVE,
      }),
    });
  });

  it("does not create a duplicate wishlist action", async () => {
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

  it("preserves discovery attribution and action source", async () => {
    normalizeDiscoverySourceMock.mockReturnValue("SEARCH");

    const response = await POST(
      makeRequest({
        productId: "product-1",
        action: "ADD",
        discoverySource: "search",
        actionSourcePage: "search",
        sourcePath: "/search?q=abaya",
        searchQuery: "abaya",
        searchPosition: 2.9,
        sectionKey: "search-results",
        pageNumber: 3,
        contextType: "GRID",
        entrySectionKey: "featured",
        entryPosition: 4,
        entryPageNumber: 1,
        entryContextType: "CAROUSEL",
      }),
    );

    expect(response.status).toBe(200);

    expect(normalizeDiscoverySourceMock).toHaveBeenCalledWith(
      "search",
    );

    expect(analyticsCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourcePage: AnalyticsSourcePage.SEARCH,
        sourcePath: "/search?q=abaya",
        position: 2,
        sectionKey: "search-results",
        pageNumber: 3,
        contextType: "GRID",
        metadata: {
          discoverySource: "SEARCH",
          searchQuery: "abaya",
          searchPosition: 2,
          sectionKey: "search-results",
          pageNumber: 3,
          contextType: "GRID",
          entrySectionKey: "featured",
          entryPosition: 4,
          entryPageNumber: 1,
          entryContextType: "CAROUSEL",
        },
      }),
    });
  });

  it("rejects a missing product ID", async () => {
    const response = await POST(
      makeRequest({ action: "ADD" }),
    );

    expect(response.status).toBe(400);
    expect(productFindUniqueMock).not.toHaveBeenCalled();
    expect(analyticsCreateMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid wishlist action", async () => {
    const response = await POST(
      makeRequest({
        productId: "product-1",
        action: "SAVE",
      }),
    );

    expect(response.status).toBe(400);
    expect(productFindUniqueMock).not.toHaveBeenCalled();
    expect(analyticsCreateMock).not.toHaveBeenCalled();
  });

  it("rejects unavailable products", async () => {
    productFindUniqueMock.mockResolvedValue(null);

    const response = await POST(makeRequest());

    expect(response.status).toBe(404);
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(analyticsCreateMock).not.toHaveBeenCalled();
  });

  it("rejects unpublished products", async () => {
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
      makeRequest(
        { productId: "product-1", action: "ADD" },
        "Googlebot",
      ),
    );

    expect(response.status).toBe(403);
    expect(checkAnalyticsRateLimitMock).not.toHaveBeenCalled();
    expect(analyticsCreateMock).not.toHaveBeenCalled();
  });

  it("continues tracking when IP enforcement is unavailable", async () => {
    checkAnalyticsRateLimitMock.mockResolvedValue({
      status: "NOT_ENFORCED",
      reason: "CLIENT_IP_NOT_TRUSTED",
    });

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(analyticsCreateMock).toHaveBeenCalledOnce();
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