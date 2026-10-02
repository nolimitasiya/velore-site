import {
  FitGarmentComponent,
  FitMeasurementBasis,
  FitMeasurementType,
} from "@prisma/client";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  assessProductLengthReadiness,
} from "./productLengthReadiness";

import type {
  ProductSizeRecommendationInput,
} from "@/lib/fit/recommendation";

type SizeInput =
  ProductSizeRecommendationInput["sizes"][number];

function makeSize(
  overrides: Partial<SizeInput> = {}
): SizeInput {
  return {
    sizeId: "size-m",
    sizeLabel: "M",

    productSizeMeasurements: [],

    mappedChart: null,
    bodyMappedChart: null,
    garmentMappedChart: null,

    ...overrides,
  };
}

function garmentLengthMeasurement(
  valueCm: number
) {
  return {
    type: FitMeasurementType.GARMENT_LENGTH,
    component:
      FitGarmentComponent.WHOLE_GARMENT,

    measurementBasis:
      FitMeasurementBasis.GARMENT,

    minValueCm: valueCm,
    maxValueCm: valueCm,
  };
}

function garmentChart(
  valueCm: number
) {
  return {
    measurementBasis:
      FitMeasurementBasis.GARMENT,

    measurements: [
      {
        type:
          FitMeasurementType.GARMENT_LENGTH,
        component:
          FitGarmentComponent.WHOLE_GARMENT,
        minValueCm: valueCm,
        maxValueCm: valueCm,
      },
    ],
  };
}

function bodyChart(
  valueCm: number
) {
  return {
    measurementBasis:
      FitMeasurementBasis.BODY,

    measurements: [
      {
        type:
          FitMeasurementType.GARMENT_LENGTH,
        component:
          FitGarmentComponent.WHOLE_GARMENT,
        minValueCm: valueCm,
        maxValueCm: valueCm,
      },
    ],
  };
}

describe("assessProductLengthReadiness", () => {
  it("is READY when every catalogue size has explicit GARMENT length evidence", () => {
    const sizes = [
      makeSize({
        sizeId: "size-54",
        sizeLabel: "54",
        productSizeMeasurements: [
          garmentLengthMeasurement(137.16),
        ],
      }),

      makeSize({
        sizeId: "size-56",
        sizeLabel: "56",
        productSizeMeasurements: [
          garmentLengthMeasurement(142.24),
        ],
      }),

      makeSize({
        sizeId: "size-58",
        sizeLabel: "58",
        productSizeMeasurements: [
          garmentLengthMeasurement(147.32),
        ],
      }),
    ];

    expect(
      assessProductLengthReadiness(sizes)
    ).toEqual({
      status: "READY",
      catalogueSizeCount: 3,
      evidencedSizeCount: 3,
      hasCompleteEvidence: true,
    });
  });

  it("is READY when every catalogue size is supported by mapped GARMENT chart evidence", () => {
    const sizes = [
      makeSize({
        sizeId: "size-54",
        sizeLabel: "54",
        garmentMappedChart:
          garmentChart(137.16),
      }),

      makeSize({
        sizeId: "size-56",
        sizeLabel: "56",
        garmentMappedChart:
          garmentChart(142.24),
      }),

      makeSize({
        sizeId: "size-58",
        sizeLabel: "58",
        garmentMappedChart:
          garmentChart(147.32),
      }),

      makeSize({
        sizeId: "size-60",
        sizeLabel: "60",
        garmentMappedChart:
          garmentChart(152.4),
      }),
    ];

    expect(
      assessProductLengthReadiness(sizes)
    ).toEqual({
      status: "READY",
      catalogueSizeCount: 4,
      evidencedSizeCount: 4,
      hasCompleteEvidence: true,
    });
  });

  it("allows explicit GARMENT evidence and mapped GARMENT evidence to coexist across catalogue sizes", () => {
    const sizes = [
      makeSize({
        sizeId: "size-56",
        sizeLabel: "56",
        productSizeMeasurements: [
          garmentLengthMeasurement(142.24),
        ],
      }),

      makeSize({
        sizeId: "size-58",
        sizeLabel: "58",
        garmentMappedChart:
          garmentChart(147.32),
      }),
    ];

    const result =
      assessProductLengthReadiness(sizes);

    expect(result.status).toBe("READY");
    expect(result.evidencedSizeCount).toBe(2);
    expect(result.hasCompleteEvidence).toBe(true);
  });

  it("fails closed when one catalogue size has no usable garment-length evidence", () => {
    const sizes = [
      makeSize({
        sizeId: "size-56",
        sizeLabel: "56",
        productSizeMeasurements: [
          garmentLengthMeasurement(142.24),
        ],
      }),

      makeSize({
        sizeId: "size-58",
        sizeLabel: "58",
      }),
    ];

    const result =
      assessProductLengthReadiness(sizes);

    expect(result.status).toBe("NOT_READY");
    expect(result.catalogueSizeCount).toBe(2);
    expect(result.evidencedSizeCount).toBe(1);
    expect(result.hasCompleteEvidence).toBe(false);
  });

  it("does not treat mapped BODY chart evidence as garment-length evidence", () => {
    const sizes = [
      makeSize({
        sizeId: "size-58",
        sizeLabel: "58",

        mappedChart: bodyChart(147.32),
        bodyMappedChart:
          bodyChart(147.32),

        garmentMappedChart: null,
      }),
    ];

    expect(
      assessProductLengthReadiness(sizes)
    ).toEqual({
      status: "NOT_READY",
      catalogueSizeCount: 1,
      evidencedSizeCount: 0,
      hasCompleteEvidence: false,
    });
  });

  it("is NOT_READY when the product has no catalogue sizes", () => {
    expect(
      assessProductLengthReadiness([])
    ).toEqual({
      status: "NOT_READY",
      catalogueSizeCount: 0,
      evidencedSizeCount: 0,
      hasCompleteEvidence: false,
    });
  });
});