import { describe, expect, it } from "vitest";

import {
  FabricStretch,
  FitGarmentComponent,
  FitMeasurementBasis,
  FitMeasurementRangeType,
  FitMeasurementType,
  ProductIntendedFit,
  ProductType,
  ShopperFitPreference,
} from "@prisma/client";

import {
  assessProductSizes,
  assessSize,
  type ProductSizeRecommendationInput,
} from "@/lib/fit/recommendation";

import type {
  EasePolicy,
} from "@/lib/fit/easePolicy";

function bodyMeasurement(
  type: FitMeasurementType,
  minValueCm: number,
  maxValueCm: number,
  component: FitGarmentComponent =  FitGarmentComponent.DRESS,
  rangeType: FitMeasurementRangeType = FitMeasurementRangeType.RANGE
) {
  return {
    type,
    component,
    rangeType,
    minValueCm,
    maxValueCm,
  };
}

function productMeasurement(
  type: FitMeasurementType,
  minValueCm: number,
  maxValueCm: number,
  basis: FitMeasurementBasis,
  component: FitGarmentComponent =  FitGarmentComponent.DRESS,
  rangeType: FitMeasurementRangeType = FitMeasurementRangeType.RANGE
) {
  return {
    type,
    component,
    measurementBasis: basis,
    rangeType,
    minValueCm,
    maxValueCm,
  };
}

function dressSize(args: {
  sizeId: string;
  sizeLabel: string;
  bust: [number, number];
  waist: [number, number];
  hip: [number, number];
}) {
  return {
    sizeId: args.sizeId,
    sizeLabel: args.sizeLabel,
    chartSortOrder: null,

    productSizeMeasurements: [
  productMeasurement(
    FitMeasurementType.BUST,
    args.bust[0],
    args.bust[1],
    FitMeasurementBasis.BODY
  ),
  productMeasurement(
    FitMeasurementType.WAIST,
    args.waist[0],
    args.waist[1],
    FitMeasurementBasis.BODY
  ),
  productMeasurement(
    FitMeasurementType.HIP,
    args.hip[0],
    args.hip[1],
    FitMeasurementBasis.BODY
  ),
],

    mappedChart: null,
  };
}

function evidenceDerivedDressSize(args: {
  sizeId: string;
  sizeLabel: string;
  bodyBust: [number, number];
  bodyWaist: [number, number];
  bodyHip: [number, number];

  garmentBust: [number, number];
  garmentWaist: [number, number];
  garmentHip: [number, number];
}) {
  return {
    sizeId: args.sizeId,
    sizeLabel: args.sizeLabel,
    chartSortOrder: null,


    productSizeMeasurements: [],
    mappedChart: null,

    bodyMappedChart: {
      measurementBasis:
        FitMeasurementBasis.BODY,

      measurements: [
        bodyMeasurement(
          FitMeasurementType.BUST,
          args.bodyBust[0],
          args.bodyBust[1]
        ),
        bodyMeasurement(
          FitMeasurementType.WAIST,
          args.bodyWaist[0],
          args.bodyWaist[1]
        ),
        bodyMeasurement(
          FitMeasurementType.HIP,
          args.bodyHip[0],
          args.bodyHip[1]
        ),
      ],
    },

    garmentMappedChart: {
      measurementBasis:
        FitMeasurementBasis.GARMENT,

      measurements: [
        bodyMeasurement(
          FitMeasurementType.BUST,
          args.garmentBust[0],
          args.garmentBust[1]
        ),
        bodyMeasurement(
          FitMeasurementType.WAIST,
          args.garmentWaist[0],
          args.garmentWaist[1]
        ),
        bodyMeasurement(
          FitMeasurementType.HIP,
          args.garmentHip[0],
          args.garmentHip[1]
        ),
      ],
    },
  };
}

function baseDressProduct(): Omit<
  ProductSizeRecommendationInput,
  "sizes"
> {
  return {
    productType: ProductType.DRESS,

    intendedFit:
      ProductIntendedFit.REGULAR,

    stretch: FabricStretch.NONE,

    shopperFitPreference:
      ShopperFitPreference.REGULAR,

    productMeasurementBasis:
      FitMeasurementBasis.BODY,

    shopperMeasurements: [
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
    ],
  };
}

const TEST_GARMENT_EASE_POLICIES: readonly EasePolicy[] = [
  {
    productType: ProductType.DRESS,
    measurementType: FitMeasurementType.BUST,
    intendedFit: ProductIntendedFit.REGULAR,
    stretch: FabricStretch.NONE,
    shopperFitPreference:
      ShopperFitPreference.REGULAR,

    acceptableEase: {
      minEaseCm: 4,
      maxEaseCm: 8,
    },

    provenance: {
      source: "VEILORA_CALIBRATION",
      rationale:
        "Test-only policy for recommendation pipeline verification.",
      version: 1,
      reviewedAt: "2026-09-26",
    },
  },

  {
    productType: ProductType.DRESS,
    measurementType: FitMeasurementType.WAIST,
    intendedFit: ProductIntendedFit.REGULAR,
    stretch: FabricStretch.NONE,
    shopperFitPreference:
      ShopperFitPreference.REGULAR,

    acceptableEase: {
      minEaseCm: 2,
      maxEaseCm: 6,
    },

    provenance: {
      source: "VEILORA_CALIBRATION",
      rationale:
        "Test-only policy for recommendation pipeline verification.",
      version: 1,
      reviewedAt: "2026-09-26",
    },
  },

  {
    productType: ProductType.DRESS,
    measurementType: FitMeasurementType.HIP,
    intendedFit: ProductIntendedFit.REGULAR,
    stretch: FabricStretch.NONE,
    shopperFitPreference:
      ShopperFitPreference.REGULAR,

    acceptableEase: {
      minEaseCm: 4,
      maxEaseCm: 8,
    },

    provenance: {
      source: "VEILORA_CALIBRATION",
      rationale:
        "Test-only policy for recommendation pipeline verification.",
      version: 1,
      reviewedAt: "2026-09-26",
    },
  },
];

