import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  FabricStretch,
  FitGarmentComponent,
  FitMeasurementBasis,
  FitMeasurementType,
  ProductIntendedFit,
  ProductLengthStructure,
  ProductType,
  ShopperFitPreference,
} from "@prisma/client";

import {
  loadProductRecommendationData,
  loadShopperRecommendationData,
} from "@/lib/fit/loadRecommendationData";

import {
  getProductSizeRecommendation,
} from "@/lib/fit/getProductSizeRecommendation";

vi.mock(
  "@/lib/fit/loadRecommendationData",
  () => ({
    loadProductRecommendationData: vi.fn(),
    loadShopperRecommendationData: vi.fn(),
  })
);

const mockLoadProductRecommendationData =
  vi.mocked(loadProductRecommendationData);

const mockLoadShopperRecommendationData =
  vi.mocked(loadShopperRecommendationData);

function decimal(value: number) {
  return {
    toString: () => String(value),
  };
}

function makeProduct() {
  return {
    productType: ProductType.DRESS,

    productTypes: [
      {
        productType: ProductType.DRESS,
      },
    ],
    lengthStructure: null,
    lengthOptions: [],

    fitProfile: {
      intendedFit:
        ProductIntendedFit.REGULAR,
      stretch: FabricStretch.NONE,
      measurementBasis:
        FitMeasurementBasis.BODY,
    },

    productSizes: [
      {
        sizeId: "size-m",

        size: {
          name: "M",
        },

        fitMeasurements: [],

        sizeChartMapping: {
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
              {
                type:
                  FitMeasurementType.WAIST,
                component:
                  FitGarmentComponent.DRESS,
                minValueCm: decimal(70),
                maxValueCm: decimal(74),
              },
              {
                type:
                  FitMeasurementType.HIP,
                component:
                  FitGarmentComponent.DRESS,
                minValueCm: decimal(96),
                maxValueCm: decimal(100),
              },
            ],
          },
        },
      },
    ],
  };
}

function makeShopper() {
  return {
    fitProfile: {
      fitPreference:
        ShopperFitPreference.REGULAR,

      preferredUnit: "CM" as const,

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
    },
  };
}

