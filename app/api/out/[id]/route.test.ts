import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  productFindUniqueMock,
  affiliateClickCreateMock,
  analyticsEventCreateMock,
  getSessionMock,
  attachCookieMock,
  isSyntheticInternalMock,
} = vi.hoisted(() => ({
  productFindUniqueMock: vi.fn(),
  affiliateClickCreateMock: vi.fn(),
  analyticsEventCreateMock: vi.fn(),
  getSessionMock: vi.fn(),
  attachCookieMock: vi.fn(),
  isSyntheticInternalMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findUnique: productFindUniqueMock,
    },
    affiliateClick: {
      create: affiliateClickCreateMock,
    },
    analyticsEvent: {
      create: analyticsEventCreateMock,
    },
  },
}));

vi.mock("@/lib/analytics/session", () => ({
  getOrCreateAnalyticsSession: getSessionMock,
  attachAnalyticsSessionCookie: attachCookieMock,
}));

vi.mock("@/lib/platform-health/internalRequest", () => ({
  isSyntheticInternalRequest: isSyntheticInternalMock,
}));

import { NextRequest } from "next/server";
import { POST } from "./route";

function makeRequest() {
  return new NextRequest(
    "https://example.com/api/out/product-1?src=PRODUCT",
    {
      method: "POST",
      headers: {
        "user-agent": "Mozilla/5.0",
      },
    },
  );
}

const ctx = {
  params: Promise.resolve({
    id: "product-1",
  }),
};