describe("Veilora Fit recommendation engine", () => {
  describe("BODY measurement assessment", () => {
    it("marks a size suitable when all required BODY measurements match", () => {
      const result = assessSize({
        ...baseDressProduct(),

        sizeId: "m",
        sizeLabel: "M",

        productSizeMeasurements: [
          productMeasurement(
            FitMeasurementType.BUST,
            88,
            92,
            FitMeasurementBasis.BODY
          ),
          productMeasurement(
            FitMeasurementType.WAIST,
            70,
            74,
            FitMeasurementBasis.BODY
          ),
          productMeasurement(
            FitMeasurementType.HIP,
            96,
            100,
            FitMeasurementBasis.BODY
          ),
        ],

        mappedChart: null,
      });

      expect(result.status).toBe("SUITABLE");

      expect(
        result.requiredMeasurements.every(
          (measurement) =>
            measurement.comparison?.status ===
            "MATCH"
        )
      ).toBe(true);
    });

    it("marks a size unsuitable when a required BODY measurement is above the range", () => {
      const result = assessSize({
        ...baseDressProduct(),

        sizeId: "s",
        sizeLabel: "S",

        productSizeMeasurements: [
          productMeasurement(
            FitMeasurementType.BUST,
            84,
            88,
            FitMeasurementBasis.BODY
          ),
          productMeasurement(
            FitMeasurementType.WAIST,
            68,
            72,
            FitMeasurementBasis.BODY
          ),
          productMeasurement(
            FitMeasurementType.HIP,
            92,
            96,
            FitMeasurementBasis.BODY
          ),
        ],

        mappedChart: null,
      });

      expect(result.status).toBe(
        "UNSUITABLE"
      );

      expect(
        result.requiredMeasurements.some(
          (measurement) =>
            measurement.comparison?.status ===
            "ABOVE_RANGE"
        )
      ).toBe(true);
    });

    it("marks a size unsuitable when a required BODY measurement is below the range", () => {
      const result = assessSize({
        ...baseDressProduct(),

        sizeId: "l",
        sizeLabel: "L",

        productSizeMeasurements: [
          productMeasurement(
            FitMeasurementType.BUST,
            94,
            98,
            FitMeasurementBasis.BODY
          ),
          productMeasurement(
            FitMeasurementType.WAIST,
            76,
            80,
            FitMeasurementBasis.BODY
          ),
          productMeasurement(
            FitMeasurementType.HIP,
            102,
            106,
            FitMeasurementBasis.BODY
          ),
        ],

        mappedChart: null,
      });

      expect(result.status).toBe(
        "UNSUITABLE"
      );

      expect(
        result.requiredMeasurements.some(
          (measurement) =>
            measurement.comparison?.status ===
            "BELOW_RANGE"
        )
      ).toBe(true);
    });

    it("returns insufficient evidence when a required shopper measurement is missing", () => {
      const result = assessSize({
        ...baseDressProduct(),

        shopperMeasurements: [
          {
            type: FitMeasurementType.BUST,
            valueCm: 90,
          },
          {
            type: FitMeasurementType.WAIST,
            valueCm: 72,
          },
        ],

        sizeId: "m",
        sizeLabel: "M",

        productSizeMeasurements: [
  productMeasurement(
    FitMeasurementType.BUST,
    88,
    92,
    FitMeasurementBasis.BODY
  ),
  productMeasurement(
    FitMeasurementType.WAIST,
    70,
    74,
    FitMeasurementBasis.BODY
  ),
  productMeasurement(
    FitMeasurementType.HIP,
    96,
    100,
    FitMeasurementBasis.BODY
  ),
],

        mappedChart: null,
      });

      expect(result.status).toBe(
        "INSUFFICIENT_EVIDENCE"
      );
    });

    it("returns insufficient evidence when required catalogue evidence is missing", () => {
      const result = assessSize({
        ...baseDressProduct(),

        sizeId: "m",
        sizeLabel: "M",

        productSizeMeasurements: [
  productMeasurement(
    FitMeasurementType.BUST,
    88,
    92,
    FitMeasurementBasis.BODY
  ),
  productMeasurement(
    FitMeasurementType.WAIST,
    70,
    74,
    FitMeasurementBasis.BODY
  ),
],

        mappedChart: null,
      });

      expect(result.status).toBe(
        "INSUFFICIENT_EVIDENCE"
      );
    });

    it("does not interpret UNKNOWN measurement basis as BODY evidence", () => {
      const result = assessSize({
        ...baseDressProduct(),

        productMeasurementBasis:
          FitMeasurementBasis.UNKNOWN,

        sizeId: "m",
        sizeLabel: "M",

        productSizeMeasurements: [
  productMeasurement(
    FitMeasurementType.BUST,
    88,
    92,
    FitMeasurementBasis.UNKNOWN
  ),
  productMeasurement(
    FitMeasurementType.WAIST,
    70,
    74,
    FitMeasurementBasis.UNKNOWN
  ),
  productMeasurement(
    FitMeasurementType.HIP,
    96,
    100,
    FitMeasurementBasis.UNKNOWN
  ),
],

        mappedChart: null,
      });

      expect(result.status).toBe(
        "INSUFFICIENT_EVIDENCE"
      );
    });
  });

  describe("GARMENT evidence", () => {
    it("does not directly compare GARMENT measurements as BODY ranges", () => {
      const result = assessSize({
        ...baseDressProduct(),

        productMeasurementBasis:
          FitMeasurementBasis.GARMENT,

        sizeId: "m",
        sizeLabel: "M",

        productSizeMeasurements: [
  productMeasurement(
    FitMeasurementType.BUST,
    94,
    94,
    FitMeasurementBasis.GARMENT
  ),
  productMeasurement(
    FitMeasurementType.WAIST,
    78,
    78,
    FitMeasurementBasis.GARMENT
  ),
  productMeasurement(
    FitMeasurementType.HIP,
    104,
    104,
    FitMeasurementBasis.GARMENT
  ),
],

        mappedChart: null,
      });

      expect(result.status).toBe(
        "INSUFFICIENT_EVIDENCE"
      );

      expect(
        result.requiredMeasurements.every(
          (measurement) =>
            measurement.comparison?.status ===
            "REQUIRES_EASE_INTERPRETATION"
        )
      ).toBe(true);
    });

    it("keeps the RÃƒâ€¦DA garment-chart case unresolved instead of declaring the shopper too large", () => {
      const result = assessSize({
        productType: ProductType.DRESS,

        sizeId: "xl",
        sizeLabel: "XL",

        intendedFit:
          ProductIntendedFit.REGULAR,

        stretch: FabricStretch.NONE,

        shopperFitPreference:
          ShopperFitPreference.REGULAR,

        productMeasurementBasis:
          FitMeasurementBasis.GARMENT,

        shopperMeasurements: [
          {
            type: FitMeasurementType.BUST,
            valueCm: 99.06,
          },
          {
            type: FitMeasurementType.WAIST,
            valueCm: 73.66,
          },
          {
            type: FitMeasurementType.HIP,
            valueCm: 101.6,
          },
        ],

        productSizeMeasurements: [],

        mappedChart: {
          measurementBasis:
            FitMeasurementBasis.GARMENT,

          measurements: [
            bodyMeasurement(
              FitMeasurementType.BUST,
              98,
              98
            ),
            bodyMeasurement(
              FitMeasurementType.WAIST,
              85,
              85
            ),
            bodyMeasurement(
              FitMeasurementType.HIP,
              108,
              108
            ),
          ],
        },
      });

      expect(result.status).toBe(
        "INSUFFICIENT_EVIDENCE"
      );

      const bust =
        result.requiredMeasurements.find(
          (measurement) =>
            measurement.requirement.type ===
            FitMeasurementType.BUST
        );

      expect(bust?.comparison?.status).toBe(
        "REQUIRES_EASE_INTERPRETATION"
      );

      expect(
        bust?.comparison?.status
      ).not.toBe("ABOVE_RANGE");

      expect(bust?.easePolicy?.status).toBe(
        "NOT_FOUND"
      );
    });
    it("does not let calibrated GARMENT-only policies replace required BODY evidence", () => {
  const result = assessSize({
    ...baseDressProduct(),

    productMeasurementBasis:
      FitMeasurementBasis.GARMENT,

    easePolicies:
      TEST_GARMENT_EASE_POLICIES,

    sizeId: "m",
    sizeLabel: "M",

    productSizeMeasurements: [
      productMeasurement(
        FitMeasurementType.BUST,
        96,
        98,
        FitMeasurementBasis.GARMENT
      ),
      productMeasurement(
        FitMeasurementType.WAIST,
        76,
        78,
        FitMeasurementBasis.GARMENT
      ),
      productMeasurement(
        FitMeasurementType.HIP,
        104,
        106,
        FitMeasurementBasis.GARMENT
      ),
    ],

    mappedChart: null,
  });

  expect(result.status).toBe("INSUFFICIENT_EVIDENCE");

  expect(
    result.requiredMeasurements.every(
      (measurement) =>
        measurement.easePolicy?.status ===
          "FOUND" &&
        measurement.garmentEase?.status ===
          "MATCH"
    )
  ).toBe(true);
});

it("does not let a negative-ease GARMENT-only policy create a recommendation without BODY evidence", () => {
  const negativeEasePolicies: readonly EasePolicy[] = [
    {
      productType: ProductType.DRESS,
      measurementType: FitMeasurementType.BUST,
      intendedFit: ProductIntendedFit.REGULAR,
      stretch: FabricStretch.HIGH,
      shopperFitPreference:
        ShopperFitPreference.REGULAR,

      acceptableEase: {
        minEaseCm: -6,
        maxEaseCm: -2,
      },

      provenance: {
        source: "VEILORA_CALIBRATION",
        rationale:
          "Test-only policy proving negative bust ease can be accepted when explicitly supported.",
        version: 1,
        reviewedAt: "2026-09-26",
      },
    },

    {
      productType: ProductType.DRESS,
      measurementType: FitMeasurementType.WAIST,
      intendedFit: ProductIntendedFit.REGULAR,
      stretch: FabricStretch.HIGH,
      shopperFitPreference:
        ShopperFitPreference.REGULAR,

      acceptableEase: {
        minEaseCm: -4,
        maxEaseCm: 0,
      },

      provenance: {
        source: "VEILORA_CALIBRATION",
        rationale:
          "Test-only policy proving negative waist ease can be accepted when explicitly supported.",
        version: 1,
        reviewedAt: "2026-09-26",
      },
    },

    {
      productType: ProductType.DRESS,
      measurementType: FitMeasurementType.HIP,
      intendedFit: ProductIntendedFit.REGULAR,
      stretch: FabricStretch.HIGH,
      shopperFitPreference:
        ShopperFitPreference.REGULAR,

      acceptableEase: {
        minEaseCm: -6,
        maxEaseCm: -2,
      },

      provenance: {
        source: "VEILORA_CALIBRATION",
        rationale:
          "Test-only policy proving negative hip ease can be accepted when explicitly supported.",
        version: 1,
        reviewedAt: "2026-09-26",
      },
    },
  ];

  const result = assessProductSizes({
    ...baseDressProduct(),

    productMeasurementBasis:
      FitMeasurementBasis.GARMENT,

    stretch: FabricStretch.HIGH,

    easePolicies: negativeEasePolicies,

    sizes: [
      {
        sizeId: "m",
        sizeLabel: "M",
    chartSortOrder: null,

        productSizeMeasurements: [
          productMeasurement(
            FitMeasurementType.BUST,
            84,
            88,
            FitMeasurementBasis.GARMENT
          ),
          productMeasurement(
            FitMeasurementType.WAIST,
            68,
            72,
            FitMeasurementBasis.GARMENT
          ),
          productMeasurement(
            FitMeasurementType.HIP,
            92,
            96,
            FitMeasurementBasis.GARMENT
          ),
        ],

        mappedChart: null,
      },
    ],
  });
expect(result.status).toBe(
  "INSUFFICIENT_EVIDENCE"
);

expect(result.recommendedSize).toBeNull();

expect(result.suitableSizes).toHaveLength(0);

expect(result.assessments).toHaveLength(1);

const assessedSize = result.assessments[0];

expect(
  assessedSize.requiredMeasurements.every(
    (measurement) =>
      measurement.easePolicy?.status ===
        "FOUND" &&
      measurement.garmentEase?.status ===
        "MATCH" &&
      measurement.evidenceDerivedSuitability
        .status === "INSUFFICIENT_EVIDENCE"
  )
).toBe(true);
});




it("does not let calibrated GARMENT-only evidence reject a size without BODY authority", () => {
  const result = assessSize({
    ...baseDressProduct(),

    productMeasurementBasis:
      FitMeasurementBasis.GARMENT,

    easePolicies:
      TEST_GARMENT_EASE_POLICIES,

    sizeId: "s",
    sizeLabel: "S",

    productSizeMeasurements: [
      productMeasurement(
        FitMeasurementType.BUST,
        91,
        92,
        FitMeasurementBasis.GARMENT
      ),
      productMeasurement(
        FitMeasurementType.WAIST,
        74,
        76,
        FitMeasurementBasis.GARMENT
      ),
      productMeasurement(
        FitMeasurementType.HIP,
        100,
        102,
        FitMeasurementBasis.GARMENT
      ),
    ],

    mappedChart: null,
  });

  expect(result.status).toBe("INSUFFICIENT_EVIDENCE");

  expect(
    result.requiredMeasurements.some(
      (measurement) =>
        measurement.garmentEase?.status ===
        "TOO_LITTLE_EASE"
    )
  ).toBe(true);
});

it("remains insufficient when even one required GARMENT policy is unavailable", () => {
  const policiesWithoutHip =
    TEST_GARMENT_EASE_POLICIES.filter(
      (policy) =>
        policy.measurementType !==
        FitMeasurementType.HIP
    );

  const result = assessSize({
    ...baseDressProduct(),

    productMeasurementBasis:
      FitMeasurementBasis.GARMENT,

    easePolicies: policiesWithoutHip,

    sizeId: "m",
    sizeLabel: "M",

    productSizeMeasurements: [
      productMeasurement(
        FitMeasurementType.BUST,
        96,
        98,
        FitMeasurementBasis.GARMENT
      ),
      productMeasurement(
        FitMeasurementType.WAIST,
        76,
        78,
        FitMeasurementBasis.GARMENT
      ),
      productMeasurement(
        FitMeasurementType.HIP,
        104,
        106,
        FitMeasurementBasis.GARMENT
      ),
    ],

    mappedChart: null,
  });

  expect(result.status).toBe(
    "INSUFFICIENT_EVIDENCE"
  );

  const hip =
    result.requiredMeasurements.find(
      (measurement) =>
        measurement.requirement.type ===
        FitMeasurementType.HIP
    );

  expect(hip?.easePolicy?.status).toBe(
    "NOT_FOUND"
  );

  expect(hip?.garmentEase).toBeNull();
});
  });

  describe("product-level orchestration", () => {
    it("recommends the only suitable size", () => {
      const result = assessProductSizes({
        ...baseDressProduct(),

        sizes: [
          dressSize({
            sizeId: "s",
            sizeLabel: "S",
            bust: [84, 88],
            waist: [66, 70],
            hip: [90, 94],
          }),

          dressSize({
            sizeId: "m",
            sizeLabel: "M",
            bust: [88, 92],
            waist: [70, 74],
            hip: [96, 100],
          }),

          dressSize({
            sizeId: "l",
            sizeLabel: "L",
            bust: [94, 98],
            waist: [76, 80],
            hip: [102, 106],
          }),
        ],
      });

      expect(result.status).toBe(
        "RECOMMENDED"
      );

      expect(
        result.recommendedSize?.sizeLabel
      ).toBe("M");

      expect(result.suitableSizes).toHaveLength(
        1
      );
    });

    it("uses explicit product sizing requirements to recommend the smallest Merrachi blazer size that accommodates every required BODY dimension", () => {
  const result = assessProductSizes({
    productType: ProductType.BLAZER,

    intendedFit:
      ProductIntendedFit.REGULAR,

    stretch: FabricStretch.NONE,

    shopperFitPreference:
      ShopperFitPreference.REGULAR,

    productMeasurementBasis:
      FitMeasurementBasis.BODY,

    explicitRequiredBodyFit: [
      {
        type: FitMeasurementType.BUST,
        component:
          FitGarmentComponent.JACKET,
      },
      {
        type: FitMeasurementType.WAIST,
        component:
          FitGarmentComponent.JACKET,
      },
      {
        type: FitMeasurementType.HIP,
        component:
          FitGarmentComponent.JACKET,
      },
    ],

    shopperMeasurements: [
      {
        type: FitMeasurementType.BUST,
        valueCm: 94,
      },
      {
        type: FitMeasurementType.WAIST,
        valueCm: 87,
      },
      {
        type: FitMeasurementType.HIP,
        valueCm: 112,
      },
    ],

    sizes: [
      {
        sizeId: "m",
        sizeLabel: "M",
    chartSortOrder: null,

        productSizeMeasurements: [
          productMeasurement(
  FitMeasurementType.BUST,
  94,
  94,
  FitMeasurementBasis.BODY,
  FitGarmentComponent.JACKET,
  FitMeasurementRangeType.UPPER_BOUND
),
productMeasurement(
  FitMeasurementType.WAIST,
  79,
  79,
  FitMeasurementBasis.BODY,
  FitGarmentComponent.JACKET,
  FitMeasurementRangeType.UPPER_BOUND
),
productMeasurement(
  FitMeasurementType.HIP,
  104,
  104,
  FitMeasurementBasis.BODY,
  FitGarmentComponent.JACKET,
  FitMeasurementRangeType.UPPER_BOUND
),
        ],

        mappedChart: null,
      },

      {
        sizeId: "l",
        sizeLabel: "L",
    chartSortOrder: null,

        productSizeMeasurements: [
          productMeasurement(
  FitMeasurementType.BUST,
  102,
  102,
  FitMeasurementBasis.BODY,
  FitGarmentComponent.JACKET,
  FitMeasurementRangeType.UPPER_BOUND
),
productMeasurement(
  FitMeasurementType.WAIST,
  87,
  87,
  FitMeasurementBasis.BODY,
  FitGarmentComponent.JACKET,
  FitMeasurementRangeType.UPPER_BOUND
),
productMeasurement(
  FitMeasurementType.HIP,
  112,
  112,
  FitMeasurementBasis.BODY,
  FitGarmentComponent.JACKET,
  FitMeasurementRangeType.UPPER_BOUND
),
        ],

        mappedChart: null,
      },
    ],
  });

  expect(result.status).toBe("RECOMMENDED");

  expect(
    result.recommendedSize?.sizeLabel
  ).toBe("L");

  expect(result.suitableSizes).toHaveLength(1);

  const medium =
    result.assessments.find(
      (assessment) =>
        assessment.sizeId === "m"
    );

  const large =
    result.assessments.find(
      (assessment) =>
        assessment.sizeId === "l"
    );

  expect(medium).toBeDefined();
  expect(large).toBeDefined();

  if (!medium || !large) {
    throw new Error(
      "Expected both Merrachi sizes to be assessed"
    );
  }

  expect(medium.status).toBe("UNSUITABLE");
  expect(large.status).toBe("SUITABLE");

  expect(
    medium.requiredMeasurements.map(
      (measurement) => ({
        type: measurement.requirement.type,
        component:
          measurement.requirement.component,
        status:
          measurement.comparison?.status,
      })
    )
  ).toEqual([
    {
      type: FitMeasurementType.BUST,
      component:
        FitGarmentComponent.JACKET,
      status: "MATCH",
    },
    {
      type: FitMeasurementType.WAIST,
      component:
        FitGarmentComponent.JACKET,
      status: "ABOVE_RANGE",
    },
    {
      type: FitMeasurementType.HIP,
      component:
        FitGarmentComponent.JACKET,
      status: "ABOVE_RANGE",
    },
  ]);
});
it("recommends a shirt using only the BODY measurements required by the brand", () => {
  const shirtSize = {
    sizeId: "m",
    sizeLabel: "M",
    chartSortOrder: null,

    productSizeMeasurements: [
  productMeasurement(
    FitMeasurementType.BUST,
    88,
    94,
    FitMeasurementBasis.BODY,
    FitGarmentComponent.TOP
  ),
  productMeasurement(
    FitMeasurementType.WAIST,
    70,
    76,
    FitMeasurementBasis.BODY,
    FitGarmentComponent.TOP
  ),
],

    mappedChart: null,
  };

  const input: ProductSizeRecommendationInput = {
    ...baseDressProduct(),

    productType: ProductType.TOP,

    explicitRequiredBodyFit: [
      {
        type: FitMeasurementType.BUST,
        component: FitGarmentComponent.TOP,
      },
      {
        type: FitMeasurementType.WAIST,
        component: FitGarmentComponent.TOP,
      },
    ],

    shopperMeasurements: [
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
        valueCm: 100,
      },
    ],

    sizes: [shirtSize],
  };

  const withHips = assessProductSizes(input);
  expect(withHips.status).toBe("RECOMMENDED");
  expect(withHips.recommendedSize?.sizeLabel).toBe("M");

  const withoutHips = assessProductSizes({
    ...input,
    shopperMeasurements: input.shopperMeasurements.filter(
      (measurement) =>
        measurement.type !== FitMeasurementType.HIP
    ),
  });

  expect(withoutHips.status).toBe("RECOMMENDED");
  expect(withoutHips.recommendedSize?.sizeLabel).toBe("M");
  const missingRequiredWaist = assessProductSizes({
  ...input,
  sizes: [
    {
      ...shirtSize,
      productSizeMeasurements:
        shirtSize.productSizeMeasurements.filter(
          (measurement) =>
            measurement.type !== FitMeasurementType.WAIST
        ),
    },
  ],
});

expect(missingRequiredWaist.status).toBe(
  "INSUFFICIENT_EVIDENCE"
);

expect(missingRequiredWaist.recommendedSize).toBeNull();
});
it("recommends a shirt when the brand requires only BUST", () => {
  const result = assessProductSizes({
    ...baseDressProduct(),

    productType: ProductType.TOP,

    explicitRequiredBodyFit: [
      {
        type: FitMeasurementType.BUST,
        component: FitGarmentComponent.TOP,
      },
    ],

    shopperMeasurements: [
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
        valueCm: 100,
      },
    ],

    sizes: [
      {
        sizeId: "m",
        sizeLabel: "M",
        chartSortOrder: null,

        productSizeMeasurements: [
          productMeasurement(
            FitMeasurementType.BUST,
            88,
            94,
            FitMeasurementBasis.BODY,
            FitGarmentComponent.TOP
          ),
        ],

        mappedChart: null,
      },
    ],
  });

  expect(result.status).toBe("RECOMMENDED");
  expect(result.recommendedSize?.sizeLabel).toBe("M");
});

    it("preserves ambiguity when multiple sizes are suitable", () => {
      const result = assessProductSizes({
        ...baseDressProduct(),

        sizes: [
          dressSize({
            sizeId: "m",
            sizeLabel: "M",
            bust: [88, 92],
            waist: [70, 74],
            hip: [96, 100],
          }),

          dressSize({
            sizeId: "m-l",
            sizeLabel: "M/L",
            bust: [89, 94],
            waist: [71, 76],
            hip: [97, 103],
          }),
        ],
      });

      expect(result.status).toBe(
        "MULTIPLE_SUITABLE"
      );
      expect(result.recommendationReason).toBeUndefined();
      expect(result.recommendedSize).toBeNull();

      expect(result.suitableSizes).toHaveLength(
        2
      );
    });

   it("uses RELAXED preference to recommend the suitable size with consistently more actual ease", () => {
  const result = assessProductSizes({
    ...baseDressProduct(),

    productMeasurementBasis:
      FitMeasurementBasis.UNKNOWN,

    shopperFitPreference:
      ShopperFitPreference.RELAXED,

    shopperMeasurements: [
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
    ],

    sizes: [
      evidenceDerivedDressSize({
        sizeId: "m",
        sizeLabel: "M",

        bodyBust: [88, 92],
        bodyWaist: [70, 74],
        bodyHip: [96, 100],

        garmentBust: [96, 100],
        garmentWaist: [78, 82],
        garmentHip: [104, 108],
      }),

      evidenceDerivedDressSize({
        sizeId: "m-l",
        sizeLabel: "M/L",

        bodyBust: [88, 92],
        bodyWaist: [70, 74],
        bodyHip: [96, 100],

        garmentBust: [98, 102],
        garmentWaist: [80, 84],
        garmentHip: [106, 110],
      }),
    ],
  });

  expect(result.status).toBe("RECOMMENDED");

if (result.status !== "RECOMMENDED") {
  throw new Error(
    "Expected a recommended size"
  );
}

expect(
  result.recommendedSize?.sizeId
).toBe("m-l");

expect(
  result.recommendationReason
).toBe("GARMENT_EASE_PREFERENCE");

expect(result.suitableSizes).toHaveLength(2);
});

it("uses CLOSER preference to recommend the suitable size with consistently less actual ease", () => {
  const result = assessProductSizes({
    ...baseDressProduct(),

    productMeasurementBasis:
      FitMeasurementBasis.UNKNOWN,

    shopperFitPreference:
      ShopperFitPreference.CLOSER,

    shopperMeasurements: [
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
    ],

    sizes: [
      evidenceDerivedDressSize({
        sizeId: "m",
        sizeLabel: "M",

        bodyBust: [88, 92],
        bodyWaist: [70, 74],
        bodyHip: [96, 100],

        garmentBust: [96, 100],
        garmentWaist: [78, 82],
        garmentHip: [104, 108],
      }),

      evidenceDerivedDressSize({
        sizeId: "m-l",
        sizeLabel: "M/L",

        bodyBust: [88, 92],
        bodyWaist: [70, 74],
        bodyHip: [96, 100],

        garmentBust: [98, 102],
        garmentWaist: [80, 84],
        garmentHip: [106, 110],
      }),
    ],
  });

  expect(result.status).toBe("RECOMMENDED");

  if (result.status !== "RECOMMENDED") {
    throw new Error(
      "Expected a recommended size"
    );
  }

  expect(
    result.recommendedSize?.sizeId
  ).toBe("m");

  expect(result.suitableSizes).toHaveLength(2);
});

it("preserves multiple suitable sizes for REGULAR when there is no evidence-backed cross-size target", () => {
  const result = assessProductSizes({
    ...baseDressProduct(),

    productMeasurementBasis:
      FitMeasurementBasis.UNKNOWN,

    shopperFitPreference:
      ShopperFitPreference.REGULAR,

    shopperMeasurements: [
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
    ],

    sizes: [
      evidenceDerivedDressSize({
        sizeId: "m",
        sizeLabel: "M",

        bodyBust: [88, 92],
        bodyWaist: [70, 74],
        bodyHip: [96, 100],

        garmentBust: [96, 100],
        garmentWaist: [78, 82],
        garmentHip: [104, 108],
      }),

      evidenceDerivedDressSize({
        sizeId: "m-l",
        sizeLabel: "M/L",

        bodyBust: [88, 92],
        bodyWaist: [70, 74],
        bodyHip: [96, 100],

        garmentBust: [98, 102],
        garmentWaist: [80, 84],
        garmentHip: [106, 110],
      }),
    ],
  });

  expect(result.status).toBe(
    "MULTIPLE_SUITABLE"
  );

  expect(result.recommendedSize).toBeNull();

  expect(
    result.suitableSizes.map(
      (size) => size.sizeId
    )
  ).toEqual(["m", "m-l"]);
});

it("preserves multiple suitable sizes when CLOSER preference trades off across required fit dimensions", () => {
  const result = assessProductSizes({
    ...baseDressProduct(),

    productMeasurementBasis:
      FitMeasurementBasis.UNKNOWN,

    shopperFitPreference:
      ShopperFitPreference.CLOSER,

    shopperMeasurements: [
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
    ],

    sizes: [
      evidenceDerivedDressSize({
        sizeId: "m",
        sizeLabel: "M",

        bodyBust: [88, 92],
        bodyWaist: [70, 74],
        bodyHip: [96, 100],

        garmentBust: [96, 100],
        garmentWaist: [80, 84],
        garmentHip: [104, 108],
      }),

      evidenceDerivedDressSize({
        sizeId: "m-l",
        sizeLabel: "M/L",

        bodyBust: [88, 92],
        bodyWaist: [70, 74],
        bodyHip: [96, 100],

        garmentBust: [98, 102],
        garmentWaist: [78, 82],
        garmentHip: [106, 110],
      }),
    ],
  });

  expect(result.status).toBe(
    "MULTIPLE_SUITABLE"
  );

  expect(result.recommendedSize).toBeNull();

  expect(
    result.suitableSizes.map(
      (size) => size.sizeId
    )
  ).toEqual(["m", "m-l"]);
});



it("does not treat a size as suitable when verified BODY evidence excludes the shopper even if BODY and GARMENT evidence can produce a designed-fit assessment", () => {
  const result = assessSize({
    ...baseDressProduct(),

    productMeasurementBasis:
      FitMeasurementBasis.UNKNOWN,

    shopperFitPreference:
      ShopperFitPreference.REGULAR,

    shopperMeasurements: [
      {
        type: FitMeasurementType.BUST,
        valueCm: 94,
      },
      {
        type: FitMeasurementType.WAIST,
        valueCm: 72,
      },
      {
        type: FitMeasurementType.HIP,
        valueCm: 98,
      },
    ],

    sizeId: "m",
    sizeLabel: "M",

    productSizeMeasurements: [],
    mappedChart: null,

    bodyMappedChart: {
      measurementBasis:
        FitMeasurementBasis.BODY,

      measurements: [
        bodyMeasurement(
          FitMeasurementType.BUST,
          88,
          92
        ),
        bodyMeasurement(
          FitMeasurementType.WAIST,
          70,
          74
        ),
        bodyMeasurement(
          FitMeasurementType.HIP,
          96,
          100
        ),
      ],
    },

    garmentMappedChart: {
      measurementBasis:
        FitMeasurementBasis.GARMENT,

      measurements: [
        bodyMeasurement(
          FitMeasurementType.BUST,
          98,
          102
        ),
        bodyMeasurement(
          FitMeasurementType.WAIST,
          78,
          82
        ),
        bodyMeasurement(
          FitMeasurementType.HIP,
          104,
          108
        ),
      ],
    },
  });

  const bust =
    result.requiredMeasurements.find(
      (measurement) =>
        measurement.requirement.type ===
        FitMeasurementType.BUST
    );

  expect(bust).toBeDefined();

  if (!bust) {
    throw new Error(
      "Expected required BUST assessment"
    );
  }

  /*
   * The shopper's bust is 94 cm while the verified
   * BODY range for this size is 88Ã¢â‚¬â€œ92 cm.
   *
   * Complete GARMENT evidence must not override
   * that direct BODY incompatibility.
   */
  expect(bust.evidence.body.status).toBe(
    "RESOLVED"
  );

  expect(result.status).toBe("UNSUITABLE");
});
    it("returns no suitable size only when every size has sufficient evidence and is unsuitable", () => {
      const result = assessProductSizes({
        ...baseDressProduct(),

        sizes: [
          dressSize({
            sizeId: "xs",
            sizeLabel: "XS",
            bust: [80, 84],
            waist: [62, 66],
            hip: [86, 90],
          }),

          dressSize({
            sizeId: "s",
            sizeLabel: "S",
            bust: [84, 88],
            waist: [66, 70],
            hip: [90, 94],
          }),
        ],
      });

      expect(result.status).toBe(
        "NO_SUITABLE_SIZE"
      );
    });

    it("does not claim no suitable size when a candidate has insufficient evidence", () => {
      const result = assessProductSizes({
        ...baseDressProduct(),

        sizes: [
          dressSize({
            sizeId: "s",
            sizeLabel: "S",
            bust: [84, 88],
            waist: [66, 70],
            hip: [90, 94],
          }),

          {
            sizeId: "m",
            sizeLabel: "M",
    chartSortOrder: null,

            productSizeMeasurements: [
              productMeasurement(
                FitMeasurementType.BUST,
                88,
                92,
                FitMeasurementBasis.GARMENT
              ),
              productMeasurement(
                FitMeasurementType.WAIST,
                70,
                74,
                FitMeasurementBasis.GARMENT
              ),
              // HIP intentionally missing.
            ],

            mappedChart: null,
          },
        ],
      });

      expect(result.status).toBe(
        "INSUFFICIENT_EVIDENCE"
      );
    });

    it("returns insufficient evidence when the product has no sizes", () => {
      const result = assessProductSizes({
        ...baseDressProduct(),
        sizes: [],
      });

      expect(result.status).toBe(
        "INSUFFICIENT_EVIDENCE"
      );

      expect(result.assessments).toHaveLength(
        0
      );
    });

    it("does not run conventional size recommendation for hijabs", () => {
      const result = assessProductSizes({
        productType: ProductType.HIJAB,

        intendedFit: null,

        stretch: FabricStretch.UNKNOWN,

        shopperFitPreference:
          ShopperFitPreference.REGULAR,

        productMeasurementBasis:
          FitMeasurementBasis.GARMENT,

        shopperMeasurements: [],

        sizes: [
          {
            sizeId: "one-size",
            sizeLabel: "One Size",
    chartSortOrder: null,
            productSizeMeasurements: [],
            mappedChart: null,
          },
        ],
      });

      expect(result.status).toBe(
        "SIZE_RECOMMENDATION_NOT_APPLICABLE"
      );

      expect(result.recommendedSize).toBeNull();
      expect(result.assessments).toHaveLength(
        0
      );
    });

    it("carries an evidence-derived fit assessment through assessSize", () => {
  const result = assessSize({
    productType: "DRESS",
    sizeId: "m",
    sizeLabel: "M",

    intendedFit: "REGULAR",
    stretch: "NONE",
    shopperFitPreference: "REGULAR",

    productMeasurementBasis: "GARMENT",

    shopperMeasurements: [
      { type: "BUST", valueCm: 89 },
      { type: "WAIST", valueCm: 71 },
      { type: "HIP", valueCm: 97 },
    ],

    productSizeMeasurements: [],

    mappedChart: {
      measurementBasis: "GARMENT",
      measurements: [
        {
          type: "BUST",
          component: "DRESS",
          rangeType: FitMeasurementRangeType.RANGE,
          minValueCm: 96,
          maxValueCm: 98,
        },
        {
          type: "WAIST",
          component: "DRESS",
          rangeType: FitMeasurementRangeType.RANGE,
          minValueCm: 78,
          maxValueCm: 80,
        },
        {
          type: "HIP",
          component: "DRESS",
          rangeType: FitMeasurementRangeType.RANGE,
          minValueCm: 104,
          maxValueCm: 106,
        },
      ],
    },
  });

  const bust = result.requiredMeasurements.find(
    (assessment) =>
      assessment.requirement.type === "BUST"
  );

  expect(bust).toBeDefined();

  if (!bust) {
    throw new Error(
      "Expected required BUST assessment"
    );
  }

  expect(bust.evidence.garment.status).toBe(
    "RESOLVED"
  );

  /*
   * This chart only supplies GARMENT evidence.
   * Therefore designed ease must remain unavailable
   * because BODY reference evidence is absent.
   */
  expect(
    bust.evidenceDerivedFit.status
  ).toBe("INSUFFICIENT_EVIDENCE");

  if (
    bust.evidenceDerivedFit.status !==
    "INSUFFICIENT_EVIDENCE"
  ) {
    throw new Error(
      "Expected insufficient evidence"
    );
  }

  expect(
    bust.evidenceDerivedFit.reason
  ).toBe("DESIGNED_EASE_UNAVAILABLE");
});

it("does not let observational evidence-derived fit change the existing size status yet", () => {
  const result = assessSize({
    productType: "DRESS",
    sizeId: "m",
    sizeLabel: "M",

    intendedFit: "REGULAR",
    stretch: "NONE",
    shopperFitPreference: "REGULAR",

    productMeasurementBasis: "GARMENT",

    shopperMeasurements: [
      { type: "BUST", valueCm: 89 },
      { type: "WAIST", valueCm: 71 },
      { type: "HIP", valueCm: 97 },
    ],

    productSizeMeasurements: [],

    mappedChart: {
      measurementBasis: "GARMENT",
      measurements: [
        {
          type: "BUST",
          component: "WHOLE_GARMENT",
          rangeType: FitMeasurementRangeType.RANGE,
          minValueCm: 96,
          maxValueCm: 98,
        },
        {
          type: "WAIST",
          component: "WHOLE_GARMENT",
          rangeType: FitMeasurementRangeType.RANGE,
          minValueCm: 78,
          maxValueCm: 80,
        },
        {
          type: "HIP",
          component: "WHOLE_GARMENT",
          rangeType: FitMeasurementRangeType.RANGE,
          minValueCm: 104,
          maxValueCm: 106,
        },
      ],
    },
  });

  /*
   * Production EASE_POLICIES is intentionally empty.
   * The legacy path therefore cannot establish
   * garment suitability.
   *
   * The new evidence-derived assessment must not
   * silently change that status during this
   * observational integration stage.
   */
  expect(result.status).toBe(
    "INSUFFICIENT_EVIDENCE"
  );
});

it("carries complete BODY and GARMENT evidence through the recommendation assessment", () => {
  const result = assessSize({
    productType: "DRESS",
    sizeId: "m",
    sizeLabel: "M",

    intendedFit: "REGULAR",
    stretch: "NONE",
    shopperFitPreference: "REGULAR",

    /*
     * Kept for compatibility with the current
     * AssessSizeInput while the engine migrates to
     * parallel basis-specific evidence.
     */
    productMeasurementBasis: "UNKNOWN",

    shopperMeasurements: [
      { type: "BUST", valueCm: 89 },
      { type: "WAIST", valueCm: 71 },
      { type: "HIP", valueCm: 97 },
    ],

    productSizeMeasurements: [],

    mappedChart: null,

    bodyMappedChart: {
      measurementBasis: "BODY",
      measurements: [
        {
          type: "BUST",
          component: "DRESS",
          rangeType: FitMeasurementRangeType.RANGE,
          minValueCm: 88,
          maxValueCm: 90,
        },
        {
          type: "WAIST",
          component: "DRESS",
          rangeType: FitMeasurementRangeType.RANGE,
          minValueCm: 70,
          maxValueCm: 72,
        },
        {
          type: "HIP",
          component: "DRESS",
          rangeType: FitMeasurementRangeType.RANGE,
          minValueCm: 96,
          maxValueCm: 98,
        },
      ],
    },

    garmentMappedChart: {
      measurementBasis: "GARMENT",
      measurements: [
        {
          type: "BUST",
          component: "DRESS",
          rangeType: FitMeasurementRangeType.RANGE,
          minValueCm: 96,
          maxValueCm: 98,
        },
        {
          type: "WAIST",
          component: "DRESS",
          rangeType: FitMeasurementRangeType.RANGE,
          minValueCm: 78,
          maxValueCm: 80,
        },
        {
          type: "HIP",
          component: "DRESS",
          rangeType: FitMeasurementRangeType.RANGE,
          minValueCm: 104,
          maxValueCm: 106,
        },
      ],
    },
  });

  for (const assessment of result.requiredMeasurements) {

    expect(
      assessment.comparison?.status
    ).not.toBe("INSUFFICIENT_EVIDENCE");

    expect(assessment.evidence.body.status).toBe(
      "RESOLVED"
    );

    expect(assessment.evidence.garment.status).toBe(
      "RESOLVED"
    );

    expect(
      assessment.evidenceDerivedFit.status
    ).toBe("ASSESSED");

    if (
      assessment.evidenceDerivedFit.status !==
      "ASSESSED"
    ) {
      throw new Error(
        `Expected ${assessment.requirement.type} to have a complete evidence-derived assessment`
      );
    }

    expect(
      assessment.evidenceDerivedFit.comparison.status
    ).toBe("WITHIN_DESIGNED_RANGE");

    expect(
      assessment.evidenceDerivedFit.interpretation
        .relationship
    ).toBe("PRESERVES_DESIGNED_FIT");

    expect(
      assessment.evidenceDerivedFit
        .preferenceAssessment.status
    ).toBe("RANKED");

    if (
      assessment.evidenceDerivedFit
        .preferenceAssessment.status !== "RANKED"
    ) {
      throw new Error(
        `Expected ${assessment.requirement.type} preference to be ranked`
      );
    }

        expect(
      assessment.evidenceDerivedFit
        .preferenceAssessment.ranking.rank
    ).toBe(0);
  }

  /*
   * Complete BODY + GARMENT evidence is now
   * authoritative for this measurement path.
   *
   * The production legacy policy registry can remain
   * empty because the evidence-derived path has enough
   * information to establish a credible candidate.
   */
  expect(result.status).toBe("SUITABLE");
});


it("keeps calibrated GARMENT-only policy output observational when BODY evidence is absent", () => {
  const result = assessSize({
    productType: "DRESS",
    sizeId: "m",
    sizeLabel: "M",

    intendedFit: "REGULAR",
    stretch: "NONE",
    shopperFitPreference: "REGULAR",

    productMeasurementBasis: "GARMENT",

    shopperMeasurements: [
      { type: "BUST", valueCm: 90 },
      { type: "WAIST", valueCm: 72 },
      { type: "HIP", valueCm: 98 },
    ],

    productSizeMeasurements: [],

    /*
     * GARMENT-only evidence means designed ease
     * cannot be derived because BODY evidence is
     * intentionally absent.
     */
    mappedChart: {
      measurementBasis: "GARMENT",
      measurements: [
        {
          type: "BUST",
          component: "DRESS",
          rangeType: FitMeasurementRangeType.RANGE,
          minValueCm: 96,
          maxValueCm: 98,
        },
        {
          type: "WAIST",
          component: "DRESS",
          rangeType: FitMeasurementRangeType.RANGE,
          minValueCm: 78,
          maxValueCm: 80,
        },
        {
          type: "HIP",
          component: "DRESS",
          rangeType: FitMeasurementRangeType.RANGE,
          minValueCm: 104,
          maxValueCm: 106,
        },
      ],
    },

    bodyMappedChart: null,
    garmentMappedChart: null,

    easePolicies: [
  {
    productType: "DRESS",
    measurementType: "BUST",
    intendedFit: "REGULAR",
    stretch: "NONE",
    shopperFitPreference: "REGULAR",

    acceptableEase: {
      minEaseCm: 4,
      maxEaseCm: 10,
    },

    provenance: {
      source: "VEILORA_CALIBRATION",
      rationale:
        "Test-only fallback policy.",
      version: 1,
      reviewedAt: "2026-09-27",
    },
  },
  {
    productType: "DRESS",
    measurementType: "WAIST",
    intendedFit: "REGULAR",
    stretch: "NONE",
    shopperFitPreference: "REGULAR",

    acceptableEase: {
      minEaseCm: 4,
      maxEaseCm: 10,
    },

    provenance: {
      source: "VEILORA_CALIBRATION",
      rationale:
        "Test-only fallback policy.",
      version: 1,
      reviewedAt: "2026-09-27",
    },
  },
  {
    productType: "DRESS",
    measurementType: "HIP",
    intendedFit: "REGULAR",
    stretch: "NONE",
    shopperFitPreference: "REGULAR",

    acceptableEase: {
      minEaseCm: 4,
      maxEaseCm: 10,
    },

    provenance: {
      source: "VEILORA_CALIBRATION",
      rationale:
        "Test-only fallback policy.",
      version: 1,
      reviewedAt: "2026-09-27",
    },
  },
],
  });

  for (const assessment of result.requiredMeasurements) {
    expect(
      assessment.evidenceDerivedSuitability.status
    ).toBe("INSUFFICIENT_EVIDENCE");

    expect(
      assessment.evidenceDerivedSuitability.reason
    ).toBe("INSUFFICIENT_FIT_EVIDENCE");

    expect(
      assessment.easePolicy?.status
    ).toBe("FOUND");

    expect(
      assessment.garmentEase?.status
    ).toBe("MATCH");
  }

  expect(result.status).toBe("INSUFFICIENT_EVIDENCE");
});
it("allows complete BODY and GARMENT evidence to remain authoritative when the legacy mapped chart has UNKNOWN basis", () => {
  const result = assessSize({
    ...baseDressProduct(),

    productMeasurementBasis:
      FitMeasurementBasis.UNKNOWN,

    sizeId: "m",
    sizeLabel: "M",

    productSizeMeasurements: [],

    /*
     * Legacy compatibility channel deliberately has
     * evidence whose semantic basis is unresolved.
     */
    mappedChart: {
      measurementBasis:
        FitMeasurementBasis.UNKNOWN,

      measurements: [
        bodyMeasurement(
          FitMeasurementType.BUST,
          88,
          92
        ),
        bodyMeasurement(
          FitMeasurementType.WAIST,
          70,
          74
        ),
        bodyMeasurement(
          FitMeasurementType.HIP,
          96,
          100
        ),
      ],
    },

    /*
     * Canonical basis-specific evidence is complete.
     */
    bodyMappedChart: {
      measurementBasis:
        FitMeasurementBasis.BODY,

      measurements: [
        bodyMeasurement(
          FitMeasurementType.BUST,
          88,
          92
        ),
        bodyMeasurement(
          FitMeasurementType.WAIST,
          70,
          74
        ),
        bodyMeasurement(
          FitMeasurementType.HIP,
          96,
          100
        ),
      ],
    },

    garmentMappedChart: {
      measurementBasis:
        FitMeasurementBasis.GARMENT,

      measurements: [
        bodyMeasurement(
          FitMeasurementType.BUST,
          96,
          100
        ),
        bodyMeasurement(
          FitMeasurementType.WAIST,
          78,
          82
        ),
        bodyMeasurement(
          FitMeasurementType.HIP,
          104,
          108
        ),
      ],
    },
  });

  /*
   * First prove the canonical evidence-derived path
   * genuinely has enough evidence.
   */
  expect(
    result.requiredMeasurements.every(
      (assessment) =>
        assessment.evidenceDerivedSuitability
          .status === "SUITABLE"
    )
  ).toBe(true);

  /*
   * Canonical BODY + GARMENT evidence must remain
   * authoritative even though the compatibility
   * channel has UNKNOWN semantic basis.
   */
  expect(result.status).toBe("SUITABLE");
});

  });
  it("does not let a GARMENT-only calibrated candidate participate in cross-size preference ranking", () => {
  const closerEasePolicies: readonly EasePolicy[] = [
    {
      productType: ProductType.DRESS,
      measurementType: FitMeasurementType.BUST,
      intendedFit: ProductIntendedFit.REGULAR,
      stretch: FabricStretch.NONE,
      shopperFitPreference:
        ShopperFitPreference.CLOSER,

      acceptableEase: {
        minEaseCm: 4,
        maxEaseCm: 10,
      },

      provenance: {
        source: "VEILORA_CALIBRATION",
        rationale:
          "Test-only fallback policy for cross-size preference reachability.",
        version: 1,
        reviewedAt: "2026-09-27",
      },
    },
    {
      productType: ProductType.DRESS,
      measurementType: FitMeasurementType.WAIST,
      intendedFit: ProductIntendedFit.REGULAR,
      stretch: FabricStretch.NONE,
      shopperFitPreference:
        ShopperFitPreference.CLOSER,

      acceptableEase: {
        minEaseCm: 4,
        maxEaseCm: 10,
      },

      provenance: {
        source: "VEILORA_CALIBRATION",
        rationale:
          "Test-only fallback policy for cross-size preference reachability.",
        version: 1,
        reviewedAt: "2026-09-27",
      },
    },
    {
      productType: ProductType.DRESS,
      measurementType: FitMeasurementType.HIP,
      intendedFit: ProductIntendedFit.REGULAR,
      stretch: FabricStretch.NONE,
      shopperFitPreference:
        ShopperFitPreference.CLOSER,

      acceptableEase: {
        minEaseCm: 4,
        maxEaseCm: 10,
      },

      provenance: {
        source: "VEILORA_CALIBRATION",
        rationale:
          "Test-only fallback policy for cross-size preference reachability.",
        version: 1,
        reviewedAt: "2026-09-27",
      },
    },
  ];

  const result = assessProductSizes({
    ...baseDressProduct(),

    productMeasurementBasis:
      FitMeasurementBasis.UNKNOWN,

    shopperFitPreference:
      ShopperFitPreference.CLOSER,

    easePolicies: closerEasePolicies,

    sizes: [
      /*
       * Size M is suitable through complete canonical
       * BODY + GARMENT evidence and therefore has
       * calculated actual ease for every required
       * fit dimension.
       */
      evidenceDerivedDressSize({
        sizeId: "m",
        sizeLabel: "M",

        bodyBust: [88, 92],
        bodyWaist: [70, 74],
        bodyHip: [96, 100],

        garmentBust: [96, 100],
        garmentWaist: [78, 82],
        garmentHip: [104, 108],
      }),

      /*
       * Size L is suitable only through the legacy
       * calibrated GARMENT fallback.
       *
       * It deliberately lacks BODY evidence, so the
       * evidence-derived path cannot calculate
       * designed/actual fit evidence for preference
       * ranking.
       */
      {
        sizeId: "l",
        sizeLabel: "L",
    chartSortOrder: null,

        productSizeMeasurements: [],

        mappedChart: {
          measurementBasis:
            FitMeasurementBasis.GARMENT,

          measurements: [
            bodyMeasurement(
              FitMeasurementType.BUST,
              96,
              98
            ),
            bodyMeasurement(
              FitMeasurementType.WAIST,
              78,
              80
            ),
            bodyMeasurement(
              FitMeasurementType.HIP,
              104,
              106
            ),
          ],
        },

        bodyMappedChart: null,
        garmentMappedChart: null,
      },
    ],
  });

 /*
 * Only the candidate with authoritative BODY evidence
 * may participate as a suitable size.
 *
 * The GARMENT-only candidate may retain calibrated
 * policy output for diagnostics, but it cannot become
 * suitable or participate in cross-size preference
 * ranking.
 */
expect(result.suitableSizes).toHaveLength(1);

expect(result.suitableSizes[0]?.sizeId).toBe("m");

const evidenceSize =
  result.assessments.find(
    (size) => size.sizeId === "m"
  );

const garmentOnlySize =
  result.assessments.find(
    (size) => size.sizeId === "l"
  );

expect(evidenceSize).toBeDefined();
expect(garmentOnlySize).toBeDefined();

if (!evidenceSize || !garmentOnlySize) {
  throw new Error(
    "Expected both catalogue sizes to be assessed"
  );
}

expect(evidenceSize.status).toBe("SUITABLE");

expect(garmentOnlySize.status).toBe(
  "INSUFFICIENT_EVIDENCE"
);

expect(
  garmentOnlySize.requiredMeasurements.every(
    (measurement) =>
      measurement.easePolicy?.status ===
        "FOUND" &&
      measurement.garmentEase?.status ===
        "MATCH"
  )
).toBe(true);

/*
 * Because M is the only authoritative suitable size,
 * Veilora can recommend it directly. Fit preference
 * must never manufacture suitability for L.
 */
expect(result.status).toBe("RECOMMENDED");

expect(result.recommendedSize?.sizeId).toBe("m");
});

