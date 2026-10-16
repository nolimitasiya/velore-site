import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireBrandContextMock,
  findProductMock,
  findEventsMock,
  countWishlistMock,
} = vi.hoisted(() => ({
  requireBrandContextMock: vi.fn(),
  findProductMock: vi.fn(),
  findEventsMock: vi.fn(),
  countWishlistMock: vi.fn(),
}));

vi.mock("@/lib/auth/BrandSession", () => ({
  requireBrandContext: requireBrandContextMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findFirst: findProductMock,
    },
    analyticsEvent: {
      findMany: findEventsMock,
    },
    wishlistItem: {
      count: countWishlistMock,
    },
  },
}));

import { GET } from "./route";

const BRAND_A = "brand-a";
const PRODUCT_B = "product-owned-by-brand-b";

function requestAnalytics(id: string) {
  return GET(
    new Request(
      `http://localhost:3000/api/brand/analytics/products/${id}?range=30d`,
    ),
    {
      params: Promise.resolve({ id }),
    },
  );
}

describe("brand product analytics isolation", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    requireBrandContextMock.mockResolvedValue({
      userId: "user-a",
      brandId: BRAND_A,
    });

    findProductMock.mockResolvedValue(null);
  });

  it("returns 401 when the user is unauthenticated", async () => {
    requireBrandContextMock.mockRejectedValue(
      new Error("UNAUTHENTICATED"),
    );

    const response = await requestAnalytics("product-a");

    expect(response.status).toBe(401);

    expect(findProductMock).not.toHaveBeenCalled();
    expect(findEventsMock).not.toHaveBeenCalled();
    expect(countWishlistMock).not.toHaveBeenCalled();
  });

  it("returns 403 when the user lacks brand membership", async () => {
    requireBrandContextMock.mockRejectedValue(
      new Error("FORBIDDEN"),
    );

    const response = await requestAnalytics("product-a");

    expect(response.status).toBe(403);

    expect(findProductMock).not.toHaveBeenCalled();
    expect(findEventsMock).not.toHaveBeenCalled();
    expect(countWishlistMock).not.toHaveBeenCalled();
  });

  it("returns 404 for a product owned by another brand", async () => {
    const response = await requestAnalytics(PRODUCT_B);

    expect(response.status).toBe(404);

    expect(findProductMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: PRODUCT_B,
          brandId: BRAND_A,
        },
      }),
    );

    expect(findEventsMock).not.toHaveBeenCalled();
    expect(countWishlistMock).not.toHaveBeenCalled();
  });

  it("uses the authenticated brand for product ownership checks", async () => {
    await requestAnalytics("product-a");

    expect(findProductMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "product-a",
          brandId: BRAND_A,
        },
      }),
    );
  });
});