describe(
  "getProductSizeRecommendation",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("returns PRODUCT_NOT_FOUND when the product does not exist", async () => {
      mockLoadProductRecommendationData
        .mockResolvedValue(null);

      mockLoadShopperRecommendationData
        .mockResolvedValue(makeShopper() as never);

      const result =
        await getProductSizeRecommendation({
          productId: "missing-product",
          shopperId: "shopper-1",
        });

      expect(result).toEqual({
        status: "UNAVAILABLE",
        recommendation: null,
        reason: "PRODUCT_NOT_FOUND",
      });
    });

    it("returns SHOPPER_NOT_FOUND when the shopper does not exist", async () => {
      mockLoadProductRecommendationData
        .mockResolvedValue(
          makeProduct() as never
        );

      mockLoadShopperRecommendationData
        .mockResolvedValue(null);

      const result =
        await getProductSizeRecommendation({
          productId: "product-1",
          shopperId: "missing-shopper",
        });

      expect(result).toEqual({
        status: "UNAVAILABLE",
        recommendation: null,
        reason: "SHOPPER_NOT_FOUND",
      });
    });

    it("returns SHOPPER_FIT_PROFILE_MISSING rather than inventing shopper defaults", async () => {
      mockLoadProductRecommendationData
        .mockResolvedValue(
          makeProduct() as never
        );

      mockLoadShopperRecommendationData
        .mockResolvedValue({
          fitProfile: null,
        });

      const result =
        await getProductSizeRecommendation({
          productId: "product-1",
          shopperId: "shopper-1",
        });

      expect(result).toEqual({
        status: "UNAVAILABLE",
        recommendation: null,
        reason:
          "SHOPPER_FIT_PROFILE_MISSING",
      });
    });

    it("returns PRODUCT_NOT_LOADABLE when the product has no usable product type", async () => {
      const product = makeProduct();

      mockLoadProductRecommendationData
        .mockResolvedValue({
          ...product,

          productType: null,
          productTypes: [],
        } as never);

      mockLoadShopperRecommendationData
        .mockResolvedValue(
          makeShopper() as never
        );

      const result =
        await getProductSizeRecommendation({
          productId: "product-1",
          shopperId: "shopper-1",
        });

      expect(result).toEqual({
        status: "UNAVAILABLE",
        recommendation: null,
        reason: "PRODUCT_NOT_LOADABLE",
        detail: "MISSING_PRODUCT_TYPE",
      });
    });

    it("returns PRODUCT_NOT_LOADABLE rather than arbitrarily choosing between multiple canonical product types", async () => {
      const product = makeProduct();

      mockLoadProductRecommendationData
        .mockResolvedValue({
          ...product,

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
        } as never);

      mockLoadShopperRecommendationData
        .mockResolvedValue(
          makeShopper() as never
        );

      const result =
        await getProductSizeRecommendation({
          productId: "product-1",
          shopperId: "shopper-1",
        });

      expect(result).toEqual({
        status: "UNAVAILABLE",
        recommendation: null,
        reason: "PRODUCT_NOT_LOADABLE",
        detail: "MULTIPLE_PRODUCT_TYPES",
      });
    });

    it("passes production-shaped data through the loader and recommendation engine", async () => {
      mockLoadProductRecommendationData
        .mockResolvedValue(
          makeProduct() as never
        );

      mockLoadShopperRecommendationData
        .mockResolvedValue(
          makeShopper() as never
        );

      const result =
        await getProductSizeRecommendation({
          productId: "product-1",
          shopperId: "shopper-1",
        });

      expect(result.status).toBe("ASSESSED");

      if (result.status !== "ASSESSED") {
        throw new Error(
          "Expected recommendation to be assessed"
        );
      }

      /*
       * This test deliberately does not demand a particular
       * recommended size.
       *
       * The fixture contains verified BODY evidence but no
       * parallel GARMENT evidence. The engine itself decides
       * whether that evidence is sufficient.
       *
       * What matters at this service boundary is that the
       * production-shaped Prisma data reaches the real engine
       * without fabricated evidence or semantic rewriting.
       */
      expect(
  result.lengthAssessment
).toEqual({
  structure: "SIZE_DEPENDENT",

 result: {
  status: "INSUFFICIENT_EVIDENCE",
  structure: "SIZE_DEPENDENT",
  assessments: [],
  reason: "MISSING_SHOPPER_PREFERENCE",
},
});

expect(
  result.shopperDisplayUnit
).toBe("CM");
    });

    it("can assess length independently when conventional size evidence remains insufficient", async () => {
  const product = makeProduct();

  mockLoadProductRecommendationData
    .mockResolvedValue({
      ...product,

      fitProfile: {
        intendedFit:
          ProductIntendedFit.REGULAR,
        stretch:
          FabricStretch.NONE,
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
              type:
                FitMeasurementType.GARMENT_LENGTH,
              component:
                FitGarmentComponent.WHOLE_GARMENT,
              minValueCm:
                decimal(147.32),
              maxValueCm:
                decimal(147.32),
            },
          ],

          sizeChartMapping: null,
        },
      ],
    } as never);

  mockLoadShopperRecommendationData
    .mockResolvedValue({
      fitProfile: {
        fitPreference:
          ShopperFitPreference.REGULAR,

        preferredUnit: "IN",

        measurements: [
          {
            type:
              FitMeasurementType.GARMENT_LENGTH,
            valueCm:
              decimal(147.32),
          },
        ],
      },
    } as never);

  const result =
    await getProductSizeRecommendation({
      productId: "product-1",
      shopperId: "shopper-1",
    });

  expect(result.status).toBe("ASSESSED");

  if (result.status !== "ASSESSED") {
    throw new Error(
      "Expected recommendation to be assessed"
    );
  }

  /*
   * No BUST / WAIST / HIP evidence exists here, so
   * conventional dress-size suitability must not be
   * manufactured from the garment length.
   */
  expect(
    result.recommendation.status
  ).toBe("INSUFFICIENT_EVIDENCE");

  /*
   * Length has its own valid evidence path:
   * shopper preference 147.32 cm
   * product garment length 147.32 cm.
   */
 expect(
  result.lengthAssessment.structure
).toBe("SIZE_DEPENDENT");

