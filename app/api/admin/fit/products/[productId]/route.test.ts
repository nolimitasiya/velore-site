import {
  FabricStretch,
  FitGarmentComponent,
  FitMeasurementBasis,
  FitMeasurementType,
  ProductType,
} from "@prisma/client";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  requireAdminSessionMock,
  productFindUniqueMock,
  transactionMock,
  productFitProfileUpsertMock,
  productFitComponentDeleteManyMock,
  productFitComponentCreateManyMock,
  productFitSizingRequirementDeleteManyMock,
  productFitSizingRequirementCreateManyMock,
  productSizeChartMappingDeleteManyMock,
  productSizeChartMappingCreateManyMock,
  revalidateTagMock,
} = vi.hoisted(() => ({
  requireAdminSessionMock: vi.fn(),
  productFindUniqueMock: vi.fn(),
  transactionMock: vi.fn(),
  productFitProfileUpsertMock: vi.fn(),
  productFitComponentDeleteManyMock: vi.fn(),
  productFitComponentCreateManyMock: vi.fn(),
  productFitSizingRequirementDeleteManyMock: vi.fn(),
  productFitSizingRequirementCreateManyMock: vi.fn(),
  productSizeChartMappingDeleteManyMock: vi.fn(),
  productSizeChartMappingCreateManyMock: vi.fn(),
  revalidateTagMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidateTag: revalidateTagMock,
}));

vi.mock("@/lib/auth/AdminSession", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findUnique: productFindUniqueMock,
    },

    brandSizeChart: {
      findUnique: vi.fn(),
    },

    $transaction: transactionMock,
  },
}));

import { PUT } from "./route";

type SizingRequirementInput = {
  type: FitMeasurementType;
  component: FitGarmentComponent;
};

function makeRequest(
  fitComponents: FitGarmentComponent[],
  sizingRequirements: SizingRequirementInput[] = []
) {
  return new Request(
    "http://localhost/api/admin/fit/products/product-1",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intendedFit: null,
        stretch: FabricStretch.UNKNOWN,
        measurementBasis:
          FitMeasurementBasis.UNKNOWN,
        source: null,
        sourceUrl: "",
        fitNotes: "",
        lastVerifiedAt: null,
        fitComponents,
        sizingRequirements,
        chartId: null,
        mappings: [],
      }),
    }
  );
}

function makeContext() {
  return {
    params: Promise.resolve({
      productId: "product-1",
    }),
  };
}

