import { describe, expect, it } from "vitest";

import {
  FabricStretch,
  FitDataSource,
  FitGarmentComponent,
  FitMeasurementBasis,
  FitMeasurementType,
  FitUnit,
  ProductIntendedFit,
  ProductLengthStructure,
  ProductType,
  ShopperFitPreference,
} from "@prisma/client";

import {
  loadNormalizedProductFitMeasurements,
  loadNormalizedProductLengthInput,
  loadRecommendationInput,
  type FitNumericValue,
  type RecommendationProductRecord,
  type RecommendationShopperRecord,
} from "@/lib/fit/loadRecommendationInput";

function decimal(value: number): FitNumericValue {
  return {
    toString: () => String(value),
  };
}

function makeShopper(
  overrides: Partial<RecommendationShopperRecord> = {}
): RecommendationShopperRecord {
  return {
    fitPreference:
      ShopperFitPreference.REGULAR,

    measurements: [
      {
        type: FitMeasurementType.BUST,
        valueCm: decimal(90),
      },
      {
        type: FitMeasurementType.WAIST,
        valueCm: decimal(72),
      },
      {
        type: FitMeasurementType.HIP,
        valueCm: decimal(98),
      },
    ],

    ...overrides,
  };
}

function makeProduct(
  overrides: Partial<RecommendationProductRecord> = {}
): RecommendationProductRecord {
  return {
    productTypes: [
      {
        productType: ProductType.DRESS,
      },
    ],

    legacyProductType: null,
    lengthStructure: null,
    lengthOptions: [],
    fitProfile: {
      intendedFit:
        ProductIntendedFit.REGULAR,
      stretch: FabricStretch.NONE,
      measurementBasis:
        FitMeasurementBasis.GARMENT,
    },

    productSizes: [
      {
        sizeId: "size-m",

        size: {
          name: "M",
        },

        fitMeasurements: [
          {
            type: FitMeasurementType.BUST,
            component:FitGarmentComponent.DRESS,
            measurementBasis: null,
            minValueCm: decimal(98),
            maxValueCm: decimal(102),
          },
        ],

        sizeChartMapping: null,
      },
    ],

    ...overrides,
  };
}