describe("SETS component-aware BODY authority", () => {
  it("recommends a TOP + SKIRT set when every required BODY measurement exists on the correct component", () => {
    const result = assessProductSizes({
      productType: ProductType.SETS,

      fitComponents: [
        FitGarmentComponent.TOP,
        FitGarmentComponent.SKIRT,
      ],

      intendedFit:
        ProductIntendedFit.REGULAR,

      stretch: FabricStretch.NONE,

      shopperFitPreference:
        ShopperFitPreference.REGULAR,

      productMeasurementBasis:
        FitMeasurementBasis.BODY,

      shopperMeasurements: [
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
      ],

      sizes: [
        {
          sizeId: "m",
          sizeLabel: "M",
    chartSortOrder: null,

          productSizeMeasurements: [
            productMeasurement(
              FitMeasurementType.BUST,
              88,
              92,
              FitMeasurementBasis.BODY,
              FitGarmentComponent.TOP
            ),
            productMeasurement(
              FitMeasurementType.WAIST,
              70,
              74,
              FitMeasurementBasis.BODY,
              FitGarmentComponent.SKIRT
            ),
            productMeasurement(
              FitMeasurementType.HIP,
              96,
              100,
              FitMeasurementBasis.BODY,
              FitGarmentComponent.SKIRT
            ),
          ],

          mappedChart: null,
        },
      ],
    });

    expect(result.status).toBe("RECOMMENDED");

    expect(result.recommendedSize?.sizeId).toBe(
      "m"
    );

    expect(result.suitableSizes).toHaveLength(1);

    const assessment = result.assessments[0];

    expect(assessment.status).toBe("SUITABLE");

    expect(
      assessment.requiredMeasurements.map(
        ({ requirement }) => ({
          type: requirement.type,
          component: requirement.component,
        })
      )
    ).toEqual([
      {
        type: FitMeasurementType.BUST,
        component: FitGarmentComponent.TOP,
      },
      {
        type: FitMeasurementType.WAIST,
        component: FitGarmentComponent.SKIRT,
      },
      {
        type: FitMeasurementType.HIP,
        component: FitGarmentComponent.SKIRT,
      },
    ]);
  });

  it("does not let BODY evidence on the wrong set component satisfy a TOP + SKIRT requirement", () => {
    const result = assessSize({
      productType: ProductType.SETS,

      fitComponents: [
        FitGarmentComponent.TOP,
        FitGarmentComponent.SKIRT,
      ],

      sizeId: "m",
      sizeLabel: "M",

      intendedFit:
        ProductIntendedFit.REGULAR,

      stretch: FabricStretch.NONE,

      shopperFitPreference:
        ShopperFitPreference.REGULAR,

      productMeasurementBasis:
        FitMeasurementBasis.BODY,

      shopperMeasurements: [
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
      ],

      productSizeMeasurements: [
        productMeasurement(
          FitMeasurementType.BUST,
          88,
          92,
          FitMeasurementBasis.BODY,
          FitGarmentComponent.TOP
        ),

        /*
         * Deliberately wrong component.
         *
         * TOP + SKIRT requires WAIST / SKIRT.
         * WAIST / TOP must not satisfy it.
         */
        productMeasurement(
          FitMeasurementType.WAIST,
          70,
          74,
          FitMeasurementBasis.BODY,
          FitGarmentComponent.TOP
        ),

        productMeasurement(
          FitMeasurementType.HIP,
          96,
          100,
          FitMeasurementBasis.BODY,
          FitGarmentComponent.SKIRT
        ),
      ],

      mappedChart: null,
    });

    expect(result.status).toBe(
      "INSUFFICIENT_EVIDENCE"
    );

    const waist =
      result.requiredMeasurements.find(
        ({ requirement }) =>
          requirement.type ===
            FitMeasurementType.WAIST &&
          requirement.component ===
            FitGarmentComponent.SKIRT
      );

    expect(waist).toBeDefined();

    if (!waist) {
      throw new Error(
        "Expected required WAIST / SKIRT assessment"
      );
    }

    expect(waist.evidence.body.status).toBe(
      "MISSING"
    );

    /*
     * Most importantly, the WAIST / TOP BODY value
     * must not leak across the set-component boundary.
     */
    expect(waist.comparison).toBeNull();
  });
});

