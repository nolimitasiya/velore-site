import {
  describe,
  expect,
  it,
} from "vitest";
import {
  FabricStretch,
  FitGarmentComponent,
  FitMeasurementBasis,
  FitMeasurementType,
  ProductLengthStructure,
  ProductType,
  ShopperFitPreference,
} from "@prisma/client";

import {
  assessIndependentProductLengths,
  assessProductLengths,
} from "@/lib/fit/productLengthAssessment";

import type {
  ProductSizeRecommendationInput,
} from "@/lib/fit/recommendation";

function createInput(
  overrides: Partial<ProductSizeRecommendationInput> = {}
): ProductSizeRecommendationInput {
  return {
    productType: ProductType.DRESS,

    intendedFit: null,

    stretch: FabricStretch.UNKNOWN,

    shopperFitPreference:
      ShopperFitPreference.REGULAR,

    productMeasurementBasis:
      FitMeasurementBasis.GARMENT,

    shopperMeasurements: [
      {
        type: FitMeasurementType.GARMENT_LENGTH,
        valueCm: 147.32,
      },
    ],


    sizes: [],

    ...overrides,
  };
}

function garmentLengthMeasurement(
  minValueCm: number,
  maxValueCm = minValueCm,
  measurementBasis:
    FitMeasurementBasis =
      FitMeasurementBasis.GARMENT
) {
  return {
    type: FitMeasurementType.GARMENT_LENGTH,
    component:
      FitGarmentComponent.WHOLE_GARMENT,

    measurementBasis,

    minValueCm,
    maxValueCm,
  };
}