expect(
  result.lengthAssessment.result.status
).toBe("ASSESSED");

if (
  result.lengthAssessment.structure !==
  "SIZE_DEPENDENT" ||
  result.lengthAssessment.result.status !==
    "ASSESSED"
) {
  throw new Error(
    "Expected size-attached length to be assessed"
  );
}

expect(
  result.lengthAssessment.result.assessments
).toHaveLength(1);

expect(
  result.lengthAssessment.result
    .assessments[0]
    .assessment.status
).toBe("MATCH");

  expect(
    result.shopperDisplayUnit
  ).toBe("IN");
});

it("keeps missing product garment-length evidence distinct from a missing shopper preference", async () => {
  mockLoadProductRecommendationData
    .mockResolvedValue(
      makeProduct() as never
    );

  const shopper = makeShopper();

  mockLoadShopperRecommendationData
    .mockResolvedValue({
      ...shopper,

      fitProfile: {
        ...shopper.fitProfile,

        measurements: [
          ...shopper.fitProfile.measurements,

          {
            type:
              FitMeasurementType.GARMENT_LENGTH,
            valueCm:
              decimal(147.32),
          },
        ],
      },
    } as never);

  const result =
    await getProductSizeRecommendation({
      productId: "product-1",
      shopperId: "shopper-1",
    });

  expect(result.status).toBe("ASSESSED");

  if (result.status !== "ASSESSED") {
    throw new Error(
      "Expected recommendation to be assessed"
    );
  }

  expect(
  result.lengthAssessment
).toEqual({
  structure: "SIZE_DEPENDENT",

  result: {
  status: "INSUFFICIENT_EVIDENCE",
  structure: "SIZE_DEPENDENT",
  assessments: [],
  reason: "MISSING_GARMENT_LENGTH",
},
});
});
it("does not let a matching attached length override the conventional body-fit recommendation", async () => {
  const product = makeProduct();

  const makeBodyChartEntry = (
    bustMin: number,
    bustMax: number,
    waistMin: number,
    waistMax: number,
    hipMin: number,
    hipMax: number
  ) => ({
    chart: {
      measurementBasis:
        FitMeasurementBasis.BODY,
    },

    measurements: [
      {
        type: FitMeasurementType.BUST,
        component: FitGarmentComponent.DRESS,
        minValueCm: decimal(bustMin),
        maxValueCm: decimal(bustMax),
      },
      {
        type: FitMeasurementType.WAIST,
        component: FitGarmentComponent.DRESS,
        minValueCm: decimal(waistMin),
        maxValueCm: decimal(waistMax),
      },
      {
        type: FitMeasurementType.HIP,
        component: FitGarmentComponent.DRESS,
        minValueCm: decimal(hipMin),
        maxValueCm: decimal(hipMax),
      },
    ],
  });

  mockLoadProductRecommendationData.mockResolvedValue({
    ...product,

    lengthStructure:
      ProductLengthStructure.SIZE_DEPENDENT,

    fitProfile: {
      intendedFit:
        ProductIntendedFit.REGULAR,
      stretch: FabricStretch.NONE,
      measurementBasis:
        FitMeasurementBasis.BODY,
    },

    productSizes: [
      {
        sizeId: "size-s",
        size: {
          name: "S",
        },

        fitMeasurements: [
          {
            type:
              FitMeasurementType.GARMENT_LENGTH,
            component:
              FitGarmentComponent.DRESS,
            minValueCm: decimal(137.16),
            maxValueCm: decimal(137.16),
            measurementBasis:
              FitMeasurementBasis.GARMENT,
          },
        ],

        sizeChartMapping: {
          chartEntry: makeBodyChartEntry(
            86.5,
            90,
            68.5,
            72.5,
            93,
            96.5
          ),
        },
      },

      {
        sizeId: "size-m",
        size: {
          name: "M",
        },

        fitMeasurements: [
          {
            type:
              FitMeasurementType.GARMENT_LENGTH,
            component:
              FitGarmentComponent.DRESS,
            minValueCm: decimal(142.24),
            maxValueCm: decimal(142.24),
            measurementBasis:
              FitMeasurementBasis.GARMENT,
          },
        ],

        sizeChartMapping: {
          chartEntry: makeBodyChartEntry(
            91.5,
            98,
            74,
            80,
            98,
            104
          ),
        },
      },

      {
        sizeId: "size-l",
        size: {
          name: "L",
        },

        fitMeasurements: [
          {
            type:
              FitMeasurementType.GARMENT_LENGTH,
            component:
              FitGarmentComponent.DRESS,
            minValueCm: decimal(147.32),
            maxValueCm: decimal(147.32),
            measurementBasis:
              FitMeasurementBasis.GARMENT,
          },
        ],

        sizeChartMapping: {
          chartEntry: makeBodyChartEntry(
            99,
            105.5,
            81,
            88,
            105.5,
            112
          ),
        },
      },

      {
        sizeId: "size-xl",
        size: {
          name: "XL",
        },

        fitMeasurements: [
          {
            type:
              FitMeasurementType.GARMENT_LENGTH,
            component:
              FitGarmentComponent.DRESS,
            minValueCm: decimal(152.4),
            maxValueCm: decimal(152.4),
            measurementBasis:
              FitMeasurementBasis.GARMENT,
          },
        ],

        sizeChartMapping: {
          chartEntry: makeBodyChartEntry(
            105.5,
            115.5,
            89,
            98,
            113,
            122
          ),
        },
      },
    ],
  } as never);

  mockLoadShopperRecommendationData.mockResolvedValue({
    fitProfile: {
      fitPreference:
        ShopperFitPreference.REGULAR,

      preferredUnit: "CM",

      measurements: [
        {
          type: FitMeasurementType.BUST,
          valueCm: decimal(95),
        },
        {
          type: FitMeasurementType.WAIST,
          valueCm: decimal(77),
        },
        {
          type: FitMeasurementType.HIP,
          valueCm: decimal(101),
        },
        {
          type:
            FitMeasurementType.GARMENT_LENGTH,
          valueCm: decimal(147.32),
        },
      ],
    },
  } as never);

  const result =
    await getProductSizeRecommendation({
      productId: "layla-regression",
      shopperId: "shopper-1",
    });

  expect(result.status).toBe("ASSESSED");

  if (result.status !== "ASSESSED") {
    throw new Error(
      "Expected Layla-style recommendation to be assessed"
    );
  }

  /*
   * M is the conventional BODY-fit recommendation.
   *
   * L has the shopper's exact preferred garment
   * length, but BODY evidence makes L unsuitable.
   *
   * Length must never override conventional fit.
   */
  expect(result.recommendation.status).toBe(
  "RECOMMENDED"
);

if (
  result.recommendation.status !==
    "RECOMMENDED" ||
  result.recommendation.recommendedSize === null
) {
  throw new Error(
    "Expected a conventional size recommendation"
  );
}

expect(
  result.recommendation.recommendedSize.sizeId
).toBe("size-m");
  expect(
    result.lengthAssessment.structure
  ).toBe("SIZE_DEPENDENT");

  if (
    result.lengthAssessment.structure !==
      "SIZE_DEPENDENT" ||
    result.lengthAssessment.result.status !==
      "ASSESSED"
  ) {
    throw new Error(
      "Expected size-dependent length assessment"
    );
  }

  expect(
    result.lengthAssessment.result.assessments.map(
      (item) => ({
        id: item.sizeId,
        status: item.assessment.status,
      })
    )
  ).toEqual([
    {
      id: "size-s",
      status: "SHORTER_THAN_PREFERENCE",
    },
    {
      id: "size-m",
      status: "SHORTER_THAN_PREFERENCE",
    },
    {
      id: "size-l",
      status: "MATCH",
    },
    {
      id: "size-xl",
      status: "LONGER_THAN_PREFERENCE",
    },
  ]);
});