describe("POST /api/out/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    productFindUniqueMock.mockResolvedValue({
      id: "product-1",
      brandId: "brand-1",
      sourceUrl: "https://brand.example/product",
      affiliateUrl: "https://brand.example/product?ref=veilora",
      brand: {
        name: "Example Brand",
        affiliateStatus: "ACTIVE",
        affiliateBaseUrl: null,
      },
    });

    getSessionMock.mockResolvedValue({
      sessionId: "session-1",
      shopperCountryCode: "GB",
      shopperCurrencyCode: "GBP",
    });

    isSyntheticInternalMock.mockReturnValue(false);

    affiliateClickCreateMock.mockResolvedValue({
      id: "click-1",
    });

    analyticsEventCreateMock.mockResolvedValue({
      id: "event-1",
    });
  });

  it("returns a valid shopping destination when analytics succeeds", async () => {
    const response = await POST(makeRequest(), ctx);

    expect(response.status).toBe(200);

    expect(await response.json()).toEqual({
      destinationUrl:
        "https://brand.example/product?ref=veilora",
      brandName: "Example Brand",
    });

    expect(affiliateClickCreateMock).toHaveBeenCalledOnce();
    expect(analyticsEventCreateMock).toHaveBeenCalledOnce();
    expect(attachCookieMock).toHaveBeenCalledOnce();
  });

  it("still returns the destination when session creation is rate-limited", async () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const error = new Error("Analytics session creation rate limit exceeded");
      error.name = "AnalyticsSessionCreationBlockedError";
      Object.assign(error, {
        code: "ANALYTICS_SESSION_CREATION_BLOCKED",
      });

      getSessionMock.mockRejectedValue(error);

      const response = await POST(makeRequest(), ctx);

      expect(response.status).toBe(200);

      expect(await response.json()).toEqual({
        destinationUrl:
          "https://brand.example/product?ref=veilora",
        brandName: "Example Brand",
      });

      expect(affiliateClickCreateMock).toHaveBeenCalledOnce();
      expect(attachCookieMock).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });
  it("still returns the destination when session initialization fails", async () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      getSessionMock.mockRejectedValue(
        new Error("Simulated analytics session failure"),
      );

      const response = await POST(makeRequest(), ctx);

      expect(response.status).toBe(200);

      expect(await response.json()).toEqual({
        destinationUrl:
          "https://brand.example/product?ref=veilora",
        brandName: "Example Brand",
      });

      expect(affiliateClickCreateMock).toHaveBeenCalledOnce();
      expect(analyticsEventCreateMock).not.toHaveBeenCalled();
      expect(attachCookieMock).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("still returns the destination when affiliate-click recording fails", async () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      affiliateClickCreateMock.mockRejectedValue(
        new Error("Simulated affiliate click failure"),
      );

      const response = await POST(makeRequest(), ctx);

      expect(response.status).toBe(200);

      expect(await response.json()).toEqual({
        destinationUrl:
          "https://brand.example/product?ref=veilora",
        brandName: "Example Brand",
      });
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("rejects unavailable products", async () => {
    productFindUniqueMock.mockResolvedValue(null);

    const response = await POST(makeRequest(), ctx);

    expect(response.status).toBe(404);

    expect(getSessionMock).not.toHaveBeenCalled();
    expect(affiliateClickCreateMock).not.toHaveBeenCalled();
  });

  it("skips analytics writes for synthetic internal requests", async () => {
    isSyntheticInternalMock.mockReturnValue(true);

    const response = await POST(makeRequest(), ctx);

    expect(response.status).toBe(200);

    expect(await response.json()).toEqual({
      destinationUrl:
        "https://brand.example/product?ref=veilora",
      brandName: "Example Brand",
    });

    expect(getSessionMock).not.toHaveBeenCalled();
    expect(affiliateClickCreateMock).not.toHaveBeenCalled();
    expect(analyticsEventCreateMock).not.toHaveBeenCalled();
    expect(attachCookieMock).not.toHaveBeenCalled();
  });
  it("records direct Shop clicks with their discovery placement", async () => {
  const request = new NextRequest(
    "https://example.com/api/out/product-1" +
      "?src=HOME" +
      "&skey=shop_trendy" +
      "&pos=2" +
      "&page=1" +
      "&ctx=SHOP_TRENDY" +
      "&origin=PRODUCT_CARD",
    {
      method: "POST",
      headers: {
        "user-agent": "Mozilla/5.0",
      },
    },
  );

  const response = await POST(request, ctx);

  expect(response.status).toBe(200);

  expect(analyticsEventCreateMock).toHaveBeenCalledWith({
    data: expect.objectContaining({
      position: 2,
      sectionKey: "shop_trendy",
      pageNumber: 1,
      contextType: "SHOP_TRENDY",
      metadata: expect.objectContaining({
        clickOrigin: "PRODUCT_CARD",
        discoverySource: "HOME",
        sectionKey: "shop_trendy",
        pageNumber: 1,
        contextType: "SHOP_TRENDY",
      }),
    }),
  });

  expect(affiliateClickCreateMock).toHaveBeenCalledOnce();
});

it("records PDP Shop clicks while preserving the discovery placement", async () => {
  const request = new NextRequest(
    "https://example.com/api/out/product-1" +
      "?src=HOME" +
      "&skey=shop_trendy" +
      "&pos=2" +
      "&page=1" +
      "&ctx=SHOP_TRENDY" +
      "&origin=PRODUCT_DETAIL",
    {
      method: "POST",
      headers: {
        "user-agent": "Mozilla/5.0",
      },
    },
  );

  const response = await POST(request, ctx);

  expect(response.status).toBe(200);

  expect(analyticsEventCreateMock).toHaveBeenCalledWith({
    data: expect.objectContaining({
      position: 2,
      sectionKey: "shop_trendy",
      pageNumber: 1,
      contextType: "SHOP_TRENDY",
      metadata: expect.objectContaining({
        clickOrigin: "PRODUCT_DETAIL",
        discoverySource: "HOME",
        sectionKey: "shop_trendy",
        pageNumber: 1,
        contextType: "SHOP_TRENDY",
      }),
    }),
  });

  expect(affiliateClickCreateMock).toHaveBeenCalledOnce();
});

it("records missing click origins as unknown", async () => {
  const response = await POST(makeRequest(), ctx);

  expect(response.status).toBe(200);

  expect(analyticsEventCreateMock).toHaveBeenCalledWith({
    data: expect.objectContaining({
      metadata: expect.objectContaining({
        clickOrigin: null,
      }),
    }),
  });
});

it("does not accept an unrecognised click origin", async () => {
  const request = new NextRequest(
    "https://example.com/api/out/product-1" +
      "?src=HOME" +
      "&origin=INVALID_ORIGIN",
    {
      method: "POST",
      headers: {
        "user-agent": "Mozilla/5.0",
      },
    },
  );

  const response = await POST(request, ctx);

  expect(response.status).toBe(200);

  expect(analyticsEventCreateMock).toHaveBeenCalledWith({
    data: expect.objectContaining({
      metadata: expect.objectContaining({
        clickOrigin: null,
      }),
    }),
  });
});
it("credits Brand Grid while preserving Search entry for PDP Shop clicks", async () => {
  const request = new NextRequest(
    "https://example.com/api/out/product-1" +
      "?src=BRAND" +
      "&skey=brand_product_grid" +
      "&pos=3" +
      "&page=1" +
      "&ctx=BRAND_GRID" +
      "&origin=PRODUCT_DETAIL" +
      "&entry_src=SEARCH" +
      "&entry_skey=search_results" +
      "&entry_pos=5" +
      "&entry_page=4" +
      "&entry_ctx=SEARCH_RESULTS",
    {
      method: "POST",
      headers: {
        "user-agent": "Mozilla/5.0",
      },
    },
  );

  const response = await POST(request, ctx);

  expect(response.status).toBe(200);

  expect(analyticsEventCreateMock).toHaveBeenCalledWith({
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
        clickOrigin: "PRODUCT_DETAIL",
        entrySectionKey: "search_results",
        entryPosition: 5,
        entryPageNumber: 4,
        entryContextType: "SEARCH_RESULTS",
      }),
    }),
  });

  expect(affiliateClickCreateMock).toHaveBeenCalledOnce();
});
it("preserves Brand Grid credit for direct Shop clicks without inventing an entry", async () => {
  const request = new NextRequest(
    "https://example.com/api/out/product-1" +
      "?src=BRAND" +
      "&skey=brand_product_grid" +
      "&pos=3" +
      "&page=1" +
      "&ctx=BRAND_GRID" +
      "&origin=PRODUCT_CARD",
    {
      method: "POST",
      headers: {
        "user-agent": "Mozilla/5.0",
      },
    },
  );

  const response = await POST(request, ctx);

  expect(response.status).toBe(200);

  expect(analyticsEventCreateMock).toHaveBeenCalledWith({
    data: expect.objectContaining({
      position: 3,
      sectionKey: "brand_product_grid",
      pageNumber: 1,
      contextType: "BRAND_GRID",
      metadata: expect.objectContaining({
        discoverySource: "BRAND",
        entrySource: null,
        clickOrigin: "PRODUCT_CARD",
      }),
    }),
  });
});
});
