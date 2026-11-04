import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  brandFindUnique: vi.fn(),
  productFindUnique: vi.fn(),
  productFindMany: vi.fn(),
  categoryFindUnique: vi.fn(),
  transaction: vi.fn(),
  productCreate: vi.fn(),
  productUpdate: vi.fn(),
  productProductTypeCreateMany: vi.fn(),
  productProductTypeDeleteMany: vi.fn(),
  productMaterialDeleteMany: vi.fn(),
  productOccasionDeleteMany: vi.fn(),
  productStyleDeleteMany: vi.fn(),
  productColourDeleteMany: vi.fn(),
  productSizeDeleteMany: vi.fn(),
  productSpecificationCreateMany: vi.fn(),
  productSpecificationDeleteMany: vi.fn(),
  invalidateStorefrontProduct: vi.fn(),
}));

vi.mock("@/lib/auth/AdminSession", () => ({
  requireAdminSession: mocks.requireAdminSession,
}));

vi.mock("@/lib/storefront/invalidate-product", () => ({
  invalidateStorefrontProduct: mocks.invalidateStorefrontProduct,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    brand: { findUnique: mocks.brandFindUnique },
    product: {
      findUnique: mocks.productFindUnique,
      findMany: mocks.productFindMany,
    },
    category: { findUnique: mocks.categoryFindUnique },
    $transaction: mocks.transaction,
  },
}));

import { POST } from "./create/route";
import { PATCH } from "./[id]/route";

const tx = {
  product: { create: mocks.productCreate, update: mocks.productUpdate },
  productProductType: {
    createMany: mocks.productProductTypeCreateMany,
    deleteMany: mocks.productProductTypeDeleteMany,
  },
  productMaterial: { deleteMany: mocks.productMaterialDeleteMany },
  productOccasion: { deleteMany: mocks.productOccasionDeleteMany },
  productStyle: { deleteMany: mocks.productStyleDeleteMany },
  productColour: { deleteMany: mocks.productColourDeleteMany },
  productSize: { deleteMany: mocks.productSizeDeleteMany },
  productSpecification: {
    createMany: mocks.productSpecificationCreateMany,
    deleteMany: mocks.productSpecificationDeleteMany,
  },
};

const baseBody = {
  brandId: "brand-1",
  title: "Test Abaya",
  sourceUrl: "https://example.com/abaya",
  affiliateUrl: "",
  currency: "GBP",
  price: "45.00",
  originalPrice: "",
  productTypes: ["DRESS"],
  images: [],
};

const completeDetails = {
  description: "A flowing abaya",
  colourDescription: "Deep navy",
  careInstructions: "Hand wash only",
  countryOfOrigin: "Türkiye",
  transparency: "Opaque",
  liningStatus: "Fully lined",
};

const specs = [
  { label: "Shell", value: "100% cotton" },
  { label: "Lining", value: "100% viscose" },
];

function request(method: "POST" | "PATCH", body: unknown): Request {
  return new Request(
    method === "POST"
      ? "http://localhost/api/admin/products/create"
      : "http://localhost/api/admin/products/product-1",
    {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

function create(body: unknown) {
  return POST(request("POST", body) as Parameters<typeof POST>[0]);
}

function edit(body: unknown) {
  return PATCH(request("PATCH", body) as Parameters<typeof PATCH>[0], {
    params: Promise.resolve({ id: "product-1" }),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdminSession.mockResolvedValue({ id: "admin-1" });
  mocks.brandFindUnique.mockResolvedValue({ id: "brand-1", name: "Brand" });
  mocks.productFindMany.mockResolvedValue([]);
  mocks.categoryFindUnique.mockResolvedValue({ id: "category-1" });
  mocks.productFindUnique.mockImplementation(async ({ where }: { where: { id?: string } }) =>
    where.id
      ? {
          id: "product-1",
          slug: "test-abaya",
          badges: [],
          brand: { slug: "brand" },
          productSizes: [],
        }
      : null
  );
  mocks.productCreate.mockResolvedValue({
    id: "product-1",
    title: "Test Abaya",
    slug: "test-abaya",
    status: "DRAFT",
    isActive: true,
    publishedAt: null,
  });
  mocks.productUpdate.mockResolvedValue({
    id: "product-1",
    title: "Test Abaya",
    sourceUrl: baseBody.sourceUrl,
    affiliateUrl: null,
    price: "45.00",
    originalPrice: null,
    currency: "GBP",
    badges: [],
    updatedAt: new Date("2026-10-25T12:00:00.000Z"),
  });
  mocks.transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) =>
    callback(tx)
  );
});

describe("Admin product creation — Product Details", () => {
  it("persists all descriptive fields", async () => {
    const response = await create({ ...baseBody, ...completeDetails });
    expect(response.status).toBe(201);
    expect((await response.json()).ok).toBe(true);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.productCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining(completeDetails) })
    );
    expect(mocks.productSpecificationCreateMany).not.toHaveBeenCalled();
  });

  it("persists ordered specifications in the same transaction", async () => {
    const response = await create({ ...baseBody, specifications: specs });
    expect(response.status).toBe(201);
    expect(mocks.productSpecificationCreateMany).toHaveBeenCalledWith({
      data: [
        { productId: "product-1", ...specs[0], sortOrder: 0 },
        { productId: "product-1", ...specs[1], sortOrder: 1 },
      ],
    });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it("supports products without optional details", async () => {
    const response = await create(baseBody);
    expect(response.status).toBe(201);
    expect(mocks.productCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: null,
          colourDescription: null,
          careInstructions: null,
          countryOfOrigin: null,
          transparency: null,
          liningStatus: null,
        }),
      })
    );
    expect(mocks.productSpecificationCreateMany).not.toHaveBeenCalled();
  });

  it("rejects invalid specifications before a transaction", async () => {
    const response = await create({
      ...baseBody,
      specifications: [{ label: "Shell", value: "" }],
    });
    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.productCreate).not.toHaveBeenCalled();
  });

  it("does not report success when specification persistence fails", async () => {
    mocks.productSpecificationCreateMany.mockRejectedValueOnce(new Error("Write failed"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await create({ ...baseBody, specifications: specs });
      expect(response.status).not.toBe(201);
      expect((await response.json()).ok).toBe(false);
      expect(mocks.transaction).toHaveBeenCalledTimes(1);
    } finally {
      errorSpy.mockRestore();
    }
  });
});

