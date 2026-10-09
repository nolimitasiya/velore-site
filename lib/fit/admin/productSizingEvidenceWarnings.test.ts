import { describe, expect, it } from "vitest";

import {
  FitGarmentComponent,
  FitMeasurementBasis,
  FitMeasurementRangeType,
  FitMeasurementType,
  ProductType,
} from "@prisma/client";

import {
  assessProductSizingEvidenceWarnings,
} from "./productSizingEvidenceWarnings";

const bust = {
  type: FitMeasurementType.BUST,
  component: FitGarmentComponent.TOP,
};

const waist = {
  type: FitMeasurementType.WAIST,
  component: FitGarmentComponent.TOP,
};

function measurement(
  type: FitMeasurementType,
  minValueCm = 80,
  maxValueCm = 100,
  basis: FitMeasurementBasis = FitMeasurementBasis.BODY
) {
  return {
    type,
    component: FitGarmentComponent.TOP,
    measurementBasis: basis,
    rangeType: FitMeasurementRangeType.RANGE,
    minValueCm,
    maxValueCm,
  };
}

function assess({
  requirements = [bust, waist],
  measurements = [measurement(FitMeasurementType.BUST)],
  mappedChart = null,
}: {
  requirements?: {
  type: FitMeasurementType;
  component: FitGarmentComponent;
}[];
  measurements?: ReturnType<typeof measurement>[];
  mappedChart?: {
    measurementBasis: FitMeasurementBasis;
    measurements: {
      type: FitMeasurementType;
      component: FitGarmentComponent;
      rangeType: FitMeasurementRangeType;
      minValueCm: number;
      maxValueCm: number;
    }[];
  } | null;
} = {}) {
  return assessProductSizingEvidenceWarnings({
    productTypes: [ProductType.TOP],
    fitComponents: [FitGarmentComponent.TOP],
    explicitRequiredBodyFit: requirements,
    productMeasurementBasis: FitMeasurementBasis.BODY,
    sizes: [
      {
        sizeId: "size-m",
        sizeName: "M",
        productSizeMeasurements: measurements,
        mappedChart,
      },
    ],
  });
}

describe("product sizing evidence warnings", () => {
  it("warns when an explicitly required waist measurement is missing", () => {
    expect(assess()).toEqual([
      {
        sizeId: "size-m",
        sizeName: "M",
        type: FitMeasurementType.WAIST,
        component: FitGarmentComponent.TOP,
        reason: "MISSING",
      },
    ]);
  });

  it("does not require waist when only bust is selected", () => {
    expect(assess({ requirements: [bust] })).toEqual([]);
  });

  it("uses product-type defaults when no requirements are selected", () => {
    expect(assess({ requirements: [] })).toEqual([]);
  });

  it("warns when a required measurement has an invalid range", () => {
    const warnings = assess({
      requirements: [bust],
      measurements: [
        measurement(FitMeasurementType.BUST, 110, 90),
      ],
    });

    expect(warnings).toEqual([
      {
        sizeId: "size-m",
        sizeName: "M",
        type: FitMeasurementType.BUST,
        component: FitGarmentComponent.TOP,
        reason: "INVALID",
      },
    ]);
  });

  it("accepts valid BODY measurements from a mapped brand chart", () => {
    expect(
      assess({
        requirements: [bust, waist],
        measurements: [],
        mappedChart: {
          measurementBasis: FitMeasurementBasis.BODY,
          measurements: [
            {
              type: FitMeasurementType.BUST,
              component: FitGarmentComponent.TOP,
              rangeType: FitMeasurementRangeType.RANGE,
              minValueCm: 80,
              maxValueCm: 100,
            },
            {
              type: FitMeasurementType.WAIST,
              component: FitGarmentComponent.TOP,
              rangeType: FitMeasurementRangeType.RANGE,
              minValueCm: 65,
              maxValueCm: 85,
            },
          ],
        },
      })
    ).toEqual([]);
  });

  it("does not treat GARMENT measurements as BODY evidence", () => {
    const warnings = assess({
      requirements: [bust],
      measurements: [
        measurement(
          FitMeasurementType.BUST,
          90,
          110,
          FitMeasurementBasis.GARMENT
        ),
      ],
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0].reason).toBe("MISSING");
  });

  it("accepts valid UPPER_BOUND body evidence", () => {
    expect(
      assess({
        requirements: [bust],
        measurements: [],
        mappedChart: {
          measurementBasis: FitMeasurementBasis.BODY,
          measurements: [
            {
              type: FitMeasurementType.BUST,
              component: FitGarmentComponent.TOP,
              rangeType: FitMeasurementRangeType.UPPER_BOUND,
              minValueCm: 0,
              maxValueCm: 100,
            },
          ],
        },
      })
    ).toEqual([]);
  });
});