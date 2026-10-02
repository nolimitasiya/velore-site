import { describe, expect, it } from "vitest";

import {
  FabricStretch,
  FitGarmentComponent,
  FitMeasurementBasis,
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
  component: FitGarmentComponent =
    FitGarmentComponent.DRESS
) {
  return {
    type,
    component,
    minValueCm,
    maxValueCm,
  };
}

function productMeasurement(
  type: FitMeasurementType,
  minValueCm: number,
  maxValueCm: number,
  measurementBasis: FitMeasurementBasis,
  component: FitGarmentComponent =
    FitGarmentComponent.DRESS
) {
  return {
    type,
    component,
    measurementBasis,
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

    it("keeps the RÅDA garment-chart case unresolved instead of declaring the shopper too large", () => {
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
    it("can mark a GARMENT-based size suitable when every required measurement has a matching calibrated policy", () => {
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

  expect(result.status).toBe("SUITABLE");

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

it("can recommend a GARMENT-based size when an applicable policy explicitly allows negative ease", () => {
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

  expect(result.status).toBe("RECOMMENDED");

  expect(
    result.recommendedSize?.sizeLabel
  ).toBe("M");

  expect(
    result.recommendedSize?.status
  ).toBe("SUITABLE");

  expect(
    result.recommendedSize?.requiredMeasurements.every(
      (measurement) =>
        measurement.easePolicy?.status ===
          "FOUND" &&
        measurement.garmentEase?.status ===
          "MATCH"
    )
  ).toBe(true);
});

it("can reject a GARMENT-based size when calibrated ease is too small", () => {
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

  expect(result.status).toBe("UNSUITABLE");

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
   * BODY range for this size is 88–92 cm.
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
          minValueCm: 96,
          maxValueCm: 98,
        },
        {
          type: "WAIST",
          component: "DRESS",
          minValueCm: 78,
          maxValueCm: 80,
        },
        {
          type: "HIP",
          component: "DRESS",
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
          minValueCm: 96,
          maxValueCm: 98,
        },
        {
          type: "WAIST",
          component: "WHOLE_GARMENT",
          minValueCm: 78,
          maxValueCm: 80,
        },
        {
          type: "HIP",
          component: "WHOLE_GARMENT",
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
          minValueCm: 88,
          maxValueCm: 90,
        },
        {
          type: "WAIST",
          component: "DRESS",
          minValueCm: 70,
          maxValueCm: 72,
        },
        {
          type: "HIP",
          component: "DRESS",
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
          minValueCm: 96,
          maxValueCm: 98,
        },
        {
          type: "WAIST",
          component: "DRESS",
          minValueCm: 78,
          maxValueCm: 80,
        },
        {
          type: "HIP",
          component: "DRESS",
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


it("uses the legacy calibrated policy when evidence-derived fit is incomplete", () => {
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
          minValueCm: 96,
          maxValueCm: 98,
        },
        {
          type: "WAIST",
          component: "DRESS",
          minValueCm: 78,
          maxValueCm: 80,
        },
        {
          type: "HIP",
          component: "DRESS",
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

  expect(result.status).toBe("SUITABLE");
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
  it("does not recommend between suitable sizes when one suitable candidate lacks complete cross-size actual-ease evidence", () => {
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
   * First prove the state we are investigating is
   * genuinely reachable.
   */
  expect(result.suitableSizes).toHaveLength(2);

  const evidenceSize =
    result.suitableSizes.find(
      (size) => size.sizeId === "m"
    );

  const legacySize =
    result.suitableSizes.find(
      (size) => size.sizeId === "l"
    );

  expect(evidenceSize).toBeDefined();
  expect(legacySize).toBeDefined();

  if (!evidenceSize || !legacySize) {
    throw new Error(
      "Expected both evidence-derived and legacy sizes to be suitable"
    );
  }

  expect(
    evidenceSize.requiredMeasurements.every(
      (measurement) =>
        measurement.evidenceDerivedFit.actualEase
          ?.status === "CALCULATED"
    )
  ).toBe(true);

  expect(
    legacySize.requiredMeasurements.every(
      (measurement) =>
        measurement.evidenceDerivedFit.actualEase ===
          null ||
        measurement.evidenceDerivedFit.actualEase
          .status !== "CALCULATED"
    )
  ).toBe(true);

  /*
   * Preference must not manufacture a unique winner
   * by silently discarding the legacy candidate's
   * missing preference dimensions.
   */
  expect(result.status).toBe(
    "MULTIPLE_SUITABLE"
  );

  expect(result.recommendedSize).toBeNull();
});

});