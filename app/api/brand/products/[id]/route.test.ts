import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireBrandContextMock, findProductMock } = vi.hoisted(() => ({
  requireBrandContextMock: vi.fn(),
  findProductMock: vi.fn(),
}));

vi.mock("@/lib/auth/BrandSession", () => ({
  requireBrandContext: requireBrandContextMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findFirst: findProductMock,
    },
  },
}));

import { GET } from "./route";

const BRAND_A = "brand-a";
const PRODUCT_B = "product-owned-by-brand-b";

function requestProduct(id: string) {
  return GET(
    {} as Parameters<typeof GET>[0],
    { params: Promise.resolve({ id }) },
  );
}

describe("brand product ownership isolation", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    requireBrandContextMock.mockResolvedValue({
      userId: "user-a",
      brandId: BRAND_A,
    });
  });

  it("scopes product lookups to the authenticated brand", async () => {
    findProductMock.mockResolvedValue({
      id: "product-a",
      title: "Brand A Product",
    });

    const response = await requestProduct("product-a");

    expect(response.status).toBe(200);

    expect(findProductMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "product-a",
          brandId: BRAND_A,
        },
      }),
    );
  });

  it("returns 404 when a product is outside the authorised brand", async () => {
    findProductMock.mockResolvedValue(null);

    const response = await requestProduct(PRODUCT_B);

    expect(response.status).toBe(404);

    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Not found",
    });

    expect(findProductMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: PRODUCT_B,
          brandId: BRAND_A,
        },
      }),
    );
  });

  it("returns 401 without an authenticated brand session", async () => {
    requireBrandContextMock.mockRejectedValue(
      new Error("UNAUTHENTICATED"),
    );

    const response = await requestProduct("product-a");

    expect(response.status).toBe(401);
    expect(findProductMock).not.toHaveBeenCalled();
  });

  it("returns 403 without membership in the selected brand", async () => {
    requireBrandContextMock.mockRejectedValue(
      new Error("FORBIDDEN"),
    );

    const response = await requestProduct("product-a");

    expect(response.status).toBe(403);
    expect(findProductMock).not.toHaveBeenCalled();
  });
});