it("routes independent product length options through the normalized independent length assessment path", async () => {
  const product = makeProduct();

  mockLoadProductRecommendationData
    .mockResolvedValue({
      ...product,

      lengthStructure:
        ProductLengthStructure.INDEPENDENT,

      lengthOptions: [
        {
          id: "length-54",
          label: '54"',
          valueCm: decimal(137.16),
          sourceValue: decimal(54),
          sourceUnit: "IN",
          sortOrder: 0,
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
          sourceUnit: "IN",
          sortOrder: 1,
          source: null,
          sourceUrl: null,
          sourceNotes: null,
          lastVerifiedAt: null,
        },
        {
          id: "length-58",
          label: '58"',
          valueCm: decimal(147.32),
          sourceValue: decimal(58),
          sourceUnit: "IN",
          sortOrder: 2,
          source: null,
          sourceUrl: null,
          sourceNotes: null,
          lastVerifiedAt: null,
        },
      ],
    } as never);

  const shopper = makeShopper();

  mockLoadShopperRecommendationData
    .mockResolvedValue({
      ...shopper,

      fitProfile: {
        ...shopper.fitProfile,

        measurements: [
          ...shopper.fitProfile.measurements,

          {
            type:
              FitMeasurementType.GARMENT_LENGTH,
            valueCm: decimal(147.32),
          },
        ],
      },
    } as never);

  const result =
    await getProductSizeRecommendation({
      productId: "product-1",
      shopperId: "shopper-1",
    });

  expect(result.status).toBe("ASSESSED");

  if (result.status !== "ASSESSED") {
    throw new Error(
      "Expected recommendation to be assessed"
    );
  }

  expect(
    result.lengthAssessment.structure
  ).toBe("INDEPENDENT");

  if (
    result.lengthAssessment.structure !==
    "INDEPENDENT"
  ) {
    throw new Error(
      "Expected independent length assessment"
    );
  }

  expect(
    result.lengthAssessment.result.status
  ).toBe("ASSESSED");

  if (
    result.lengthAssessment.result.status !==
    "ASSESSED"
  ) {
    throw new Error(
      "Expected independent lengths to be assessed"
    );
  }

  expect(
    result.lengthAssessment.result.assessments
      .map((item) => ({
        label: item.optionLabel,
        status: item.assessment.status,
      }))
  ).toEqual([
    {
      label: '54"',
      status: "SHORTER_THAN_PREFERENCE",
    },
    {
      label: '56"',
      status: "SHORTER_THAN_PREFERENCE",
    },
    {
      label: '58"',
      status: "MATCH",
    },
  ]);
});

