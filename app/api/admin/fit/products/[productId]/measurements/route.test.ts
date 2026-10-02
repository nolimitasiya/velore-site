import {
  FitGarmentComponent,
  FitMeasurementBasis,
  FitMeasurementType,
  FitUnit,
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
  productFitMeasurementDeleteManyMock,
  productFitMeasurementCreateManyMock,
  productSizeFitMeasurementDeleteManyMock,
  productSizeFitMeasurementCreateManyMock,
} = vi.hoisted(() => ({
  requireAdminSessionMock: vi.fn(),
  productFindUniqueMock: vi.fn(),
  transactionMock: vi.fn(),

  productFitMeasurementDeleteManyMock:
    vi.fn(),

  productFitMeasurementCreateManyMock:
    vi.fn(),

  productSizeFitMeasurementDeleteManyMock:
    vi.fn(),

  productSizeFitMeasurementCreateManyMock:
    vi.fn(),
}));

vi.mock("@/lib/auth/AdminSession", () => ({
  requireAdminSession:
    requireAdminSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findUnique: productFindUniqueMock,
    },

    $transaction: transactionMock,
  },
}));

import { PUT } from "./route";

function makeRequest(body: unknown) {
  return new Request(
    "http://localhost/api/admin/fit/products/product-1/measurements",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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

function mockProduct({
  productType,
  measurementBasis =
    FitMeasurementBasis.GARMENT,
}: {
  productType: ProductType;
  measurementBasis?: FitMeasurementBasis;
}) {
  productFindUniqueMock.mockResolvedValue({
    id: "product-1",

    productType: null,

    productTypes: [
      {
        productType,
      },
    ],

    fitProfile: {
      id: "fit-profile-1",
      measurementBasis,
    },

    productSizes: [],
  });
}

describe(
  "PUT /api/admin/fit/products/[productId]/measurements",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();

      requireAdminSessionMock.mockResolvedValue(
        undefined
      );

      transactionMock.mockImplementation(
        async (
          callback: (tx: {
            productFitMeasurement: {
              deleteMany:
                typeof productFitMeasurementDeleteManyMock;
              createMany:
                typeof productFitMeasurementCreateManyMock;
            };

            productSizeFitMeasurement: {
              deleteMany:
                typeof productSizeFitMeasurementDeleteManyMock;
              createMany:
                typeof productSizeFitMeasurementCreateManyMock;
            };
          }) => unknown
        ) =>
          callback({
            productFitMeasurement: {
              deleteMany:
                productFitMeasurementDeleteManyMock,
              createMany:
                productFitMeasurementCreateManyMock,
            },

            productSizeFitMeasurement: {
              deleteMany:
                productSizeFitMeasurementDeleteManyMock,
              createMany:
                productSizeFitMeasurementCreateManyMock,
            },
          })
      );
    });

    it(
      "accepts One Size Hijab garment dimensions",
      async () => {
        mockProduct({
          productType: ProductType.HIJAB,
        });

        const response = await PUT(
          makeRequest({
            productMeasurements: [
              {
                type:
                  FitMeasurementType.GARMENT_LENGTH,
                component:
                  FitGarmentComponent.HIJAB,
                sourceUnit: FitUnit.CM,
                sourceMinValue: "180",
                sourceMaxValue: "",
              },
              {
                type: FitMeasurementType.WIDTH,
                component:
                  FitGarmentComponent.HIJAB,
                sourceUnit: FitUnit.CM,
                sourceMinValue: "70",
                sourceMaxValue: "",
              },
            ],

            sizeMeasurements: [],
          }),
          makeContext()
        );

        expect(response.status).toBe(200);

        await expect(
          response.json()
        ).resolves.toEqual({
          ok: true,
          productMeasurementCount: 2,
          sizeMeasurementCount: 0,
        });

        expect(
          productFitMeasurementCreateManyMock
        ).toHaveBeenCalledTimes(1);

        expect(
          productSizeFitMeasurementCreateManyMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
  "rejects One Size Hijab dimensions when the profile basis is BODY",
  async () => {
    mockProduct({
      productType: ProductType.HIJAB,
      measurementBasis:
        FitMeasurementBasis.BODY,
    });

    const response = await PUT(
      makeRequest({
        productMeasurements: [],
        sizeMeasurements: [],
      }),
      makeContext()
    );

    expect(response.status).toBe(400);

    await expect(
      response.json()
    ).resolves.toEqual({
      error:
        "One Size Hijab and Khimar dimensions require a Garment measurement basis.",
    });

    expect(
      transactionMock
    ).not.toHaveBeenCalled();
  }
);

it(
  "rejects size-specific measurements for One Size Hijab",
  async () => {
    mockProduct({
      productType: ProductType.HIJAB,
    });

    const response = await PUT(
      makeRequest({
        productMeasurements: [],
        sizeMeasurements: [
          {
            sizeId: "fake-size",
            type:
              FitMeasurementType.GARMENT_LENGTH,
            component:
              FitGarmentComponent.HIJAB,
            measurementBasis:
              FitMeasurementBasis.GARMENT,
            sourceUnit: FitUnit.CM,
            sourceMinValue: "180",
            sourceMaxValue: "",
          },
        ],
      }),
      makeContext()
    );

    expect(response.status).toBe(400);

    await expect(
      response.json()
    ).resolves.toEqual({
      error:
        "One Size Hijab and Khimar products cannot have size-specific Fit measurements.",
    });

    expect(
      transactionMock
    ).not.toHaveBeenCalled();
  }
);

it(
  "rejects the wrong garment component for One Size Hijab",
  async () => {
    mockProduct({
      productType: ProductType.HIJAB,
    });

    const response = await PUT(
      makeRequest({
        productMeasurements: [
          {
            type:
              FitMeasurementType.GARMENT_LENGTH,
            component:
              FitGarmentComponent.DRESS,
            sourceUnit: FitUnit.CM,
            sourceMinValue: "180",
            sourceMaxValue: "",
          },
        ],
        sizeMeasurements: [],
      }),
      makeContext()
    );

    expect(response.status).toBe(400);

    expect(
      transactionMock
    ).not.toHaveBeenCalled();
  }
);

it(
  "rejects unsupported measurement types for One Size Hijab",
  async () => {
    mockProduct({
      productType: ProductType.HIJAB,
    });

    const response = await PUT(
      makeRequest({
        productMeasurements: [
          {
            type: FitMeasurementType.BUST,
            component:
              FitGarmentComponent.HIJAB,
            sourceUnit: FitUnit.CM,
            sourceMinValue: "90",
            sourceMaxValue: "",
          },
        ],
        sizeMeasurements: [],
      }),
      makeContext()
    );

    expect(response.status).toBe(400);

    expect(
      transactionMock
    ).not.toHaveBeenCalled();
  }
);

it(
  "rejects zero-valued One Size dimensions",
  async () => {
    mockProduct({
      productType: ProductType.HIJAB,
    });

    const response = await PUT(
      makeRequest({
        productMeasurements: [
          {
            type: FitMeasurementType.WIDTH,
            component:
              FitGarmentComponent.HIJAB,
            sourceUnit: FitUnit.CM,
            sourceMinValue: "0",
            sourceMaxValue: "",
          },
        ],
        sizeMeasurements: [],
      }),
      makeContext()
    );

    expect(response.status).toBe(400);

    await expect(
      response.json()
    ).resolves.toEqual({
      error:
        "One Size product dimensions must be greater than zero.",
    });

    expect(
      transactionMock
    ).not.toHaveBeenCalled();
  }
);

it(
  "rejects a One Size range whose maximum is below its minimum",
  async () => {
    mockProduct({
      productType: ProductType.HIJAB,
    });

    const response = await PUT(
      makeRequest({
        productMeasurements: [
          {
            type: FitMeasurementType.WIDTH,
            component:
              FitGarmentComponent.HIJAB,
            sourceUnit: FitUnit.CM,
            sourceMinValue: "70",
            sourceMaxValue: "60",
          },
        ],
        sizeMeasurements: [],
      }),
      makeContext()
    );

    expect(response.status).toBe(400);

    await expect(
      response.json()
    ).resolves.toEqual({
      error:
        "A product-level range maximum cannot be lower than its value.",
    });

    expect(
      transactionMock
    ).not.toHaveBeenCalled();
  }
);

it(
  "accepts directional One Size Khimar dimensions",
  async () => {
    mockProduct({
      productType: ProductType.KHIMAR,
    });

    const response = await PUT(
      makeRequest({
        productMeasurements: [
          {
            type:
              FitMeasurementType.FRONT_LENGTH,
            component:
              FitGarmentComponent.KHIMAR,
            sourceUnit: FitUnit.CM,
            sourceMinValue: "90",
            sourceMaxValue: "",
          },
          {
            type:
              FitMeasurementType.BACK_LENGTH,
            component:
              FitGarmentComponent.KHIMAR,
            sourceUnit: FitUnit.CM,
            sourceMinValue: "120",
            sourceMaxValue: "",
          },
          {
            type: FitMeasurementType.WIDTH,
            component:
              FitGarmentComponent.KHIMAR,
            sourceUnit: FitUnit.CM,
            sourceMinValue: "100",
            sourceMaxValue: "",
          },
        ],
        sizeMeasurements: [],
      }),
      makeContext()
    );

    expect(response.status).toBe(200);

    await expect(
      response.json()
    ).resolves.toEqual({
      ok: true,
      productMeasurementCount: 3,
      sizeMeasurementCount: 0,
    });

    expect(
      productFitMeasurementCreateManyMock
    ).toHaveBeenCalledTimes(1);

    expect(
      productSizeFitMeasurementCreateManyMock
    ).not.toHaveBeenCalled();
  }
);

it(
  "accepts generic One Size Khimar garment length and width",
  async () => {
    mockProduct({
      productType: ProductType.KHIMAR,
    });

    const response = await PUT(
      makeRequest({
        productMeasurements: [
          {
            type:
              FitMeasurementType.GARMENT_LENGTH,
            component:
              FitGarmentComponent.KHIMAR,
            sourceUnit: FitUnit.CM,
            sourceMinValue: "150",
            sourceMaxValue: "",
          },
          {
            type: FitMeasurementType.WIDTH,
            component:
              FitGarmentComponent.KHIMAR,
            sourceUnit: FitUnit.CM,
            sourceMinValue: "100",
            sourceMaxValue: "",
          },
        ],
        sizeMeasurements: [],
      }),
      makeContext()
    );

    expect(response.status).toBe(200);

    await expect(
      response.json()
    ).resolves.toEqual({
      ok: true,
      productMeasurementCount: 2,
      sizeMeasurementCount: 0,
    });
  }
);

it(
  "preserves conventional Dress measurement behaviour",
  async () => {
    mockProduct({
      productType: ProductType.DRESS,
      measurementBasis:
        FitMeasurementBasis.BODY,
    });

    const response = await PUT(
      makeRequest({
        productMeasurements: [
          {
            type: FitMeasurementType.BUST,
            component:
              FitGarmentComponent.DRESS,
            sourceUnit: FitUnit.CM,
            sourceMinValue: "90",
            sourceMaxValue: "94",
          },
        ],
        sizeMeasurements: [],
      }),
      makeContext()
    );

    expect(response.status).toBe(200);

    await expect(
      response.json()
    ).resolves.toEqual({
      ok: true,
      productMeasurementCount: 1,
      sizeMeasurementCount: 0,
    });

    expect(
      productFitMeasurementCreateManyMock
    ).toHaveBeenCalledTimes(1);
  }
);

  }
);