describe("assessProductLengths", () => {
  it("matches a dress whose garment length equals the shopper's preferred maxi length", () => {
    const input = createInput({
      sizes: [
        {
          sizeId: "m",
          sizeLabel: "M",

          productSizeMeasurements: [
            garmentLengthMeasurement(147.32),
          ],

          mappedChart: null,
          bodyMappedChart: null,
          garmentMappedChart: null,
        },
      ],
    });

    const result =
      assessProductLengths({
        input,
        structure: "SIZE_DEPENDENT",
      })

    expect(result.status).toBe("ASSESSED");

    if (result.status !== "ASSESSED") {
      throw new Error(
        "Expected assessed length result."
      );
    }

    expect(result.assessments).toHaveLength(1);

    expect(
      result.assessments[0].assessment.status
    ).toBe("MATCH");
  });

  it("reports a dress as shorter than the shopper's preferred maxi length", () => {
    const input = createInput({
      sizes: [
        {
          sizeId: "m",
          sizeLabel: "M",

          productSizeMeasurements: [
            garmentLengthMeasurement(142),
          ],

          mappedChart: null,
          bodyMappedChart: null,
          garmentMappedChart: null,
        },
      ],
    });

    const result =
      assessProductLengths({
        input,
        structure: "SIZE_DEPENDENT",
      })

    expect(result.status).toBe("ASSESSED");

    if (result.status !== "ASSESSED") {
      throw new Error(
        "Expected assessed length result."
      );
    }

    expect(
      result.assessments[0].assessment.status
    ).toBe("SHORTER_THAN_PREFERENCE");
  });

  it("reports a dress as longer than the shopper's preferred maxi length", () => {
    const input = createInput({
      sizes: [
        {
          sizeId: "m",
          sizeLabel: "M",

          productSizeMeasurements: [
            garmentLengthMeasurement(152),
          ],

          mappedChart: null,
          bodyMappedChart: null,
          garmentMappedChart: null,
        },
      ],
    });

    const result =
      assessProductLengths({
        input,
        structure: "SIZE_DEPENDENT",
      });

    expect(result.status).toBe("ASSESSED");

    if (result.status !== "ASSESSED") {
      throw new Error(
        "Expected assessed length result."
      );
    }

    expect(
      result.assessments[0].assessment.status
    ).toBe("LONGER_THAN_PREFERENCE");
  });

  it("assesses verified abaya garment lengths without inferring from the size label", () => {
    const inches = [54, 56, 58, 60, 62];

    const input = createInput({
      productType: ProductType.ABAYA,

      sizes: inches.map((length) => ({
        sizeId: `abaya-${length}`,
        sizeLabel: String(length),

        productSizeMeasurements: [
          garmentLengthMeasurement(
            length * 2.54
          ),
        ],

        mappedChart: null,
        bodyMappedChart: null,
        garmentMappedChart: null,
      })),
    });

    const result =
      assessProductLengths({
        input,
        structure: "SIZE_DEPENDENT",
      })

    expect(result.status).toBe("ASSESSED");

    if (result.status !== "ASSESSED") {
      throw new Error(
        "Expected assessed length result."
      );
    }

    const size58 =
      result.assessments.find(
        (assessment) =>
          assessment.sizeLabel === "58"
      );

    expect(size58).toBeDefined();

    expect(
      size58?.assessment.status
    ).toBe("MATCH");

    expect(
      result.assessments.find(
        (assessment) =>
          assessment.sizeLabel === "56"
      )?.assessment.status
    ).toBe("SHORTER_THAN_PREFERENCE");

    expect(
      result.assessments.find(
        (assessment) =>
          assessment.sizeLabel === "60"
      )?.assessment.status
    ).toBe("LONGER_THAN_PREFERENCE");
  });

  it("prefers product-specific GARMENT evidence over mapped GARMENT chart evidence", () => {
    const input = createInput({
      sizes: [
        {
          sizeId: "m",
          sizeLabel: "M",

          productSizeMeasurements: [
            garmentLengthMeasurement(147.32),
          ],

          mappedChart: {
            measurementBasis:
              FitMeasurementBasis.GARMENT,

            measurements: [
              garmentLengthMeasurement(140),
            ],
          },

          bodyMappedChart: null,

          garmentMappedChart: {
            measurementBasis:
              FitMeasurementBasis.GARMENT,

            measurements: [
              garmentLengthMeasurement(140),
            ],
          },
        },
      ],
    });

    const result =
      assessProductLengths({
        input,
        structure: "SIZE_DEPENDENT",
      });

    expect(result.status).toBe("ASSESSED");

    if (result.status !== "ASSESSED") {
      throw new Error(
        "Expected assessed length result."
      );
    }

    expect(
      result.assessments[0].assessment.status
    ).toBe("MATCH");

    expect(
      result.assessments[0].assessment
        .garmentRange.minValueCm
    ).toBe(147.32);
  });

  it("does not treat BODY chart evidence as garment-length evidence", () => {
    const bodyChart = {
      measurementBasis:
        FitMeasurementBasis.BODY,

      measurements: [
        garmentLengthMeasurement(147.32),
      ],
    };

    const input = createInput({
      productMeasurementBasis:
        FitMeasurementBasis.UNKNOWN,

      sizes: [
        {
          sizeId: "m",
          sizeLabel: "M",

          productSizeMeasurements: [],

          mappedChart: bodyChart,
          bodyMappedChart: bodyChart,
          garmentMappedChart: null,
        },
      ],
    });

    const result =
      assessProductLengths({
        input,
        structure: "SIZE_DEPENDENT",
      });

    expect(result).toEqual({
      status: "INSUFFICIENT_EVIDENCE",
      structure: "SIZE_DEPENDENT",
      assessments: [],
      reason: "MISSING_GARMENT_LENGTH",
    });
  });

  it("does not treat product measurements with UNKNOWN basis as garment evidence", () => {
    const input = createInput({
      productMeasurementBasis:
        FitMeasurementBasis.UNKNOWN,

      sizes: [
        {
          sizeId: "m",
          sizeLabel: "M",

          productSizeMeasurements: [
            garmentLengthMeasurement(
              147.32,
              147.32,
              FitMeasurementBasis.UNKNOWN
            ),
          ],

          mappedChart: null,
          bodyMappedChart: null,
          garmentMappedChart: null,
        },
      ],
    });

    const result =
      assessProductLengths({
        input,
        structure: "SIZE_DEPENDENT",
      });

    expect(result).toEqual({
      status: "INSUFFICIENT_EVIDENCE",
      structure: "SIZE_DEPENDENT",
      assessments: [],
      reason: "MISSING_GARMENT_LENGTH",
    });
  });

  it("does not let a GARMENT product basis override an explicit UNKNOWN size-measurement basis", () => {
  const input = createInput({
    productMeasurementBasis:
      FitMeasurementBasis.GARMENT,

    sizes: [
      {
        sizeId: "m",
        sizeLabel: "M",

        productSizeMeasurements: [
          garmentLengthMeasurement(
            147.32,
            147.32,
            FitMeasurementBasis.UNKNOWN
          ),
        ],

        mappedChart: null,
        bodyMappedChart: null,
        garmentMappedChart: null,
      },
    ],
  });

  const result =
      assessProductLengths({
        input,
        structure: "SIZE_DEPENDENT",
      });

  expect(result).toEqual({
    status: "INSUFFICIENT_EVIDENCE",
    structure: "SIZE_DEPENDENT",
    assessments: [],
    reason: "MISSING_GARMENT_LENGTH",
  });
});

it("accepts an explicit GARMENT size-measurement basis even when the product basis is UNKNOWN", () => {
  const input = createInput({
    productMeasurementBasis:
      FitMeasurementBasis.UNKNOWN,

    sizes: [
      {
        sizeId: "m",
        sizeLabel: "M",

        productSizeMeasurements: [
          garmentLengthMeasurement(
            147.32,
            147.32,
            FitMeasurementBasis.GARMENT
          ),
        ],

        mappedChart: null,
        bodyMappedChart: null,
        garmentMappedChart: null,
      },
    ],
  });

  const result =
      assessProductLengths({
        input,
        structure: "SIZE_DEPENDENT",
      });

  expect(result.status).toBe("ASSESSED");

  if (result.status !== "ASSESSED") {
    throw new Error(
      "Expected explicit GARMENT evidence to be assessed."
    );
  }

  expect(result.assessments).toHaveLength(1);

  expect(
    result.assessments[0].assessment.status
  ).toBe("MATCH");

  expect(
    result.assessments[0].assessment
      .garmentRange.minValueCm
  ).toBe(147.32);
});

  it("fails closed when the shopper has no preferred maxi length", () => {
    const input = createInput({
      shopperMeasurements: [],

      sizes: [
        {
          sizeId: "m",
          sizeLabel: "M",

          productSizeMeasurements: [
            garmentLengthMeasurement(147.32),
          ],

          mappedChart: null,
          bodyMappedChart: null,
          garmentMappedChart: null,
        },
      ],
    });

    const result =
      assessProductLengths({
        input,
        structure: "SIZE_DEPENDENT",
      });

    expect(result).toEqual({
      status: "INSUFFICIENT_EVIDENCE",
      structure: "SIZE_DEPENDENT",
      assessments: [],
      reason:
        "MISSING_SHOPPER_PREFERENCE",
    });
  });

  it("fails closed when the product has no garment-length evidence", () => {
    const input = createInput({
      sizes: [
        {
          sizeId: "m",
          sizeLabel: "M",

          productSizeMeasurements: [],

          mappedChart: null,
          bodyMappedChart: null,
          garmentMappedChart: null,
        },
      ],
    });

    const result =
      assessProductLengths({
        input,
        structure: "SIZE_DEPENDENT",
      });

    expect(result).toEqual({
      status: "INSUFFICIENT_EVIDENCE",
      structure: "SIZE_DEPENDENT",
      assessments: [],
      reason: "MISSING_GARMENT_LENGTH",
    });
  });

  it("returns NOT_APPLICABLE for a product outside the maxi-length family", () => {
    const input = createInput({
      productType: ProductType.HIJAB,
    });

    const result =
      assessProductLengths({
        input,
        structure: "SIZE_DEPENDENT",
      });

    expect(result).toEqual({
      status: "NOT_APPLICABLE",
      assessments: [],
    });
  });

  it("never infers an abaya garment length from a numeric size label alone", () => {
    const input = createInput({
      productType: ProductType.ABAYA,

      productMeasurementBasis:
        FitMeasurementBasis.GARMENT,

      sizes: [
        {
          sizeId: "abaya-58",
          sizeLabel: "58",

          productSizeMeasurements: [],

          mappedChart: null,
          bodyMappedChart: null,
          garmentMappedChart: null,
        },
      ],
    });

    const result =
      assessProductLengths({
        input,
        structure: "SIZE_DEPENDENT",
      });

    expect(result).toEqual({
      status: "INSUFFICIENT_EVIDENCE",
      structure: "SIZE_DEPENDENT",
      assessments: [],
      reason: "MISSING_GARMENT_LENGTH",
    });
  });

  it("assesses length-based ProductSizes as purchasable length choices", () => {
  const input = createInput({
    productType: ProductType.ABAYA,

    sizes: [54, 56, 58, 60].map((length) => ({
      sizeId: `length-size-${length}`,
      sizeLabel: String(length),

      productSizeMeasurements: [
        garmentLengthMeasurement(length * 2.54),
      ],

      mappedChart: null,
      bodyMappedChart: null,
      garmentMappedChart: null,
    })),
  });

  const result = assessProductLengths({
    input,
    structure: "LENGTH_BASED_SIZE",
  });

  expect(result.status).toBe("ASSESSED");

  if (result.status !== "ASSESSED") {
    throw new Error(
      "Expected length-based sizes to be assessed."
    );
  }

  expect(result.structure).toBe(
    "LENGTH_BASED_SIZE"
  );

  expect(
    result.assessments.map((item) => ({
      sizeId: item.sizeId,
      sizeLabel: item.sizeLabel,
      status: item.assessment.status,
    }))
  ).toEqual([
    {
      sizeId: "length-size-54",
      sizeLabel: "54",
      status: "SHORTER_THAN_PREFERENCE",
    },
    {
      sizeId: "length-size-56",
      sizeLabel: "56",
      status: "SHORTER_THAN_PREFERENCE",
    },
    {
      sizeId: "length-size-58",
      sizeLabel: "58",
      status: "MATCH",
    },
    {
      sizeId: "length-size-60",
      sizeLabel: "60",
      status: "LONGER_THAN_PREFERENCE",
    },
  ]);
});

it("fails closed when a length-based catalogue size is missing explicit garment-length evidence", () => {
  const input = createInput({
    productType: ProductType.ABAYA,

    sizes: [
      {
        sizeId: "length-size-54",
        sizeLabel: "54",
        productSizeMeasurements: [
          garmentLengthMeasurement(54 * 2.54),
        ],
        mappedChart: null,
        bodyMappedChart: null,
        garmentMappedChart: null,
      },
      {
        sizeId: "length-size-56",
        sizeLabel: "56",
        productSizeMeasurements: [
          garmentLengthMeasurement(56 * 2.54),
        ],
        mappedChart: null,
        bodyMappedChart: null,
        garmentMappedChart: null,
      },
      {
        sizeId: "length-size-58",
        sizeLabel: "58",
        productSizeMeasurements: [
          garmentLengthMeasurement(58 * 2.54),
        ],
        mappedChart: null,
        bodyMappedChart: null,
        garmentMappedChart: null,
      },
      {
        sizeId: "length-size-60",
        sizeLabel: "60",

        // Deliberately missing.
        // The engine must never infer 60" from this label.
        productSizeMeasurements: [],

        mappedChart: null,
        bodyMappedChart: null,
        garmentMappedChart: null,
      },
    ],
  });

  const result = assessProductLengths({
    input,
    structure: "LENGTH_BASED_SIZE",
  });

  expect(result).toEqual({
    status: "INSUFFICIENT_EVIDENCE",
    structure: "LENGTH_BASED_SIZE",
    assessments: [],
    reason: "MISSING_GARMENT_LENGTH",
  });
});

it("fails closed for length-based sizes when the shopper has no preferred maxi length", () => {
  const input = createInput({
    productType: ProductType.ABAYA,

    shopperMeasurements: [],

    sizes: [54, 56, 58, 60].map((length) => ({
      sizeId: `length-size-${length}`,
      sizeLabel: String(length),

      productSizeMeasurements: [
        garmentLengthMeasurement(length * 2.54),
      ],

      mappedChart: null,
      bodyMappedChart: null,
      garmentMappedChart: null,
    })),
  });

  const result = assessProductLengths({
    input,
    structure: "LENGTH_BASED_SIZE",
  });

  expect(result).toEqual({
    status: "INSUFFICIENT_EVIDENCE",
    structure: "LENGTH_BASED_SIZE",
    assessments: [],
    reason: "MISSING_SHOPPER_PREFERENCE",
  });
});
it("fails closed when one length-based size has BODY evidence instead of GARMENT evidence", () => {
  const input = createInput({
    productType: ProductType.ABAYA,

    sizes: [
      {
        sizeId: "length-size-54",
        sizeLabel: "54",

        productSizeMeasurements: [
          garmentLengthMeasurement(
            54 * 2.54,
            54 * 2.54,
            FitMeasurementBasis.GARMENT
          ),
        ],

        mappedChart: null,
        bodyMappedChart: null,
        garmentMappedChart: null,
      },

      {
        sizeId: "length-size-56",
        sizeLabel: "56",

        productSizeMeasurements: [
          garmentLengthMeasurement(
            56 * 2.54,
            56 * 2.54,
            FitMeasurementBasis.GARMENT
          ),
        ],

        mappedChart: null,
        bodyMappedChart: null,
        garmentMappedChart: null,
      },

      {
        sizeId: "length-size-58",
        sizeLabel: "58",

        /*
         * Deliberately wrong basis.
         *
         * A length-looking value must not become
         * garment evidence merely because the
         * numerical value is plausible.
         */
        productSizeMeasurements: [
          garmentLengthMeasurement(
            58 * 2.54,
            58 * 2.54,
            FitMeasurementBasis.BODY
          ),
        ],

        mappedChart: null,
        bodyMappedChart: null,
        garmentMappedChart: null,
      },

      {
        sizeId: "length-size-60",
        sizeLabel: "60",

        productSizeMeasurements: [
          garmentLengthMeasurement(
            60 * 2.54,
            60 * 2.54,
            FitMeasurementBasis.GARMENT
          ),
        ],

        mappedChart: null,
        bodyMappedChart: null,
        garmentMappedChart: null,
      },
    ],
  });

  const result = assessProductLengths({
    input,
    structure: "LENGTH_BASED_SIZE",
  });

  expect(result).toEqual({
    status: "INSUFFICIENT_EVIDENCE",
    structure: "LENGTH_BASED_SIZE",
    assessments: [],
    reason: "MISSING_GARMENT_LENGTH",
  });
});

it("uses mapped GARMENT chart evidence as a valid fallback for length-based sizes", () => {
  const input = createInput({
    productType: ProductType.ABAYA,

    sizes: [54, 56, 58, 60].map((length) => {
      const garmentChart = {
        measurementBasis:
          FitMeasurementBasis.GARMENT,

        measurements: [
          garmentLengthMeasurement(
            length * 2.54
          ),
        ],
      };

      return {
        sizeId: `length-size-${length}`,
        sizeLabel: String(length),

        // Deliberately no product-specific
        // garment-length measurement.
        productSizeMeasurements: [],

        mappedChart: garmentChart,
        bodyMappedChart: null,
        garmentMappedChart: garmentChart,
      };
    }),
  });

  const result = assessProductLengths({
    input,
    structure: "LENGTH_BASED_SIZE",
  });

  expect(result.status).toBe("ASSESSED");

  if (result.status !== "ASSESSED") {
    throw new Error(
      "Expected mapped GARMENT chart evidence to assess length-based sizes."
    );
  }

  expect(result.structure).toBe(
    "LENGTH_BASED_SIZE"
  );

  expect(
    result.assessments.map((item) => ({
      sizeLabel: item.sizeLabel,
      status: item.assessment.status,
    }))
  ).toEqual([
    {
      sizeLabel: "54",
      status: "SHORTER_THAN_PREFERENCE",
    },
    {
      sizeLabel: "56",
      status: "SHORTER_THAN_PREFERENCE",
    },
    {
      sizeLabel: "58",
      status: "MATCH",
    },
    {
      sizeLabel: "60",
      status: "LONGER_THAN_PREFERENCE",
    },
  ]);
});

it("does not use mapped BODY chart evidence as garment-length evidence for length-based sizes", () => {
  const input = createInput({
    productType: ProductType.ABAYA,

    sizes: [54, 56, 58, 60].map((length) => {
      const bodyChart = {
        measurementBasis:
          FitMeasurementBasis.BODY,

        measurements: [
          garmentLengthMeasurement(
            length * 2.54
          ),
        ],
      };

      return {
        sizeId: `length-size-${length}`,
        sizeLabel: String(length),

        productSizeMeasurements: [],

        mappedChart: bodyChart,
        bodyMappedChart: bodyChart,

        // Critical:
        // BODY evidence must never enter
        // the garment evidence channel.
        garmentMappedChart: null,
      };
    }),
  });

  const result = assessProductLengths({
    input,
    structure: "LENGTH_BASED_SIZE",
  });

  expect(result).toEqual({
    status: "INSUFFICIENT_EVIDENCE",
    structure: "LENGTH_BASED_SIZE",
    assessments: [],
    reason: "MISSING_GARMENT_LENGTH",
  });
});

  describe("assessIndependentProductLengths", () => {
  const shopperMeasurements = [
    {
      type: FitMeasurementType.GARMENT_LENGTH,
      valueCm: 147.32,
    },
  ];

  it("assesses independent normalized length options against the shopper's preferred maxi length", () => {
    const result =
      assessIndependentProductLengths({
        productType: ProductType.DRESS,

        shopperMeasurements,

        lengthInput: {
          structure:
            ProductLengthStructure.INDEPENDENT,

          options: [
            {
              id: "length-54",
              label: '54"',
              valueCm: 137.16,
              sourceValue: 54,
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
              valueCm: 142.24,
              sourceValue: 56,
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
              valueCm: 147.32,
              sourceValue: 58,
              sourceUnit: "IN",
              sortOrder: 2,
              source: null,
              sourceUrl: null,
              sourceNotes: null,
              lastVerifiedAt: null,
            },
          ],
        },
      });

    expect(result.status).toBe("ASSESSED");

    if (result.status !== "ASSESSED") {
      throw new Error(
        "Expected independent lengths to be assessed."
      );
    }

    expect(
      result.assessments.map((item) => ({
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

  it("keeps catalogue-only options but excludes them from numerical assessment", () => {
    const result =
      assessIndependentProductLengths({
        productType: ProductType.DRESS,

        shopperMeasurements,

        lengthInput: {
          structure:
            ProductLengthStructure.INDEPENDENT,

          options: [
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
            {
              id: "length-58",
              label: '58"',
              valueCm: 147.32,
              sourceValue: 58,
              sourceUnit: "IN",
              sortOrder: 1,
              source: null,
              sourceUrl: null,
              sourceNotes: null,
              lastVerifiedAt: null,
            },
          ],
        },
      });

    expect(result.status).toBe("ASSESSED");

    if (result.status !== "ASSESSED") {
      throw new Error(
        "Expected independent lengths to be assessed."
      );
    }

    expect(
      result.assessments.map(
        (item) => item.optionLabel
      )
    ).toEqual(['58"']);
  });

  it("never infers numerical evidence from a numeric-looking independent length label", () => {
    const result =
      assessIndependentProductLengths({
        productType: ProductType.ABAYA,

        shopperMeasurements,

        lengthInput: {
          structure:
            ProductLengthStructure.INDEPENDENT,

          options: [
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
        },
      });

    expect(result).toEqual({
      status: "INSUFFICIENT_EVIDENCE",
      structure: "INDEPENDENT",
      assessments: [],
      reason: "MISSING_GARMENT_LENGTH",
    });
  });

  it("assesses all length-based sizes without inventing an exact match", () => {
  const input = createInput({
    productType: ProductType.ABAYA,

    sizes: [54, 56, 60].map((length) => ({
      sizeId: `length-size-${length}`,
      sizeLabel: String(length),

      productSizeMeasurements: [
        garmentLengthMeasurement(length * 2.54),
      ],

      mappedChart: null,
      bodyMappedChart: null,
      garmentMappedChart: null,
    })),
  });

  const result = assessProductLengths({
    input,
    structure: "LENGTH_BASED_SIZE",
  });

  expect(result.status).toBe("ASSESSED");

  if (result.status !== "ASSESSED") {
    throw new Error(
      "Expected complete length evidence to be assessed."
    );
  }

  expect(result.structure).toBe(
    "LENGTH_BASED_SIZE"
  );

  expect(
    result.assessments.map((item) => ({
      sizeLabel: item.sizeLabel,
      status: item.assessment.status,
    }))
  ).toEqual([
    {
      sizeLabel: "54",
      status: "SHORTER_THAN_PREFERENCE",
    },
    {
      sizeLabel: "56",
      status: "SHORTER_THAN_PREFERENCE",
    },
    {
      sizeLabel: "60",
      status: "LONGER_THAN_PREFERENCE",
    },
  ]);

  expect(
    result.assessments.some(
      (item) =>
        item.assessment.status === "MATCH"
    )
  ).toBe(false);
});

  it("fails closed when the shopper has no preferred maxi length", () => {
    const result =
      assessIndependentProductLengths({
        productType: ProductType.DRESS,

        shopperMeasurements: [],

        lengthInput: {
          structure:
            ProductLengthStructure.INDEPENDENT,

          options: [
            {
              id: "length-58",
              label: '58"',
              valueCm: 147.32,
              sourceValue: 58,
              sourceUnit: "IN",
              sortOrder: 0,
              source: null,
              sourceUrl: null,
              sourceNotes: null,
              lastVerifiedAt: null,
            },
          ],
        },
      });

    expect(result).toEqual({
      status: "INSUFFICIENT_EVIDENCE",
      structure: "INDEPENDENT",
      assessments: [],
      reason: "MISSING_SHOPPER_PREFERENCE",
    });
  });

  it("returns NOT_APPLICABLE when the length structure is not independent", () => {
    const result =
      assessIndependentProductLengths({
        productType: ProductType.DRESS,

        shopperMeasurements,

        lengthInput: {
          structure:
            ProductLengthStructure.SIZE_DEPENDENT,
          options: [],
        },
      });

    expect(result).toEqual({
      status: "NOT_APPLICABLE",
      assessments: [],
    });
  });

  it("returns NOT_APPLICABLE for products outside the maxi-length family", () => {
    const result =
      assessIndependentProductLengths({
        productType: ProductType.HIJAB,

        shopperMeasurements,

        lengthInput: {
          structure:
            ProductLengthStructure.INDEPENDENT,
          options: [],
        },
      });

    expect(result).toEqual({
      status: "NOT_APPLICABLE",
      assessments: [],
    });
  });
});

});