it("keeps Zahra-style independent length assessment separate when conventional garment-only fit evidence is insufficient", async () => {
  const product = makeProduct();

  const makeGarmentChartEntry = (
    shoulderMin: number,
    shoulderMax: number,
    bustMin: number,
    bustMax: number,
    waistMin: number,
    waistMax: number,
    sleeveMin: number,
    sleeveMax: number,
    armholeMin: number,
    armholeMax: number
  ) => ({
    chart: {
      measurementBasis:
        FitMeasurementBasis.GARMENT,
    },

    measurements: [
      {
        type:
          FitMeasurementType.SHOULDER_WIDTH,
        component:
          FitGarmentComponent.ABAYA,
        minValueCm: decimal(shoulderMin),
        maxValueCm: decimal(shoulderMax),
      },
      {
        type: FitMeasurementType.BUST,
        component:
          FitGarmentComponent.ABAYA,
        minValueCm: decimal(bustMin),
        maxValueCm: decimal(bustMax),
      },
      {
        type: FitMeasurementType.WAIST,
        component:
          FitGarmentComponent.ABAYA,
        minValueCm: decimal(waistMin),
        maxValueCm: decimal(waistMax),
      },
      {
        type:
          FitMeasurementType.SLEEVE_LENGTH,
        component:
          FitGarmentComponent.ABAYA,
        minValueCm: decimal(sleeveMin),
        maxValueCm: decimal(sleeveMax),
      },
      {
        type: FitMeasurementType.ARMHOLE,
        component:
          FitGarmentComponent.ABAYA,
        minValueCm: decimal(armholeMin),
        maxValueCm: decimal(armholeMax),
      },
    ],
  });

  mockLoadProductRecommendationData.mockResolvedValue({
    ...product,

    productType: ProductType.ABAYA,

    productTypes: [
      {
        productType: ProductType.ABAYA,
      },
    ],

    lengthStructure:
      ProductLengthStructure.INDEPENDENT,

    /*
     * Zahra-style architecture:
     *
     * conventional body size and garment length are
     * independent shopper choices.
     */
    lengthOptions: [
      {
        id: "length-53",
        label: '53"',
        valueCm: decimal(134.62),
        sourceValue: decimal(53),
        sourceUnit: "IN",
        sortOrder: 0,
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
        sourceUnit: "IN",
        sortOrder: 1,
        source: null,
        sourceUrl: null,
        sourceNotes: null,
        lastVerifiedAt: null,
      },
      {
        id: "length-60",
        label: '60"',
        valueCm: decimal(152.4),
        sourceValue: decimal(60),
        sourceUnit: "IN",
        sortOrder: 2,
        source: null,
        sourceUrl: null,
        sourceNotes: null,
        lastVerifiedAt: null,
      },
    ],

    /*
     * Zahra's conventional size evidence is GARMENT
     * evidence.
     *
     * No designed-ease evidence exists in this fixture,
     * so the engine must not manufacture conventional
     * body-size suitability from these measurements.
     */
    fitProfile: {
      intendedFit:
        ProductIntendedFit.REGULAR,
      stretch: FabricStretch.NONE,
      measurementBasis:
        FitMeasurementBasis.GARMENT,
    },

    productSizes: [
      {
        sizeId: "size-s",
        size: {
          name: "S",
        },
        fitMeasurements: [],
        sizeChartMapping: {
          chartEntry: makeGarmentChartEntry(
            36,
            38,
            96,
            100,
            92,
            96,
            58,
            60,
            44,
            46
          ),
        },
      },
      {
        sizeId: "size-m",
        size: {
          name: "M",
        },
        fitMeasurements: [],
        sizeChartMapping: {
          chartEntry: makeGarmentChartEntry(
            38,
            40,
            100,
            104,
            96,
            100,
            59,
            61,
            46,
            48
          ),
        },
      },
      {
        sizeId: "size-l",
        size: {
          name: "L",
        },
        fitMeasurements: [],
        sizeChartMapping: {
          chartEntry: makeGarmentChartEntry(
            40,
            42,
            104,
            108,
            100,
            104,
            60,
            62,
            48,
            50
          ),
        },
      },
    ],
  } as never);

  mockLoadShopperRecommendationData.mockResolvedValue({
    fitProfile: {
      fitPreference:
        ShopperFitPreference.REGULAR,

      preferredUnit: "IN",

      measurements: [
        {
          type: FitMeasurementType.BUST,
          valueCm: decimal(95),
        },
        {
          type: FitMeasurementType.WAIST,
          valueCm: decimal(77),
        },
        {
          type: FitMeasurementType.HIP,
          valueCm: decimal(101),
        },
        {
          type:
            FitMeasurementType.GARMENT_LENGTH,
          valueCm: decimal(147.32),
        },
      ],
    },
  } as never);

  const result =
    await getProductSizeRecommendation({
      productId: "zahra-regression",
      shopperId: "shopper-1",
    });

  expect(result.status).toBe("ASSESSED");

  if (result.status !== "ASSESSED") {
    throw new Error(
      "Expected Zahra-style recommendation to be assessed"
    );
  }

  /*
   * GARMENT-only conventional evidence without
   * sufficient designed-ease evidence must not create
   * a conventional size recommendation.
   */
  expect(
    result.recommendation.status
  ).toBe("INSUFFICIENT_EVIDENCE");

  /*
   * Independent length evidence remains independently
   * assessable.
   */
  expect(
    result.lengthAssessment.structure
  ).toBe("INDEPENDENT");

  if (
    result.lengthAssessment.structure !==
      "INDEPENDENT" ||
    result.lengthAssessment.result.status !==
      "ASSESSED"
  ) {
    throw new Error(
      "Expected Zahra-style independent lengths to be assessed"
    );
  }

  expect(
    result.lengthAssessment.result.assessments.map(
      (item) => ({
        label: item.optionLabel,
        status: item.assessment.status,
      })
    )
  ).toEqual([
    {
      label: '53"',
      status: "SHORTER_THAN_PREFERENCE",
    },
    {
      label: '56"',
      status: "SHORTER_THAN_PREFERENCE",
    },
    {
      label: '60"',
      status: "LONGER_THAN_PREFERENCE",
    },
  ]);

  /*
   * There is deliberately no 58" catalogue option.
   * Independent length assessment must never invent
   * the closest option as a MATCH.
   */
  expect(
    result.lengthAssessment.result.assessments.some(
      (item) =>
        item.assessment.status === "MATCH"
    )
  ).toBe(false);

  /*
   * Most importantly, successful independent length
   * assessment must not change the conventional fit
   * result.
   */
  expect(
    result.recommendation.status
  ).toBe("INSUFFICIENT_EVIDENCE");
});