describe("Admin product editing — Product Details", () => {
  it("updates all descriptive fields", async () => {
    const response = await edit({ ...baseBody, ...completeDetails });
    expect(response.status).toBe(200);
    expect((await response.json()).ok).toBe(true);
    expect(mocks.productUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining(completeDetails) })
    );
  });

  it("omits unspecified descriptive fields from the update payload", async () => {
    const response = await edit(baseBody);
    expect(response.status).toBe(200);
    const data = mocks.productUpdate.mock.calls[0][0].data as Record<string, unknown>;
    for (const key of Object.keys(completeDetails)) {
      expect(data).not.toHaveProperty(key);
    }
  });

  it("clears explicitly empty descriptive fields", async () => {
    const response = await edit({
      ...baseBody,
      description: "",
      careInstructions: "  ",
    });
    expect(response.status).toBe(200);
    expect(mocks.productUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ description: null, careInstructions: null }),
      })
    );
  });

  it("preserves specifications when omitted", async () => {
    const response = await edit(baseBody);
    expect(response.status).toBe(200);
    expect(mocks.productSpecificationDeleteMany).not.toHaveBeenCalled();
    expect(mocks.productSpecificationCreateMany).not.toHaveBeenCalled();
  });

  it("clears specifications when an empty array is supplied", async () => {
    const response = await edit({ ...baseBody, specifications: [] });
    expect(response.status).toBe(200);
    expect(mocks.productSpecificationDeleteMany).toHaveBeenCalledWith({
      where: { productId: "product-1" },
    });
    expect(mocks.productSpecificationCreateMany).not.toHaveBeenCalled();
  });

  it("replaces specifications in order", async () => {
    const response = await edit({ ...baseBody, specifications: specs });
    expect(response.status).toBe(200);
    expect(mocks.productSpecificationDeleteMany).toHaveBeenCalledWith({
      where: { productId: "product-1" },
    });
    expect(mocks.productSpecificationCreateMany).toHaveBeenCalledWith({
      data: [
        { productId: "product-1", ...specs[0], sortOrder: 0 },
        { productId: "product-1", ...specs[1], sortOrder: 1 },
      ],
    });
    expect(mocks.productSpecificationDeleteMany.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.productSpecificationCreateMany.mock.invocationCallOrder[0]
    );
  });

  it("rejects invalid specifications before a transaction", async () => {
    const response = await edit({
      ...baseBody,
      specifications: [{ label: "Shell", value: "" }],
    });
    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.productUpdate).not.toHaveBeenCalled();
  });

  it("protects existing sizes with Fit measurements", async () => {
    mocks.productFindUnique.mockResolvedValueOnce({
      id: "product-1",
      slug: "test-abaya",
      badges: [],
      brand: { slug: "brand" },
      productSizes: [
        {
          sizeId: "size-1",
          size: { slug: "m" },
          _count: { fitMeasurements: 1 },
          sizeChartMapping: null,
        },
      ],
    });
    const response = await edit({ ...baseBody, sizeIds: [] });
    expect(response.status).toBe(409);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("does not report success or invalidate storefront on specification failure", async () => {
    mocks.productSpecificationCreateMany.mockRejectedValueOnce(new Error("Write failed"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await edit({ ...baseBody, specifications: specs });
      expect(response.status).not.toBe(200);
      expect((await response.json()).ok).toBe(false);
      expect(mocks.invalidateStorefrontProduct).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }
  });
});
