import {
  FitGarmentComponent,
  FitMeasurementBasis,
  FitMeasurementRangeType,
  FitMeasurementType,
} from "@prisma/client";

import {
  resolveProductSizeGarmentLength,
  resolveProductSizeLengthMeasurement,
} from "@/lib/fit/resolveProductSizeGarmentLength";

import {
  describe,
  expect,
  it,
} from "vitest";

import type { ProductSizeRecommendationInput } from "@/lib/fit/recommendation";

type ProductSizeInput =
  ProductSizeRecommendationInput["sizes"][number];

function makeSize(
  overrides: Partial<ProductSizeInput> = {}
): ProductSizeInput {
  return {
    sizeId: "size-m",
    sizeLabel: "M",

    chartSortOrder: null,

    productSizeMeasurements: [],

    mappedChart: null,
    bodyMappedChart: null,
    garmentMappedChart: null,

    ...overrides,
  };
}

describe(
  "resolveProductSizeLengthMeasurement",
  () => {
    it(
      "prefers product-size-specific GARMENT inseam over mapped chart inseam",
      () => {
        const size = makeSize({
          productSizeMeasurements: [
            {
              type: FitMeasurementType.INSEAM,
              component:
                FitGarmentComponent.TROUSER,
              measurementBasis:
                FitMeasurementBasis.GARMENT,
                rangeType: FitMeasurementRangeType.RANGE,
              minValueCm: 76,
              maxValueCm: 77,
            },
          ],

          garmentMappedChart: {
            measurementBasis:
              FitMeasurementBasis.GARMENT,

            measurements: [
              {
                type: FitMeasurementType.INSEAM,
                component:
                  FitGarmentComponent.TROUSER,
                rangeType: FitMeasurementRangeType.RANGE,
                minValueCm: 80,
                maxValueCm: 81,
              },
            ],
          },
        });

        expect(
          resolveProductSizeLengthMeasurement(
            size,
            {
              measurementType:
                FitMeasurementType.INSEAM,
              component:
                FitGarmentComponent.TROUSER,
            }
          )
        ).toEqual({
          minValueCm: 76,
          maxValueCm: 77,
        });
      }
    );

    it(
      "falls back to mapped GARMENT chart inseam",
      () => {
        const size = makeSize({
          garmentMappedChart: {
            measurementBasis:
              FitMeasurementBasis.GARMENT,

            measurements: [
              {
                type: FitMeasurementType.INSEAM,
                component:
                  FitGarmentComponent.TROUSER,
                  rangeType: FitMeasurementRangeType.RANGE,
                minValueCm: 79,
                maxValueCm: 80,
              },
            ],
          },
        });

        expect(
          resolveProductSizeLengthMeasurement(
            size,
            {
              measurementType:
                FitMeasurementType.INSEAM,
              component:
                FitGarmentComponent.TROUSER,
            }
          )
        ).toEqual({
          minValueCm: 79,
          maxValueCm: 80,
        });
      }
    );

    it(
      "does not treat BODY-basis product-specific inseam as garment evidence",
      () => {
        const size = makeSize({
          productSizeMeasurements: [
            {
              type: FitMeasurementType.INSEAM,
              component:
                FitGarmentComponent.TROUSER,
              measurementBasis:
                FitMeasurementBasis.BODY,
              rangeType: FitMeasurementRangeType.RANGE,
              minValueCm: 76,
              maxValueCm: 76,
            },
          ],
        });

        expect(
          resolveProductSizeLengthMeasurement(
            size,
            {
              measurementType:
                FitMeasurementType.INSEAM,
              component:
                FitGarmentComponent.TROUSER,
            }
          )
        ).toBeNull();
      }
    );

    it(
      "does not substitute inseam evidence from another garment component",
      () => {
        const size = makeSize({
          productSizeMeasurements: [
            {
              type: FitMeasurementType.INSEAM,
              component:
                FitGarmentComponent.BOTTOM,
              measurementBasis:
                FitMeasurementBasis.GARMENT,
              rangeType: FitMeasurementRangeType.RANGE,
              minValueCm: 76,
              maxValueCm: 76,
            },
          ],

          garmentMappedChart: {
            measurementBasis:
              FitMeasurementBasis.GARMENT,

            measurements: [
              {
                type: FitMeasurementType.INSEAM,
                component:
                  FitGarmentComponent.BOTTOM,
                rangeType: FitMeasurementRangeType.RANGE,
                minValueCm: 78,
                maxValueCm: 78,
              },
            ],
          },
        });

        expect(
          resolveProductSizeLengthMeasurement(
            size,
            {
              measurementType:
                FitMeasurementType.INSEAM,
              component:
                FitGarmentComponent.TROUSER,
            }
          )
        ).toBeNull();
      }
    );
  }
);

describe(
  "resolveProductSizeGarmentLength",
  () => {
    it(
      "preserves the existing GARMENT_LENGTH behaviour",
      () => {
        const size = makeSize({
          productSizeMeasurements: [
            {
              type:
                FitMeasurementType.GARMENT_LENGTH,
              component:
                FitGarmentComponent.DRESS,
              measurementBasis:
                FitMeasurementBasis.GARMENT,
              rangeType: FitMeasurementRangeType.RANGE,
              minValueCm: 142,
              maxValueCm: 143,
            },
          ],
        });

        expect(
          resolveProductSizeGarmentLength(size)
        ).toEqual({
          minValueCm: 142,
          maxValueCm: 143,
        });
      }
    );
  }
);