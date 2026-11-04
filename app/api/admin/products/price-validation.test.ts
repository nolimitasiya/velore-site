import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdminSessionMock,
  brandFindUniqueMock,
  productFindUniqueMock,
  productFindManyMock,
  productCreateMock,
  productUpdateMock,
  categoryFindUniqueMock,
} = vi.hoisted(() => ({
  requireAdminSessionMock: vi.fn(),
  brandFindUniqueMock: vi.fn(),
  productFindUniqueMock: vi.fn(),
  productFindManyMock: vi.fn(),
  productCreateMock: vi.fn(),
  productUpdateMock: vi.fn(),
  categoryFindUniqueMock: vi.fn(),
}));

vi.mock("@/lib/auth/AdminSession", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    brand: {
      findUnique: brandFindUniqueMock,
    },
    product: {
      findUnique: productFindUniqueMock,
      findMany: productFindManyMock,
      create: productCreateMock,
      update: productUpdateMock,
    },
    category: {
      findUnique: categoryFindUniqueMock,
    },
  },
}));

vi.mock("@/lib/storefront/invalidate-product", () => ({
  invalidateStorefrontProduct: vi.fn(),
}));

import { POST } from "./create/route";
import { PATCH } from "./[id]/route";

const validBody = {
  brandId: "test-brand-id",
  title: "Test Product",
  sourceUrl: "https://example.com/product",
  affiliateUrl: "",
  currency: "GBP",
  price: "25.75",
  originalPrice: "",
  productTypes: ["DRESS"],
  images: [],
};

function createRequest(body: unknown) {
  return new Request(
    "http://localhost/api/admin/products/create",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
}

function editRequest(body: unknown) {
  return new Request(
    "http://localhost/api/admin/products/test-product-id",
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
}

async function runCreate(body: unknown) {
  return POST(createRequest(body) as Parameters<typeof POST>[0]);
}

async function runEdit(body: unknown) {
  return PATCH(
    editRequest(body) as Parameters<typeof PATCH>[0],
    {
      params: Promise.resolve({
        id: "test-product-id",
      }),
    }
  );
}

describe.each([
  ["create", runCreate],
  ["edit", runEdit],
])("Admin product %s price validation", (_name, runRoute) => {
  beforeEach(() => {
    vi.clearAllMocks();

    requireAdminSessionMock.mockResolvedValue({
      id: "test-admin-id",
    });

    // Deliberately stop valid requests before any product write.
    brandFindUniqueMock.mockResolvedValue(null);
    productFindUniqueMock.mockResolvedValue(null);
    productFindManyMock.mockResolvedValue([]);
    categoryFindUniqueMock.mockResolvedValue(null);
  });

  it("rejects prices with more than two decimal places", async () => {
    const response = await runRoute({
      ...validBody,
      price: "25.755",
    });

    expect(response.status).toBe(400);

    expect(await response.json()).toEqual({
      ok: false,
      error: "Price cannot have more than two decimal places.",
    });

    expect(productCreateMock).not.toHaveBeenCalled();
    expect(productUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects original prices with more than two decimal places", async () => {
    const response = await runRoute({
      ...validBody,
      originalPrice: "35.755",
    });

    expect(response.status).toBe(400);

    expect(await response.json()).toEqual({
      ok: false,
      error:
        "Original price cannot have more than two decimal places.",
    });

    expect(productCreateMock).not.toHaveBeenCalled();
    expect(productUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects negative current prices", async () => {
    const response = await runRoute({
      ...validBody,
      price: "-25.75",
    });

    expect(response.status).toBe(400);

    expect(await response.json()).toEqual({
      ok: false,
      error: "Price cannot be negative.",
    });

    expect(productCreateMock).not.toHaveBeenCalled();
    expect(productUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects negative original prices", async () => {
    const response = await runRoute({
      ...validBody,
      originalPrice: "-35.75",
    });

    expect(response.status).toBe(400);

    expect(await response.json()).toEqual({
      ok: false,
      error: "Original price cannot be negative.",
    });

    expect(productCreateMock).not.toHaveBeenCalled();
    expect(productUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects unsupported currencies", async () => {
    const response = await runRoute({
      ...validBody,
      currency: "XYZ",
    });

    expect(response.status).toBe(400);

    expect(await response.json()).toEqual({
      ok: false,
      error: "Unsupported currency.",
    });

    expect(productCreateMock).not.toHaveBeenCalled();
    expect(productUpdateMock).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests", async () => {
    requireAdminSessionMock.mockRejectedValue(
      new Error("UNAUTHENTICATED")
    );

    const response = await runRoute(validBody);

    expect(response.status).toBe(401);

    expect(productCreateMock).not.toHaveBeenCalled();
    expect(productUpdateMock).not.toHaveBeenCalled();
  });

  it("allows valid two-decimal prices past price validation", async () => {
    const response = await runRoute({
      ...validBody,
      price: "25.75",
      originalPrice: "35.75",
    });

    const result = await response.json();

    expect(result.error).not.toMatch(
      /decimal places|negative|original price must/i
    );

    expect(productCreateMock).not.toHaveBeenCalled();
    expect(productUpdateMock).not.toHaveBeenCalled();
  });

  it("allows trailing zeroes without rejecting precision", async () => {
    const response = await runRoute({
      ...validBody,
      price: "25.750",
      originalPrice: "35.750",
    });

    const result = await response.json();

    expect(result.error).not.toMatch(
      /decimal places|negative|original price must/i
    );

    expect(productCreateMock).not.toHaveBeenCalled();
    expect(productUpdateMock).not.toHaveBeenCalled();
  });
});