it("routes length-based purchasable sizes through ProductSize garment-length evidence without inferring length from size labels", async () => {
  const product = makeProduct();

  mockLoadProductRecommendationData.mockResolvedValue({
    ...product,

    productType: ProductType.ABAYA,

    productTypes: [
      {
        productType: ProductType.ABAYA,
      },
    ],

    lengthStructure:
      ProductLengthStructure.LENGTH_BASED_SIZE,

    /*
     * LENGTH_BASED_SIZE must not depend on
     * ProductLengthOption records.
     *
     * The purchasable ProductSize is the length choice.
     */
    lengthOptions: [],

    fitProfile: {
      intendedFit:
        ProductIntendedFit.REGULAR,
      stretch: FabricStretch.NONE,
      measurementBasis:
        FitMeasurementBasis.UNKNOWN,
    },

    productSizes: [
      {
        sizeId: "size-54",

        size: {
          name: "54",
        },

        fitMeasurements: [
          {
            type:
              FitMeasurementType.GARMENT_LENGTH,
            component:
              FitGarmentComponent.WHOLE_GARMENT,

            minValueCm: decimal(137.16),
            maxValueCm: decimal(137.16),

            measurementBasis:
              FitMeasurementBasis.GARMENT,
          },
        ],

        sizeChartMapping: null,
      },

      {
        sizeId: "size-56",

        size: {
          name: "56",
        },

        fitMeasurements: [
          {
            type:
              FitMeasurementType.GARMENT_LENGTH,
            component:
              FitGarmentComponent.WHOLE_GARMENT,

            minValueCm: decimal(142.24),
            maxValueCm: decimal(142.24),

            measurementBasis:
              FitMeasurementBasis.GARMENT,
          },
        ],

        sizeChartMapping: null,
      },

      {
        sizeId: "size-58",

        size: {
          name: "58",
        },

        fitMeasurements: [
          {
            type:
              FitMeasurementType.GARMENT_LENGTH,
            component:
              FitGarmentComponent.WHOLE_GARMENT,

            minValueCm: decimal(147.32),
            maxValueCm: decimal(147.32),

            measurementBasis:
              FitMeasurementBasis.GARMENT,
          },
        ],

        sizeChartMapping: null,
      },

      {
        sizeId: "size-60",

        size: {
          name: "60",
        },

        fitMeasurements: [
          {
            type:
              FitMeasurementType.GARMENT_LENGTH,
            component:
              FitGarmentComponent.WHOLE_GARMENT,

            minValueCm: decimal(152.4),
            maxValueCm: decimal(152.4),

            measurementBasis:
              FitMeasurementBasis.GARMENT,
          },
        ],

        sizeChartMapping: null,
      },
    ],
  } as never);

  const shopper = makeShopper();

  mockLoadShopperRecommendationData.mockResolvedValue({
    ...shopper,

    fitProfile: {
      ...shopper.fitProfile,

      measurements: [
        ...shopper.fitProfile.measurements,

        {
          type:
            FitMeasurementType.GARMENT_LENGTH,
          valueCm: decimal(147.32),
        },
      ],
    },
  } as never);

  const result =
    await getProductSizeRecommendation({
      productId: "product-length-based",
      shopperId: "shopper-1",
    });

  expect(result.status).toBe("ASSESSED");

  if (result.status !== "ASSESSED") {
    throw new Error(
      "Expected recommendation to be assessed"
    );
  }

  /*
   * This is the critical service-boundary invariant:
   * LENGTH_BASED_SIZE must survive routing intact.
   */
  expect(
    result.lengthAssessment.structure
  ).toBe("LENGTH_BASED_SIZE");

  if (
    result.lengthAssessment.structure !==
    "LENGTH_BASED_SIZE"
  ) {
    throw new Error(
      "Expected length-based size assessment"
    );
  }

  expect(
    result.lengthAssessment.result.status
  ).toBe("ASSESSED");

  if (
    result.lengthAssessment.result.status !==
    "ASSESSED"
  ) {
    throw new Error(
      "Expected length-based sizes to be assessed"
    );
  }

  expect(
    result.lengthAssessment.result.structure
  ).toBe("LENGTH_BASED_SIZE");

  expect(
    result.lengthAssessment.result.assessments.map(
      (item) => ({
        id: item.sizeId,
        label: item.sizeLabel,
        status: item.assessment.status,
      })
    )
  ).toEqual([
    {
      id: "size-54",
      label: "54",
      status: "SHORTER_THAN_PREFERENCE",
    },
    {
      id: "size-56",
      label: "56",
      status: "SHORTER_THAN_PREFERENCE",
    },
    {
      id: "size-58",
      label: "58",
      status: "MATCH",
    },
    {
      id: "size-60",
      label: "60",
      status: "LONGER_THAN_PREFERENCE",
    },
  ]);
});
it("returns factual Hijab dimensions without turning them into a conventional size recommendation", async () => {
  mockLoadProductRecommendationData.mockResolvedValue({
    productType: ProductType.HIJAB,

    productTypes: [
      {
        productType: ProductType.HIJAB,
      },
    ],

    lengthStructure: null,
    lengthOptions: [],

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
          sourceUnit: "CM",
        },
        {
          type: FitMeasurementType.WIDTH,
          component:
            FitGarmentComponent.HIJAB,

          minValueCm: decimal(70),
          maxValueCm: decimal(70),

          sourceMinValue: decimal(70),
          sourceMaxValue: decimal(70),
          sourceUnit: "CM",
        },
      ],
    },

    productSizes: [],
  } as never);

  mockLoadShopperRecommendationData.mockResolvedValue(
    makeShopper() as never
  );

  const result =
    await getProductSizeRecommendation({
      productId: "hijab-one-size",
      shopperId: "shopper-1",
    });

  expect(result.status).toBe("ASSESSED");

  if (result.status !== "ASSESSED") {
    throw new Error(
      "Expected Hijab product to reach the assessed service path"
    );
  }

  /*
   * Hijab dimensions are factual product information.
   *
   * They must never create a conventional S/M/L-style
   * size recommendation.
   */
  expect(
  result.recommendation.status
).toBe(
  "SIZE_RECOMMENDATION_NOT_APPLICABLE"
);

  expect(
    result.productDimensions
  ).toEqual({
    state: "AVAILABLE",
    productType: ProductType.HIJAB,
    source: null,

    dimensions: [
      {
        type:
          FitMeasurementType.GARMENT_LENGTH,
        minValueCm: 180,
        maxValueCm: 180,
      },
      {
        type:
          FitMeasurementType.WIDTH,
        minValueCm: 70,
        maxValueCm: 70,
      },
    ],
  });

  /*
   * Factual dimensions must remain independent from
   * shopper-specific length assessment as well.
   */
  expect(
    result.lengthAssessment.result.status
  ).not.toBe("ASSESSED");
});

 });