function mockProduct(productType: ProductType) {
  productFindUniqueMock.mockResolvedValue({
  id: "product-1",
  brandId: "brand-1",
  slug: "flare-bottoms",

  brand: {
    slug: "lyra",
  },

  productType: null,

    productTypes: [
      {
        productType,
      },
    ],

    productSizes: [],
  });
}
function mockMultiTypeProduct(
  productTypes: ProductType[]
) {
  productFindUniqueMock.mockResolvedValue({
    id: "product-1",
brandId: "brand-1",
slug: "flare-bottoms",

brand: {
  slug: "lyra",
},

productType: null,

    productTypes: productTypes.map(
      (productType) => ({
        productType,
      })
    ),

    productSizes: [],
  });
}
describe(
  "PUT /api/admin/fit/products/[productId]",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();

      requireAdminSessionMock.mockResolvedValue(
        undefined
      );

      productFitProfileUpsertMock.mockResolvedValue({
        id: "fit-profile-1",
      });

      transactionMock.mockImplementation(
  async (
    callback: (tx: {
      productFitProfile: {
        upsert:
          typeof productFitProfileUpsertMock;
      };

      productFitComponent: {
        deleteMany:
          typeof productFitComponentDeleteManyMock;
        createMany:
          typeof productFitComponentCreateManyMock;
      };

      productFitSizingRequirement: {
        deleteMany:
          typeof productFitSizingRequirementDeleteManyMock;
        createMany:
          typeof productFitSizingRequirementCreateManyMock;
      };

      productSizeChartMapping: {
        deleteMany:
          typeof productSizeChartMappingDeleteManyMock;
        createMany:
          typeof productSizeChartMappingCreateManyMock;
      };
    }) => unknown
  ) =>
    callback({
  productFitProfile: {
    upsert:
      productFitProfileUpsertMock,
  },

  productFitComponent: {
    deleteMany:
      productFitComponentDeleteManyMock,
    createMany:
      productFitComponentCreateManyMock,
  },

  productFitSizingRequirement: {
    deleteMany:
      productFitSizingRequirementDeleteManyMock,
    createMany:
      productFitSizingRequirementCreateManyMock,
  },

  productSizeChartMapping: {
    deleteMany:
      productSizeChartMappingDeleteManyMock,
    createMany:
      productSizeChartMappingCreateManyMock,
  },
})
      );
    });

    it(
      "accepts and persists TOP + SKIRT for a SETS product",
      async () => {
        mockProduct(ProductType.SETS);

        const response = await PUT(
          makeRequest([
            FitGarmentComponent.TOP,
            FitGarmentComponent.SKIRT,
          ]),
          makeContext()
        );

        expect(response.status).toBe(200);

        expect(
          productFitComponentDeleteManyMock
        ).toHaveBeenCalledWith({
          where: {
            fitProfileId: "fit-profile-1",
          },
        });

        expect(
          productFitComponentCreateManyMock
        ).toHaveBeenCalledWith({
          data: [
            {
              fitProfileId: "fit-profile-1",
              component: FitGarmentComponent.TOP,
            },
            {
              fitProfileId: "fit-profile-1",
              component: FitGarmentComponent.SKIRT,
            },
          ],
        });
      }
    );

    it(
      "accepts and persists TOP + TROUSER for a SETS product",
      async () => {
        mockProduct(ProductType.SETS);

        const response = await PUT(
          makeRequest([
            FitGarmentComponent.TOP,
            FitGarmentComponent.TROUSER,
          ]),
          makeContext()
        );

        expect(response.status).toBe(200);

        expect(
          productFitComponentCreateManyMock
        ).toHaveBeenCalledWith({
          data: [
            {
              fitProfileId: "fit-profile-1",
              component: FitGarmentComponent.TOP,
            },
            {
              fitProfileId: "fit-profile-1",
              component:
                FitGarmentComponent.TROUSER,
            },
          ],
        });
      }
    );

    it(
      "rejects a SETS product with no composition",
      async () => {
        mockProduct(ProductType.SETS);

        const response = await PUT(
          makeRequest([]),
          makeContext()
        );

        expect(response.status).toBe(400);

        await expect(
          response.json()
        ).resolves.toEqual({
          error:
            "SETS products must use a supported composition: Top + Skirt or Top + Trouser.",
        });

        expect(
          transactionMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects an incomplete SETS composition",
      async () => {
        mockProduct(ProductType.SETS);

        const response = await PUT(
          makeRequest([
            FitGarmentComponent.TOP,
          ]),
          makeContext()
        );

        expect(response.status).toBe(400);

        expect(
          transactionMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects an unsupported SETS composition",
      async () => {
        mockProduct(ProductType.SETS);

        const response = await PUT(
          makeRequest([
            FitGarmentComponent.TOP,
            FitGarmentComponent.JACKET,
          ]),
          makeContext()
        );

        expect(response.status).toBe(400);

        expect(
          transactionMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects duplicate SETS components",
      async () => {
        mockProduct(ProductType.SETS);

        const response = await PUT(
          makeRequest([
            FitGarmentComponent.TOP,
            FitGarmentComponent.TOP,
          ]),
          makeContext()
        );

        expect(response.status).toBe(400);

        await expect(
          response.json()
        ).resolves.toEqual({
          error:
            "A Fit component was submitted more than once.",
        });

        expect(
          transactionMock
        ).not.toHaveBeenCalled();
      }
    );

  it(
  "rejects Fit components for a product that is neither SETS nor ACTIVEWEAR",
  async () => {
    mockProduct(ProductType.DRESS);

    const response = await PUT(
      makeRequest([
        FitGarmentComponent.TOP,
        FitGarmentComponent.SKIRT,
      ]),
      makeContext()
    );

    expect(response.status).toBe(400);

    await expect(
      response.json()
    ).resolves.toEqual({
      error:
        "Fit components can only be configured for a SETS or ACTIVEWEAR product.",
    });

    expect(
      transactionMock
    ).not.toHaveBeenCalled();
  }
);

    it(
      "preserves normal Product Fit saving for a non-SETS product",
      async () => {
        mockProduct(ProductType.DRESS);

        const response = await PUT(
          makeRequest([]),
          makeContext()
        );

        expect(response.status).toBe(200);

        expect(
          productFitComponentDeleteManyMock
        ).toHaveBeenCalledWith({
          where: {
            fitProfileId: "fit-profile-1",
          },
        });

        expect(
          productFitComponentCreateManyMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
  "accepts and persists TOP for an ACTIVEWEAR product",
  async () => {
    mockProduct(ProductType.ACTIVEWEAR);

    const response = await PUT(
      makeRequest([
        FitGarmentComponent.TOP,
      ]),
      makeContext()
    );

    expect(response.status).toBe(200);

    expect(
      productFitComponentCreateManyMock
    ).toHaveBeenCalledWith({
      data: [
        {
          fitProfileId: "fit-profile-1",
          component: FitGarmentComponent.TOP,
        },
      ],
    });
  }
);

it(
  "accepts and persists TROUSER for an ACTIVEWEAR product",
  async () => {
    mockProduct(ProductType.ACTIVEWEAR);

    const response = await PUT(
      makeRequest([
        FitGarmentComponent.TROUSER,
      ]),
      makeContext()
    );

    expect(response.status).toBe(200);

    expect(
      productFitComponentCreateManyMock
    ).toHaveBeenCalledWith({
      data: [
        {
          fitProfileId: "fit-profile-1",
          component:
            FitGarmentComponent.TROUSER,
        },
      ],
    });
  }
);

it(
  "accepts and persists TOP + TROUSER for an ACTIVEWEAR product",
  async () => {
    mockProduct(ProductType.ACTIVEWEAR);

    const response = await PUT(
      makeRequest([
        FitGarmentComponent.TOP,
        FitGarmentComponent.TROUSER,
      ]),
      makeContext()
    );

    expect(response.status).toBe(200);

    expect(
      productFitComponentCreateManyMock
    ).toHaveBeenCalledWith({
      data: [
        {
          fitProfileId: "fit-profile-1",
          component: FitGarmentComponent.TOP,
        },
        {
          fitProfileId: "fit-profile-1",
          component:
            FitGarmentComponent.TROUSER,
        },
      ],
    });
  }
);
it(
  "rejects an ACTIVEWEAR product with no composition",
  async () => {
    mockProduct(ProductType.ACTIVEWEAR);

    const response = await PUT(
      makeRequest([]),
      makeContext()
    );

    expect(response.status).toBe(400);

    await expect(
      response.json()
    ).resolves.toEqual({
      error:
        "ACTIVEWEAR products must use a supported composition: Top, Trouser, or Top + Trouser.",
    });

    expect(
      transactionMock
    ).not.toHaveBeenCalled();
  }
);

it(
  "rejects TOP + SKIRT for an ACTIVEWEAR product",
  async () => {
    mockProduct(ProductType.ACTIVEWEAR);

    const response = await PUT(
      makeRequest([
        FitGarmentComponent.TOP,
        FitGarmentComponent.SKIRT,
      ]),
      makeContext()
    );

    expect(response.status).toBe(400);

    await expect(
      response.json()
    ).resolves.toEqual({
      error:
        "ACTIVEWEAR products must use a supported composition: Top, Trouser, or Top + Trouser.",
    });

    expect(
      transactionMock
    ).not.toHaveBeenCalled();
  }
);

it(
  "rejects Fit components when ACTIVEWEAR is part of a multi-type product",
  async () => {
    mockMultiTypeProduct([
      ProductType.ACTIVEWEAR,
      ProductType.TOP,
    ]);

    const response = await PUT(
      makeRequest([
        FitGarmentComponent.TOP,
      ]),
      makeContext()
    );

    expect(response.status).toBe(400);

    await expect(
      response.json()
    ).resolves.toEqual({
      error:
        "Fit components can only be configured for a SETS or ACTIVEWEAR product.",
    });

    expect(
      transactionMock
    ).not.toHaveBeenCalled();
  }
);

it(
  "invalidates storefront product caches after a successful Fit save",
  async () => {
    mockProduct(ProductType.PANTS);

    const response = await PUT(
      makeRequest([]),
      makeContext()
    );

    expect(response.status).toBe(200);

    expect(revalidateTagMock).toHaveBeenCalledTimes(3);

expect(revalidateTagMock).toHaveBeenNthCalledWith(
  1,
  "product:lyra:flare-bottoms",
  "max"
);

expect(revalidateTagMock).toHaveBeenNthCalledWith(
  2,
  "brand:lyra",
  "max"
);

expect(revalidateTagMock).toHaveBeenNthCalledWith(
  3,
  "storefront-products",
  "max"
);
  }
);

it(
  "does not invalidate storefront caches when the Fit save is rejected",
  async () => {
    mockProduct(ProductType.ACTIVEWEAR);

    const response = await PUT(
      makeRequest([]),
      makeContext()
    );

    expect(response.status).toBe(400);

    expect(
      transactionMock
    ).not.toHaveBeenCalled();

    expect(
      revalidateTagMock
    ).not.toHaveBeenCalled();
  }
);
it(
  "accepts and persists explicit sizing requirements for a BLAZER product",
  async () => {
    mockProduct(ProductType.BLAZER);

    const response = await PUT(
      makeRequest([], [
        {
          type: FitMeasurementType.BUST,
          component: FitGarmentComponent.JACKET,
        },
        {
          type: FitMeasurementType.WAIST,
          component: FitGarmentComponent.JACKET,
        },
        {
          type: FitMeasurementType.HIP,
          component: FitGarmentComponent.JACKET,
        },
      ]),
      makeContext()
    );

    expect(response.status).toBe(200);

    expect(
      productFitSizingRequirementDeleteManyMock
    ).toHaveBeenCalledWith({
      where: {
        fitProfileId: "fit-profile-1",
      },
    });

    expect(
      productFitSizingRequirementCreateManyMock
    ).toHaveBeenCalledWith({
      data: [
        {
          fitProfileId: "fit-profile-1",
          type: FitMeasurementType.BUST,
          component: FitGarmentComponent.JACKET,
        },
        {
          fitProfileId: "fit-profile-1",
          type: FitMeasurementType.WAIST,
          component: FitGarmentComponent.JACKET,
        },
        {
          fitProfileId: "fit-profile-1",
          type: FitMeasurementType.HIP,
          component: FitGarmentComponent.JACKET,
        },
      ],
    });
  }
);

it(
  "rejects a sizing requirement that is invalid for the product structure",
  async () => {
    mockProduct(ProductType.BLAZER);

    const response = await PUT(
      makeRequest([], [
        {
          type: FitMeasurementType.INSEAM,
          component: FitGarmentComponent.JACKET,
        },
      ]),
      makeContext()
    );

    expect(response.status).toBe(400);

    await expect(response.json()).resolves.toEqual({
      error:
        "A sizing requirement is not valid for this product type and garment component.",
    });

    expect(
      transactionMock
    ).not.toHaveBeenCalled();
  }
);

it(
  "rejects duplicate sizing requirements",
  async () => {
    mockProduct(ProductType.BLAZER);

    const response = await PUT(
      makeRequest([], [
        {
          type: FitMeasurementType.BUST,
          component: FitGarmentComponent.JACKET,
        },
        {
          type: FitMeasurementType.BUST,
          component: FitGarmentComponent.JACKET,
        },
      ]),
      makeContext()
    );

    expect(response.status).toBe(400);

    await expect(response.json()).resolves.toEqual({
      error:
        "A sizing requirement was submitted more than once.",
    });

    expect(
      transactionMock
    ).not.toHaveBeenCalled();
  }
);

it(
  "accepts an empty sizing requirement list and clears the explicit override",
  async () => {
    mockProduct(ProductType.BLAZER);

    const response = await PUT(
      makeRequest([], []),
      makeContext()
    );

    expect(response.status).toBe(200);

    expect(
      productFitSizingRequirementDeleteManyMock
    ).toHaveBeenCalledWith({
      where: {
        fitProfileId: "fit-profile-1",
      },
    });

    expect(
      productFitSizingRequirementCreateManyMock
    ).not.toHaveBeenCalled();
  }
);

it(
  "rejects explicit sizing requirements for a product that does not support size recommendation",
  async () => {
    mockProduct(ProductType.HIJAB);

    const response = await PUT(
      makeRequest([], [
        {
          type: FitMeasurementType.BUST,
          component: FitGarmentComponent.HIJAB,
        },
      ]),
      makeContext()
    );

    expect(response.status).toBe(400);

    expect(
      transactionMock
    ).not.toHaveBeenCalled();
  }
);



  }
);