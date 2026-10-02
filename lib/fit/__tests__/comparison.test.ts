import { describe, expect, it } from "vitest";

import {
  FitGarmentComponent,
  FitMeasurementBasis,
  FitMeasurementType,
} from "@prisma/client";

import {
  compareShopperToSizeMeasurement,
} from "@/lib/fit/comparison";

const baseMeasurement = {
  type: FitMeasurementType.BUST,
  component:
    FitGarmentComponent.WHOLE_GARMENT,

  range: {
    minValueCm: 88,
    maxValueCm: 92,
  },

  source: "BRAND_SIZE_CHART" as const,
};

describe("Veilora Fit measurement comparison", () => {
  it("matches BODY evidence inside the range", () => {
    const result =
      compareShopperToSizeMeasurement(
        {
          ...baseMeasurement,
          basis: FitMeasurementBasis.BODY,
        },
        90
      );

    expect(result.status).toBe("MATCH");
    expect(result.reason).toBe(
      "BODY_WITHIN_RANGE"
    );
  });

  it("detects BODY evidence below the range", () => {
    const result =
      compareShopperToSizeMeasurement(
        {
          ...baseMeasurement,
          basis: FitMeasurementBasis.BODY,
        },
        86
      );

    expect(result.status).toBe(
      "BELOW_RANGE"
    );
  });

  it("detects BODY evidence above the range", () => {
    const result =
      compareShopperToSizeMeasurement(
        {
          ...baseMeasurement,
          basis: FitMeasurementBasis.BODY,
        },
        95
      );

    expect(result.status).toBe(
      "ABOVE_RANGE"
    );
  });

  it("treats BODY range boundaries as matches", () => {
    const minimum =
      compareShopperToSizeMeasurement(
        {
          ...baseMeasurement,
          basis: FitMeasurementBasis.BODY,
        },
        88
      );

    const maximum =
      compareShopperToSizeMeasurement(
        {
          ...baseMeasurement,
          basis: FitMeasurementBasis.BODY,
        },
        92
      );

    expect(minimum.status).toBe("MATCH");
    expect(maximum.status).toBe("MATCH");
  });

  it("requires ease interpretation for GARMENT evidence", () => {
    const result =
      compareShopperToSizeMeasurement(
        {
          ...baseMeasurement,
          basis:
            FitMeasurementBasis.GARMENT,
        },
        95
      );

    expect(result.status).toBe(
      "REQUIRES_EASE_INTERPRETATION"
    );

    expect(result.reason).toBe(
      "GARMENT_MEASUREMENT"
    );
  });

  it("does not interpret UNKNOWN basis", () => {
    const result =
      compareShopperToSizeMeasurement(
        {
          ...baseMeasurement,
          basis:
            FitMeasurementBasis.UNKNOWN,
        },
        90
      );

    expect(result.status).toBe(
      "INSUFFICIENT_EVIDENCE"
    );

    expect(result.reason).toBe(
      "UNKNOWN_MEASUREMENT_BASIS"
    );
  });

  it("returns insufficient evidence when the shopper measurement is missing", () => {
    const result =
      compareShopperToSizeMeasurement(
        {
          ...baseMeasurement,
          basis: FitMeasurementBasis.BODY,
        },
        null
      );

    expect(result.status).toBe(
      "INSUFFICIENT_EVIDENCE"
    );

    expect(result.reason).toBe(
      "MISSING_SHOPPER_MEASUREMENT"
    );
  });

  it("treats a zero shopper measurement as insufficient evidence", () => {
  const result =
    compareShopperToSizeMeasurement(
      {
        ...baseMeasurement,
        basis: FitMeasurementBasis.BODY,
      },
      0
    );

  expect(result.status).toBe(
    "INSUFFICIENT_EVIDENCE"
  );

  expect(result.reason).toBe(
    "MISSING_SHOPPER_MEASUREMENT"
  );

  expect(result.shopperValueCm).toBeNull();
});
});