it("recommends a TOP + TROUSER set when every required BODY measurement exists on the correct component", () => {
  const result = assessProductSizes({
    productType: ProductType.SETS,

    fitComponents: [
      FitGarmentComponent.TOP,
      FitGarmentComponent.TROUSER,
    ],

    intendedFit: ProductIntendedFit.REGULAR,
    stretch: FabricStretch.NONE,

    shopperFitPreference:
      ShopperFitPreference.REGULAR,

    productMeasurementBasis:
      FitMeasurementBasis.BODY,

   shopperMeasurements: [
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
],

    sizes: [
      {
        sizeId: "m",
        sizeLabel: "M",
    chartSortOrder: null,

        productSizeMeasurements: [
          productMeasurement(
            FitMeasurementType.BUST,
            88,
            92,
            FitMeasurementBasis.BODY,
            FitGarmentComponent.TOP
          ),

          productMeasurement(
            FitMeasurementType.WAIST,
            70,
            74,
            FitMeasurementBasis.BODY,
            FitGarmentComponent.TROUSER
          ),

          productMeasurement(
            FitMeasurementType.HIP,
            96,
            100,
            FitMeasurementBasis.BODY,
            FitGarmentComponent.TROUSER
          ),
        ],

        mappedChart: null,
      },
    ],
  });

  expect(result.status).toBe("RECOMMENDED");

  expect(result.recommendedSize?.sizeId).toBe(
    "m"
  );

  expect(result.suitableSizes).toHaveLength(1);

  const assessment = result.assessments[0];

  expect(assessment.status).toBe("SUITABLE");

  expect(
    assessment.requiredMeasurements.map(
      (measurement) => ({
        type: measurement.requirement.type,
        component:
          measurement.requirement.component,
      })
    )
  ).toEqual([
    {
      type: FitMeasurementType.BUST,
      component: FitGarmentComponent.TOP,
    },
    {
      type: FitMeasurementType.WAIST,
      component: FitGarmentComponent.TROUSER,
    },
    {
      type: FitMeasurementType.HIP,
      component: FitGarmentComponent.TROUSER,
    },
  ]);
});