describe("loadRecommendationInput", () => {
  it("loads canonical product, shopper and size evidence into the engine contract", () => {
    const result =
      loadRecommendationInput({
        product: makeProduct(),
        shopper: makeShopper(),
      });

    expect(result.status).toBe("READY");

    if (result.status !== "READY") {
      throw new Error(
        "Expected loader result to be READY"
      );
    }

    expect(result.input.productType).toBe(
      ProductType.DRESS
    );

    expect(result.input.intendedFit).toBe(
      ProductIntendedFit.REGULAR
    );

    expect(result.input.stretch).toBe(
      FabricStretch.NONE
    );

    expect(
      result.input.productMeasurementBasis
    ).toBe(FitMeasurementBasis.GARMENT);

    expect(
      result.input.shopperFitPreference
    ).toBe(ShopperFitPreference.REGULAR);

    expect(
      result.input.shopperMeasurements
    ).toEqual([
      {
        type: FitMeasurementType.BUST,
        valueCm: 90,
      },
      {
        type: FitMeasurementType.WAIST,
        valueCm: 72,
      },
      {
        type: FitMeasurementType.HIP,
        valueCm: 98,
      },
    ]);

    expect(result.input.sizes).toHaveLength(1);

    expect(result.input.sizes[0]).toMatchObject({
      sizeId: "size-m",
      sizeLabel: "M",

      productSizeMeasurements: [
  {
    type: FitMeasurementType.BUST,
    component:
      FitGarmentComponent.DRESS,
    measurementBasis:
      FitMeasurementBasis.GARMENT,
    minValueCm: 98,
    maxValueCm: 102,
  },
],

      mappedChart: null,
      bodyMappedChart: null,
      garmentMappedChart: null,
    });
  });

  it("uses the canonical ProductProductType relation instead of the legacy productType", () => {
    const result =
      loadRecommendationInput({
        product: makeProduct({
          productTypes: [
            {
              productType:
                ProductType.DRESS,
            },
          ],

          legacyProductType:
            ProductType.ABAYA,
        }),

        shopper: makeShopper(),
      });

    expect(result.status).toBe("READY");

    if (result.status !== "READY") {
      throw new Error(
        "Expected loader result to be READY"
      );
    }

    expect(result.input.productType).toBe(
      ProductType.DRESS
    );
  });

  it("uses legacy productType only when no canonical ProductProductType exists", () => {
    const result =
      loadRecommendationInput({
        product: makeProduct({
          productTypes: [],
          legacyProductType:
            ProductType.ABAYA,
        }),

        shopper: makeShopper(),
      });

    expect(result.status).toBe("READY");

    if (result.status !== "READY") {
      throw new Error(
        "Expected loader result to be READY"
      );
    }

    expect(result.input.productType).toBe(
      ProductType.ABAYA
    );
  });

  it("refuses to load a product with no canonical or legacy product type", () => {
    const result =
      loadRecommendationInput({
        product: makeProduct({
          productTypes: [],
          legacyProductType: null,
        }),

        shopper: makeShopper(),
      });

    expect(result).toEqual({
      status: "NOT_LOADABLE",
      input: null,
      reason: "MISSING_PRODUCT_TYPE",
    });
  });

  it("does not arbitrarily choose between multiple canonical product types", () => {
    const result =
      loadRecommendationInput({
        product: makeProduct({
          productTypes: [
            {
              productType:
                ProductType.DRESS,
            },
            {
              productType:
                ProductType.SETS,
            },
          ],

          legacyProductType:
            ProductType.DRESS,
        }),

        shopper: makeShopper(),
      });

    expect(result).toEqual({
      status: "NOT_LOADABLE",
      input: null,
      reason: "MULTIPLE_PRODUCT_TYPES",
    });
  });

  it("routes a BODY chart into the BODY evidence channel", () => {
    const product = makeProduct();

    product.productSizes[0].sizeChartMapping = {
      chartEntry: {
        chart: {
          measurementBasis:
            FitMeasurementBasis.BODY,
        },

        measurements: [
          {
            type:
              FitMeasurementType.BUST,
            component:
              FitGarmentComponent.DRESS,
            minValueCm: decimal(88),
            maxValueCm: decimal(92),
          },
        ],
      },
    };

    const result =
      loadRecommendationInput({
        product,
        shopper: makeShopper(),
      });

    expect(result.status).toBe("READY");

    if (result.status !== "READY") {
      throw new Error(
        "Expected loader result to be READY"
      );
    }

    const size = result.input.sizes[0];

    expect(
      size.bodyMappedChart
        ?.measurementBasis
    ).toBe(FitMeasurementBasis.BODY);

    expect(
      size.bodyMappedChart?.measurements
    ).toEqual([
      {
        type: FitMeasurementType.BUST,
        component:
          FitGarmentComponent.DRESS,
        minValueCm: 88,
        maxValueCm: 92,
      },
    ]);

    expect(
      size.garmentMappedChart
    ).toBeNull();

    expect(
      size.mappedChart?.measurementBasis
    ).toBe(FitMeasurementBasis.BODY);
  });

  it("routes a GARMENT chart into the GARMENT evidence channel", () => {
    const product = makeProduct();

    product.productSizes[0].sizeChartMapping = {
      chartEntry: {
        chart: {
          measurementBasis:
            FitMeasurementBasis.GARMENT,
        },

        measurements: [
          {
            type:
              FitMeasurementType.BUST,
            component:
              FitGarmentComponent.DRESS,
            minValueCm: decimal(98),
            maxValueCm: decimal(102),
          },
        ],
      },
    };

    const result =
      loadRecommendationInput({
        product,
        shopper: makeShopper(),
      });

    expect(result.status).toBe("READY");

    if (result.status !== "READY") {
      throw new Error(
        "Expected loader result to be READY"
      );
    }

    const size = result.input.sizes[0];

    expect(
      size.garmentMappedChart
        ?.measurementBasis
    ).toBe(FitMeasurementBasis.GARMENT);

    expect(
      size.bodyMappedChart
    ).toBeNull();

    expect(
      size.mappedChart?.measurementBasis
    ).toBe(FitMeasurementBasis.GARMENT);
  });

  it("preserves UNKNOWN chart evidence without claiming BODY or GARMENT semantics", () => {
    const product = makeProduct();

    product.productSizes[0].sizeChartMapping = {
      chartEntry: {
        chart: {
          measurementBasis:
            FitMeasurementBasis.UNKNOWN,
        },

        measurements: [
          {
            type:
              FitMeasurementType.BUST,
            component:
              FitGarmentComponent.DRESS,
            minValueCm: decimal(90),
            maxValueCm: decimal(94),
          },
        ],
      },
    };

    const result =
      loadRecommendationInput({
        product,
        shopper: makeShopper(),
      });

    expect(result.status).toBe("READY");

    if (result.status !== "READY") {
      throw new Error(
        "Expected loader result to be READY"
      );
    }

    const size = result.input.sizes[0];

    expect(
      size.mappedChart?.measurementBasis
    ).toBe(FitMeasurementBasis.UNKNOWN);

    expect(size.bodyMappedChart).toBeNull();
    expect(
      size.garmentMappedChart
    ).toBeNull();
  });

  it("preserves missing ProductFitProfile as unknown evidence instead of inventing fit semantics", () => {
    const result =
      loadRecommendationInput({
        product: makeProduct({
          fitProfile: null,
        }),

        shopper: makeShopper(),
      });

    expect(result.status).toBe("READY");

    if (result.status !== "READY") {
      throw new Error(
        "Expected loader result to be READY"
      );
    }

    expect(result.input.intendedFit).toBeNull();

    expect(result.input.stretch).toBe(
      FabricStretch.UNKNOWN
    );

    expect(
      result.input.productMeasurementBasis
    ).toBe(FitMeasurementBasis.UNKNOWN);
  });

  it("inherits ProductFitProfile measurement basis when a product-size measurement basis is null", () => {
  const product = makeProduct();

  product.productSizes[0].fitMeasurements[0].measurementBasis =
    null;

  const result = loadRecommendationInput({
    product,
    shopper: makeShopper(),
  });

  expect(result.status).toBe("READY");

  if (result.status !== "READY") {
    throw new Error(
      "Expected loader result to be READY"
    );
  }

  expect(
    result.input.sizes[0]
      .productSizeMeasurements[0]
      .measurementBasis
  ).toBe(FitMeasurementBasis.GARMENT);
});

it("preserves an explicit BODY product-size measurement basis instead of inheriting the ProductFitProfile basis", () => {
  const product = makeProduct();

  product.productSizes[0].fitMeasurements[0].measurementBasis =
    FitMeasurementBasis.BODY;

  const result = loadRecommendationInput({
    product,
    shopper: makeShopper(),
  });

  expect(result.status).toBe("READY");

  if (result.status !== "READY") {
    throw new Error(
      "Expected loader result to be READY"
    );
  }

  expect(
    result.input.sizes[0]
      .productSizeMeasurements[0]
      .measurementBasis
  ).toBe(FitMeasurementBasis.BODY);
});

it("preserves an explicit GARMENT product-size measurement basis", () => {
  const product = makeProduct();

  product.productSizes[0].fitMeasurements[0].measurementBasis =
    FitMeasurementBasis.GARMENT;

  const result = loadRecommendationInput({
    product,
    shopper: makeShopper(),
  });

  expect(result.status).toBe("READY");

  if (result.status !== "READY") {
    throw new Error(
      "Expected loader result to be READY"
    );
  }

  expect(
    result.input.sizes[0]
      .productSizeMeasurements[0]
      .measurementBasis
  ).toBe(FitMeasurementBasis.GARMENT);
});

it("preserves an explicit UNKNOWN product-size measurement basis instead of inheriting the ProductFitProfile basis", () => {
  const product = makeProduct();

  product.productSizes[0].fitMeasurements[0].measurementBasis =
    FitMeasurementBasis.UNKNOWN;

  const result = loadRecommendationInput({
    product,
    shopper: makeShopper(),
  });

  expect(result.status).toBe("READY");

  if (result.status !== "READY") {
    throw new Error(
      "Expected loader result to be READY"
    );
  }

  expect(
    result.input.sizes[0]
      .productSizeMeasurements[0]
      .measurementBasis
  ).toBe(FitMeasurementBasis.UNKNOWN);
});
it("normalizes independent product length options into plain engine values", () => {
  const verifiedAt =
    new Date("2026-09-28T12:00:00.000Z");

  const product = makeProduct({
    lengthStructure:
      ProductLengthStructure.INDEPENDENT,

    lengthOptions: [
      {
        id: "length-58",
        label: '58"',
        valueCm: decimal(147.32),
        sourceValue: decimal(58),
        sourceUnit: FitUnit.IN,
        sortOrder: 0,
        source: FitDataSource.BRAND_WEBSITE,
        sourceUrl:
          "https://example.com/size-guide",
        sourceNotes:
          "Independent garment length",
        lastVerifiedAt: verifiedAt,
      },
    ],
  });

  const result =
    loadNormalizedProductLengthInput(
      product
    );

  expect(result).toEqual({
    structure:
      ProductLengthStructure.INDEPENDENT,

    options: [
      {
        id: "length-58",
        label: '58"',
        valueCm: 147.32,
        sourceValue: 58,
        sourceUnit: FitUnit.IN,
        sortOrder: 0,
        source: FitDataSource.BRAND_WEBSITE,
        sourceUrl:
          "https://example.com/size-guide",
        sourceNotes:
          "Independent garment length",
        lastVerifiedAt: verifiedAt,
      },
    ],
  });
});

it("preserves a catalogue length option with no normalized value without inventing recommendation evidence", () => {
  const product = makeProduct({
    lengthStructure:
      ProductLengthStructure.INDEPENDENT,

    lengthOptions: [
      {
        id: "length-tall",
        label: "Tall",
        valueCm: null,
        sourceValue: null,
        sourceUnit: null,
        sortOrder: 0,
        source: null,
        sourceUrl: null,
        sourceNotes: null,
        lastVerifiedAt: null,
      },
    ],
  });

  const result =
    loadNormalizedProductLengthInput(
      product
    );

  expect(result.options[0]).toMatchObject({
    label: "Tall",
    valueCm: null,
    sourceValue: null,
    sourceUnit: null,
  });
});

it("does not infer a normalized value from a numeric-looking length label", () => {
  const product = makeProduct({
    lengthStructure:
      ProductLengthStructure.INDEPENDENT,

    lengthOptions: [
      {
        id: "length-58",
        label: "58",
        valueCm: null,
        sourceValue: null,
        sourceUnit: null,
        sortOrder: 0,
        source: null,
        sourceUrl: null,
        sourceNotes: null,
        lastVerifiedAt: null,
      },
    ],
  });

  const result =
    loadNormalizedProductLengthInput(
      product
    );

  expect(result.options[0].label).toBe(
    "58"
  );

  expect(result.options[0].valueCm).toBeNull();
});

it("orders normalized length options deterministically by sortOrder and then label", () => {
  const product = makeProduct({
    lengthStructure:
      ProductLengthStructure.INDEPENDENT,

    lengthOptions: [
      {
        id: "length-58",
        label: '58"',
        valueCm: decimal(147.32),
        sourceValue: decimal(58),
        sourceUnit: FitUnit.IN,
        sortOrder: 2,
        source: null,
        sourceUrl: null,
        sourceNotes: null,
        lastVerifiedAt: null,
      },
      {
        id: "length-56",
        label: '56"',
        valueCm: decimal(142.24),
        sourceValue: decimal(56),
        sourceUnit: FitUnit.IN,
        sortOrder: 1,
        source: null,
        sourceUrl: null,
        sourceNotes: null,
        lastVerifiedAt: null,
      },
      {
        id: "length-54",
        label: '54"',
        valueCm: decimal(137.16),
        sourceValue: decimal(54),
        sourceUnit: FitUnit.IN,
        sortOrder: 1,
        source: null,
        sourceUrl: null,
        sourceNotes: null,
        lastVerifiedAt: null,
      },
    ],
  });

  const result =
    loadNormalizedProductLengthInput(
      product
    );

  expect(
    result.options.map(
      (option) => option.label
    )
  ).toEqual([
    '54"',
    '56"',
    '58"',
  ]);
});

it("normalizes explicit GARMENT product-level measurements and preserves source values", () => {
  const product = makeProduct({
    productTypes: [
      {
        productType: ProductType.HIJAB,
      },
    ],

    fitProfile: {
      intendedFit: null,
      stretch: FabricStretch.UNKNOWN,
      measurementBasis:
        FitMeasurementBasis.GARMENT,

      measurements: [
        {
          type:
            FitMeasurementType.GARMENT_LENGTH,
          component:
            FitGarmentComponent.HIJAB,

          minValueCm: decimal(180),
          maxValueCm: decimal(180),

          sourceMinValue: decimal(180),
          sourceMaxValue: decimal(180),
          sourceUnit: FitUnit.CM,
        },
        {
          type: FitMeasurementType.WIDTH,
          component:
            FitGarmentComponent.HIJAB,

          minValueCm: decimal(70),
          maxValueCm: decimal(70),

          sourceMinValue: decimal(70),
          sourceMaxValue: decimal(70),
          sourceUnit: FitUnit.CM,
        },
      ],
    },
  });

  const result =
    loadNormalizedProductFitMeasurements(
      product
    );

  expect(result).toEqual([
    {
      type:
        FitMeasurementType.GARMENT_LENGTH,
      component:
        FitGarmentComponent.HIJAB,

      minValueCm: 180,
      maxValueCm: 180,

      sourceMinValue: 180,
      sourceMaxValue: 180,
      sourceUnit: FitUnit.CM,
    },
    {
      type: FitMeasurementType.WIDTH,
      component:
        FitGarmentComponent.HIJAB,

      minValueCm: 70,
      maxValueCm: 70,

      sourceMinValue: 70,
      sourceMaxValue: 70,
      sourceUnit: FitUnit.CM,
    },
  ]);
});

it("preserves original source units for product-level measurements", () => {
  const product = makeProduct({
    fitProfile: {
      intendedFit: null,
      stretch: FabricStretch.UNKNOWN,
      measurementBasis:
        FitMeasurementBasis.GARMENT,

      measurements: [
        {
          type:
            FitMeasurementType.GARMENT_LENGTH,
          component:
            FitGarmentComponent.HIJAB,

          minValueCm: decimal(180.34),
          maxValueCm: decimal(180.34),

          sourceMinValue: decimal(71),
          sourceMaxValue: decimal(71),
          sourceUnit: FitUnit.IN,
        },
      ],
    },
  });

  const result =
    loadNormalizedProductFitMeasurements(
      product
    );

  expect(result[0]).toMatchObject({
    minValueCm: 180.34,
    maxValueCm: 180.34,
    sourceMinValue: 71,
    sourceMaxValue: 71,
    sourceUnit: FitUnit.IN,
  });
});

it("does not expose BODY product-level measurements as garment dimensions", () => {
  const product = makeProduct({
    fitProfile: {
      intendedFit: null,
      stretch: FabricStretch.UNKNOWN,
      measurementBasis:
        FitMeasurementBasis.BODY,

      measurements: [
        {
          type: FitMeasurementType.WIDTH,
          component:
            FitGarmentComponent.HIJAB,
          minValueCm: decimal(70),
          maxValueCm: decimal(70),
          sourceMinValue: decimal(70),
          sourceMaxValue: decimal(70),
          sourceUnit: FitUnit.CM,
        },
      ],
    },
  });

  expect(
    loadNormalizedProductFitMeasurements(
      product
    )
  ).toEqual([]);
});

it("does not expose UNKNOWN product-level measurements as garment dimensions", () => {
  const product = makeProduct({
    fitProfile: {
      intendedFit: null,
      stretch: FabricStretch.UNKNOWN,
      measurementBasis:
        FitMeasurementBasis.UNKNOWN,

      measurements: [
        {
          type: FitMeasurementType.WIDTH,
          component:
            FitGarmentComponent.HIJAB,
          minValueCm: decimal(70),
          maxValueCm: decimal(70),
          sourceMinValue: decimal(70),
          sourceMaxValue: decimal(70),
          sourceUnit: FitUnit.CM,
        },
      ],
    },
  });

  expect(
    loadNormalizedProductFitMeasurements(
      product
    )
  ).toEqual([]);
});

it("returns no product-level garment dimensions when ProductFitProfile is absent", () => {
  const product = makeProduct({
    fitProfile: null,
  });

  expect(
    loadNormalizedProductFitMeasurements(
      product
    )
  ).toEqual([]);
});

});