it("does not let correct-component GARMENT evidence replace missing BODY evidence for a TOP + TROUSER set", () => {
  const result = assessSize({
    productType: ProductType.SETS,

    fitComponents: [
      FitGarmentComponent.TOP,
      FitGarmentComponent.TROUSER,
    ],

    sizeId: "m",
    sizeLabel: "M",

    intendedFit: ProductIntendedFit.REGULAR,
    stretch: FabricStretch.NONE,

    shopperFitPreference:
      ShopperFitPreference.REGULAR,

    productMeasurementBasis:
      FitMeasurementBasis.BODY,

    shopperMeasurements: [
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
],

    productSizeMeasurements: [
      productMeasurement(
        FitMeasurementType.BUST,
        88,
        92,
        FitMeasurementBasis.BODY,
        FitGarmentComponent.TOP
      ),

      /*
       * Deliberately GARMENT rather than BODY.
       *
       * The component is correct, but garment
       * evidence alone is not recommendation
       * authority.
       */
      productMeasurement(
        FitMeasurementType.WAIST,
        80,
        80,
        FitMeasurementBasis.GARMENT,
        FitGarmentComponent.TROUSER
      ),

      productMeasurement(
        FitMeasurementType.HIP,
        96,
        100,
        FitMeasurementBasis.BODY,
        FitGarmentComponent.TROUSER
      ),
    ],

    mappedChart: null,
  });

  expect(result.status).toBe(
    "INSUFFICIENT_EVIDENCE"
  );

  const waist =
    result.requiredMeasurements.find(
      (measurement) =>
        measurement.requirement.type ===
          FitMeasurementType.WAIST &&
        measurement.requirement.component ===
          FitGarmentComponent.TROUSER
    );

  expect(waist).toBeDefined();

  if (!waist) {
    throw new Error(
      "Expected WAIST / TROUSER assessment"
    );
  }

  expect(waist.evidence.body.status).toBe(
    "MISSING"
  );

  expect(waist.evidence.garment.status).toBe(
    "RESOLVED"
  );

  expect(waist.comparison).toEqual({
  type: FitMeasurementType.WAIST,
  shopperValueCm: 72,
  measurementRange: {
    minValueCm: 80,
    maxValueCm: 80,
  },
  basis: FitMeasurementBasis.GARMENT,
  status: "REQUIRES_EASE_INTERPRETATION",
  reason: "GARMENT_MEASUREMENT",
});

  expect(
    waist.evidenceDerivedSuitability.status
  ).toBe("INSUFFICIENT_EVIDENCE");
});
describe("ACTIVEWEAR component-aware BODY authority", () => {
  it("recommends an activewear TOP from BUST / TOP without requiring waist or hip", () => {
    const result = assessProductSizes({
      productType: ProductType.ACTIVEWEAR,

      fitComponents: [
        FitGarmentComponent.TOP,
      ],

      intendedFit:
        ProductIntendedFit.REGULAR,

      stretch: FabricStretch.NONE,

      shopperFitPreference:
        ShopperFitPreference.REGULAR,

      productMeasurementBasis:
        FitMeasurementBasis.BODY,

      shopperMeasurements: [
        {
          type: FitMeasurementType.BUST,
          valueCm: 90,
        },
      ],

      sizes: [
        {
          sizeId: "m",
          sizeLabel: "M",
    chartSortOrder: null,

          productSizeMeasurements: [
            productMeasurement(
              FitMeasurementType.BUST,
              88,
              92,
              FitMeasurementBasis.BODY,
              FitGarmentComponent.TOP
            ),
          ],

          mappedChart: null,
        },
      ],
    });

    expect(result.status).toBe("RECOMMENDED");

    expect(
      result.recommendedSize?.sizeId
    ).toBe("m");

    expect(
      result.assessments[0]
        ?.requiredMeasurements.map(
          ({ requirement }) => ({
            type: requirement.type,
            component:
              requirement.component,
          })
        )
    ).toEqual([
      {
        type: FitMeasurementType.BUST,
        component: FitGarmentComponent.TOP,
      },
    ]);
  });

  it("recommends activewear TROUSER from WAIST and HIP / TROUSER without requiring bust", () => {
    const result = assessProductSizes({
      productType: ProductType.ACTIVEWEAR,

      fitComponents: [
        FitGarmentComponent.TROUSER,
      ],

      intendedFit:
        ProductIntendedFit.REGULAR,

      stretch: FabricStretch.NONE,

      shopperFitPreference:
        ShopperFitPreference.REGULAR,

      productMeasurementBasis:
        FitMeasurementBasis.BODY,

      shopperMeasurements: [
        {
          type: FitMeasurementType.WAIST,
          valueCm: 72,
        },
        {
          type: FitMeasurementType.HIP,
          valueCm: 98,
        },
      ],

      sizes: [
        {
          sizeId: "m",
          sizeLabel: "M",
    chartSortOrder: null,

          productSizeMeasurements: [
            productMeasurement(
              FitMeasurementType.WAIST,
              70,
              74,
              FitMeasurementBasis.BODY,
              FitGarmentComponent.TROUSER
            ),
            productMeasurement(
              FitMeasurementType.HIP,
              96,
              100,
              FitMeasurementBasis.BODY,
              FitGarmentComponent.TROUSER
            ),
          ],

          mappedChart: null,
        },
      ],
    });

    expect(result.status).toBe("RECOMMENDED");

    expect(
      result.recommendedSize?.sizeId
    ).toBe("m");

    expect(
      result.assessments[0]
        ?.requiredMeasurements.map(
          ({ requirement }) => ({
            type: requirement.type,
            component:
              requirement.component,
          })
        )
    ).toEqual([
      {
        type: FitMeasurementType.WAIST,
        component:
          FitGarmentComponent.TROUSER,
      },
      {
        type: FitMeasurementType.HIP,
        component:
          FitGarmentComponent.TROUSER,
      },
    ]);
  });

  it("recommends an activewear TOP + TROUSER product only when every required BODY measurement exists on the correct component", () => {
    const result = assessProductSizes({
      productType: ProductType.ACTIVEWEAR,

      fitComponents: [
        FitGarmentComponent.TOP,
        FitGarmentComponent.TROUSER,
      ],

      intendedFit:
        ProductIntendedFit.REGULAR,

      stretch: FabricStretch.NONE,

      shopperFitPreference:
        ShopperFitPreference.REGULAR,

      productMeasurementBasis:
        FitMeasurementBasis.BODY,

      shopperMeasurements: [
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
      ],

      sizes: [
        {
          sizeId: "m",
          sizeLabel: "M",
    chartSortOrder: null,

          productSizeMeasurements: [
            productMeasurement(
              FitMeasurementType.BUST,
              88,
              92,
              FitMeasurementBasis.BODY,
              FitGarmentComponent.TOP
            ),
            productMeasurement(
              FitMeasurementType.WAIST,
              70,
              74,
              FitMeasurementBasis.BODY,
              FitGarmentComponent.TROUSER
            ),
            productMeasurement(
              FitMeasurementType.HIP,
              96,
              100,
              FitMeasurementBasis.BODY,
              FitGarmentComponent.TROUSER
            ),
          ],

          mappedChart: null,
        },
      ],
    });

    expect(result.status).toBe("RECOMMENDED");

    expect(
      result.recommendedSize?.sizeId
    ).toBe("m");

    expect(
      result.assessments[0]
        ?.requiredMeasurements.map(
          ({ requirement }) => ({
            type: requirement.type,
            component:
              requirement.component,
          })
        )
    ).toEqual([
      {
        type: FitMeasurementType.BUST,
        component: FitGarmentComponent.TOP,
      },
      {
        type: FitMeasurementType.WAIST,
        component:
          FitGarmentComponent.TROUSER,
      },
      {
        type: FitMeasurementType.HIP,
        component:
          FitGarmentComponent.TROUSER,
      },
    ]);
  });

  it("does not let BODY evidence on the wrong component satisfy an activewear TROUSER requirement", () => {
    const result = assessSize({
      productType: ProductType.ACTIVEWEAR,

      fitComponents: [
        FitGarmentComponent.TROUSER,
      ],

      sizeId: "m",
      sizeLabel: "M",

      intendedFit:
        ProductIntendedFit.REGULAR,

      stretch: FabricStretch.NONE,

      shopperFitPreference:
        ShopperFitPreference.REGULAR,

      productMeasurementBasis:
        FitMeasurementBasis.BODY,

      shopperMeasurements: [
        {
          type: FitMeasurementType.WAIST,
          valueCm: 72,
        },
        {
          type: FitMeasurementType.HIP,
          valueCm: 98,
        },
      ],

      productSizeMeasurements: [
        productMeasurement(
          FitMeasurementType.WAIST,
          70,
          74,
          FitMeasurementBasis.BODY,
          FitGarmentComponent.TOP
        ),
        productMeasurement(
          FitMeasurementType.HIP,
          96,
          100,
          FitMeasurementBasis.BODY,
          FitGarmentComponent.TROUSER
        ),
      ],

      mappedChart: null,
    });

    expect(result.status).toBe(
      "INSUFFICIENT_EVIDENCE"
    );

    const waist =
      result.requiredMeasurements.find(
        ({ requirement }) =>
          requirement.type ===
            FitMeasurementType.WAIST &&
          requirement.component ===
            FitGarmentComponent.TROUSER
      );

    expect(waist).toBeDefined();

    if (!waist) {
      throw new Error(
        "Expected required WAIST / TROUSER assessment"
      );
    }

    expect(
      waist.evidence.body.status
    ).toBe("MISSING");

    expect(waist.comparison).toBeNull();
  });

  it("does not let GARMENT evidence replace required BODY evidence for activewear trousers", () => {
    const result = assessSize({
      productType: ProductType.ACTIVEWEAR,

      fitComponents: [
        FitGarmentComponent.TROUSER,
      ],

      sizeId: "m",
      sizeLabel: "M",

      intendedFit:
        ProductIntendedFit.REGULAR,

      stretch: FabricStretch.NONE,

      shopperFitPreference:
        ShopperFitPreference.REGULAR,

      productMeasurementBasis:
        FitMeasurementBasis.BODY,

      shopperMeasurements: [
        {
          type: FitMeasurementType.WAIST,
          valueCm: 72,
        },
        {
          type: FitMeasurementType.HIP,
          valueCm: 98,
        },
      ],

      productSizeMeasurements: [
        productMeasurement(
          FitMeasurementType.WAIST,
          80,
          80,
          FitMeasurementBasis.GARMENT,
          FitGarmentComponent.TROUSER
        ),
        productMeasurement(
          FitMeasurementType.HIP,
          100,
          100,
          FitMeasurementBasis.GARMENT,
          FitGarmentComponent.TROUSER
        ),
      ],

      mappedChart: null,
    });

    expect(result.status).toBe(
      "INSUFFICIENT_EVIDENCE"
    );

    expect(
      result.requiredMeasurements.every(
        (measurement) =>
          measurement.evidence.body.status ===
          "MISSING"
      )
    ).toBe(true);
  });
  describe("ordered UPPER_BOUND BODY chart recommendations", () => {
  it("recommends L for the Merrachi blazer instead of treating XL as equally recommended", () => {
    const requirements = [
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
    ];

    const chartSizes = [
      { label: "XS", bust: 80, waist: 65, hip: 90 },
      { label: "S", bust: 86, waist: 71, hip: 96 },
      { label: "M", bust: 94, waist: 79, hip: 104 },
      { label: "L", bust: 102, waist: 87, hip: 112 },
      { label: "XL", bust: 112, waist: 97, hip: 122 },
    ];

    const input: ProductSizeRecommendationInput = {
      productType: ProductType.BLAZER,
      intendedFit: ProductIntendedFit.REGULAR,
      stretch: FabricStretch.UNKNOWN,
      shopperFitPreference: ShopperFitPreference.REGULAR,
      productMeasurementBasis: FitMeasurementBasis.BODY,

      explicitRequiredBodyFit: requirements,

      shopperMeasurements: [
        { type: FitMeasurementType.BUST, valueCm: 94 },
        { type: FitMeasurementType.WAIST, valueCm: 87 },
        { type: FitMeasurementType.HIP, valueCm: 112 },
      ],

      sizes: chartSizes.map((size, index) => ({
        sizeId: size.label,
        sizeLabel: size.label,
        chartSortOrder: index,

        productSizeMeasurements: [],
        mappedChart: null,

        bodyMappedChart: {
          measurementBasis: FitMeasurementBasis.BODY,
          measurements: [
            bodyMeasurement(
              FitMeasurementType.BUST,
              size.bust,
              size.bust,
              FitGarmentComponent.JACKET,
              FitMeasurementRangeType.UPPER_BOUND
            ),
            bodyMeasurement(
              FitMeasurementType.WAIST,
              size.waist,
              size.waist,
              FitGarmentComponent.JACKET,
              FitMeasurementRangeType.UPPER_BOUND
            ),
            bodyMeasurement(
              FitMeasurementType.HIP,
              size.hip,
              size.hip,
              FitGarmentComponent.JACKET,
              FitMeasurementRangeType.UPPER_BOUND
            ),
          ],
        },

        garmentMappedChart: null,
      })),
    };

    const result = assessProductSizes(input);

    expect(result.status).toBe("RECOMMENDED");
    expect(result.recommendationReason).toBe(
        "BODY_CHART_FIRST_SUITABLE"
      );
    expect(result.recommendedSize?.sizeLabel).toBe("L");

    expect(
      result.suitableSizes.map((size) => size.sizeLabel)
    ).toEqual(["L", "XL"]);

    expect(
      result.assessments.find((size) => size.sizeLabel === "M")
        ?.status
    ).toBe("UNSUITABLE");
  });
});
it("does not recommend a size when chart ordering contains duplicates", () => {
  const requirements = [
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
  ];

  const chartSizes = [
    { label: "M", bust: 94, waist: 79, hip: 104, order: 2 },
    { label: "L", bust: 102, waist: 87, hip: 112, order: 3 },
    { label: "XL", bust: 112, waist: 97, hip: 122, order: 3 },
  ];

  const input: ProductSizeRecommendationInput = {
    productType: ProductType.BLAZER,
    intendedFit: ProductIntendedFit.REGULAR,
    stretch: FabricStretch.UNKNOWN,
    shopperFitPreference: ShopperFitPreference.REGULAR,
    productMeasurementBasis: FitMeasurementBasis.BODY,
    explicitRequiredBodyFit: requirements,

    shopperMeasurements: [
      { type: FitMeasurementType.BUST, valueCm: 94 },
      { type: FitMeasurementType.WAIST, valueCm: 87 },
      { type: FitMeasurementType.HIP, valueCm: 112 },
    ],

    sizes: chartSizes.map((size) => ({
      sizeId: size.label,
      sizeLabel: size.label,
      chartSortOrder: size.order,
      productSizeMeasurements: [],
      mappedChart: null,

      bodyMappedChart: {
        measurementBasis: FitMeasurementBasis.BODY,
        measurements: [
          bodyMeasurement(
            FitMeasurementType.BUST,
            size.bust,
            size.bust,
            FitGarmentComponent.JACKET,
            FitMeasurementRangeType.UPPER_BOUND
          ),
          bodyMeasurement(
            FitMeasurementType.WAIST,
            size.waist,
            size.waist,
            FitGarmentComponent.JACKET,
            FitMeasurementRangeType.UPPER_BOUND
          ),
          bodyMeasurement(
            FitMeasurementType.HIP,
            size.hip,
            size.hip,
            FitGarmentComponent.JACKET,
            FitMeasurementRangeType.UPPER_BOUND
          ),
        ],
      },

      garmentMappedChart: null,
    })),
  };

  const result = assessProductSizes(input);

  expect(result.status).toBe("MULTIPLE_SUITABLE");
  expect(result.recommendedSize).toBeNull();
});
it("does not recommend a size when chart ordering is missing", () => {
  const chartSizes = [
    { label: "M", bust: 94, waist: 79, hip: 104, order: 2 },
    { label: "L", bust: 102, waist: 87, hip: 112, order: null },
    { label: "XL", bust: 112, waist: 97, hip: 122, order: 4 },
  ];

  const input: ProductSizeRecommendationInput = {
    productType: ProductType.BLAZER,
    intendedFit: ProductIntendedFit.REGULAR,
    stretch: FabricStretch.UNKNOWN,
    shopperFitPreference: ShopperFitPreference.REGULAR,
    productMeasurementBasis: FitMeasurementBasis.BODY,

    explicitRequiredBodyFit: [
      { type: FitMeasurementType.BUST, component: FitGarmentComponent.JACKET },
      { type: FitMeasurementType.WAIST, component: FitGarmentComponent.JACKET },
      { type: FitMeasurementType.HIP, component: FitGarmentComponent.JACKET },
    ],

    shopperMeasurements: [
      { type: FitMeasurementType.BUST, valueCm: 94 },
      { type: FitMeasurementType.WAIST, valueCm: 87 },
      { type: FitMeasurementType.HIP, valueCm: 112 },
    ],

    sizes: chartSizes.map((size) => ({
      sizeId: size.label,
      sizeLabel: size.label,
      chartSortOrder: size.order,
      productSizeMeasurements: [],
      mappedChart: null,

      bodyMappedChart: {
        measurementBasis: FitMeasurementBasis.BODY,
        measurements: [
          bodyMeasurement(
            FitMeasurementType.BUST,
            size.bust,
            size.bust,
            FitGarmentComponent.JACKET,
            FitMeasurementRangeType.UPPER_BOUND
          ),
          bodyMeasurement(
            FitMeasurementType.WAIST,
            size.waist,
            size.waist,
            FitGarmentComponent.JACKET,
            FitMeasurementRangeType.UPPER_BOUND
          ),
          bodyMeasurement(
            FitMeasurementType.HIP,
            size.hip,
            size.hip,
            FitGarmentComponent.JACKET,
            FitMeasurementRangeType.UPPER_BOUND
          ),
        ],
      },

      garmentMappedChart: null,
    })),
  };

  const result = assessProductSizes(input);

  expect(result.status).toBe("MULTIPLE_SUITABLE");
  expect(result.recommendedSize).toBeNull();
});

it("does not apply the upper-bound fallback to mixed measurement semantics", () => {
  const chartSizes = [
    { label: "M", bust: 94, waist: 79, hip: 104, order: 2 },
    { label: "L", bust: 102, waist: 87, hip: 112, order: 3 },
    { label: "XL", bust: 112, waist: 97, hip: 122, order: 4 },
  ];

  const input: ProductSizeRecommendationInput = {
    productType: ProductType.BLAZER,
    intendedFit: ProductIntendedFit.REGULAR,
    stretch: FabricStretch.UNKNOWN,
    shopperFitPreference: ShopperFitPreference.REGULAR,
    productMeasurementBasis: FitMeasurementBasis.BODY,

    explicitRequiredBodyFit: [
      { type: FitMeasurementType.BUST, component: FitGarmentComponent.JACKET },
      { type: FitMeasurementType.WAIST, component: FitGarmentComponent.JACKET },
      { type: FitMeasurementType.HIP, component: FitGarmentComponent.JACKET },
    ],

    shopperMeasurements: [
      { type: FitMeasurementType.BUST, valueCm: 94 },
      { type: FitMeasurementType.WAIST, valueCm: 87 },
      { type: FitMeasurementType.HIP, valueCm: 112 },
    ],

    sizes: chartSizes.map((size) => ({
      sizeId: size.label,
      sizeLabel: size.label,
      chartSortOrder: size.order,
      productSizeMeasurements: [],
      mappedChart: null,

      bodyMappedChart: {
        measurementBasis: FitMeasurementBasis.BODY,
        measurements: [
          bodyMeasurement(
            FitMeasurementType.BUST,
            size.bust,
            size.bust,
            FitGarmentComponent.JACKET,
            FitMeasurementRangeType.UPPER_BOUND
          ),
          bodyMeasurement(
            FitMeasurementType.WAIST,
            size.label === "XL" ? 80 : size.waist,
            size.waist,
            FitGarmentComponent.JACKET,
            size.label === "XL"
              ? FitMeasurementRangeType.RANGE
              : FitMeasurementRangeType.UPPER_BOUND
          ),
          bodyMeasurement(
            FitMeasurementType.HIP,
            size.hip,
            size.hip,
            FitGarmentComponent.JACKET,
            FitMeasurementRangeType.UPPER_BOUND
          ),
        ],
      },

      garmentMappedChart: null,
    })),
  };

  const result = assessProductSizes(input);

  expect(result.status).toBe("MULTIPLE_SUITABLE");
  expect(result.recommendedSize).toBeNull();
});
it("does not apply the upper-bound fallback when chart measurements decrease", () => {
  const chartSizes = [
    { label: "M", bust: 94, waist: 79, hip: 104, order: 2 },
    { label: "L", bust: 102, waist: 87, hip: 112, order: 3 },
    { label: "XL", bust: 112, waist: 85, hip: 122, order: 4 },
  ];

  const input: ProductSizeRecommendationInput = {
    productType: ProductType.BLAZER,
    intendedFit: ProductIntendedFit.REGULAR,
    stretch: FabricStretch.UNKNOWN,
    shopperFitPreference: ShopperFitPreference.REGULAR,
    productMeasurementBasis: FitMeasurementBasis.BODY,

    explicitRequiredBodyFit: [
      { type: FitMeasurementType.BUST, component: FitGarmentComponent.JACKET },
      { type: FitMeasurementType.WAIST, component: FitGarmentComponent.JACKET },
      { type: FitMeasurementType.HIP, component: FitGarmentComponent.JACKET },
    ],

    shopperMeasurements: [
      { type: FitMeasurementType.BUST, valueCm: 94 },
      { type: FitMeasurementType.WAIST, valueCm: 85 },
      { type: FitMeasurementType.HIP, valueCm: 112 },
    ],

    sizes: chartSizes.map((size) => ({
      sizeId: size.label,
      sizeLabel: size.label,
      chartSortOrder: size.order,
      productSizeMeasurements: [],
      mappedChart: null,

      bodyMappedChart: {
        measurementBasis: FitMeasurementBasis.BODY,
        measurements: [
          bodyMeasurement(
            FitMeasurementType.BUST,
            size.bust,
            size.bust,
            FitGarmentComponent.JACKET,
            FitMeasurementRangeType.UPPER_BOUND
          ),
          bodyMeasurement(
            FitMeasurementType.WAIST,
            size.waist,
            size.waist,
            FitGarmentComponent.JACKET,
            FitMeasurementRangeType.UPPER_BOUND
          ),
          bodyMeasurement(
            FitMeasurementType.HIP,
            size.hip,
            size.hip,
            FitGarmentComponent.JACKET,
            FitMeasurementRangeType.UPPER_BOUND
          ),
        ],
      },

      garmentMappedChart: null,
    })),
  };

  const result = assessProductSizes(input);

  expect(result.status).toBe("MULTIPLE_SUITABLE");
  expect(result.recommendedSize).toBeNull();

  expect(
    result.suitableSizes.map((size) => size.sizeLabel)
  ).toEqual(["L", "XL"]);
});
});
});
