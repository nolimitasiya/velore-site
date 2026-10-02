import {
  FitMeasurementBasis,
  FitMeasurementType,
} from "@prisma/client";

import type {
  FitMeasurementRange,
  ResolvedSizeMeasurement,
} from "@/lib/fit/measurements";

export type FitComparisonStatus =
  | "MATCH"
  | "BELOW_RANGE"
  | "ABOVE_RANGE"
  | "REQUIRES_EASE_INTERPRETATION"
  | "INSUFFICIENT_EVIDENCE";

export type FitComparisonReason =
  | "BODY_WITHIN_RANGE"
  | "BODY_BELOW_RANGE"
  | "BODY_ABOVE_RANGE"
  | "GARMENT_MEASUREMENT"
  | "UNKNOWN_MEASUREMENT_BASIS"
  | "MISSING_SHOPPER_MEASUREMENT";

export type FitMeasurementComparison = {
  type: FitMeasurementType;

  shopperValueCm: number | null;

  measurementRange: FitMeasurementRange;

  basis: FitMeasurementBasis;

  status: FitComparisonStatus;
  reason: FitComparisonReason;
};

function isValidShopperMeasurement(
  value: number | null | undefined
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  );
}

export function compareShopperToSizeMeasurement(
  measurement: ResolvedSizeMeasurement,
  shopperValueCm: number | null | undefined
): FitMeasurementComparison {
  if (!isValidShopperMeasurement(shopperValueCm)) {
    return {
      type: measurement.type,
      shopperValueCm: null,
      measurementRange: measurement.range,
      basis: measurement.basis,
      status: "INSUFFICIENT_EVIDENCE",
      reason: "MISSING_SHOPPER_MEASUREMENT",
    };
  }

  if (
    measurement.basis ===
    FitMeasurementBasis.UNKNOWN
  ) {
    return {
      type: measurement.type,
      shopperValueCm,
      measurementRange: measurement.range,
      basis: measurement.basis,
      status: "INSUFFICIENT_EVIDENCE",
      reason: "UNKNOWN_MEASUREMENT_BASIS",
    };
  }

  /*
   * BODY charts describe the body measurement
   * range the brand associates with this size.
   *
   * These ranges can therefore be compared
   * directly with the shopper's body measurement.
   */
  if (
    measurement.basis ===
    FitMeasurementBasis.BODY
  ) {
    if (
      shopperValueCm <
      measurement.range.minValueCm
    ) {
      return {
        type: measurement.type,
        shopperValueCm,
        measurementRange: measurement.range,
        basis: measurement.basis,
        status: "BELOW_RANGE",
        reason: "BODY_BELOW_RANGE",
      };
    }

    if (
      shopperValueCm >
      measurement.range.maxValueCm
    ) {
      return {
        type: measurement.type,
        shopperValueCm,
        measurementRange: measurement.range,
        basis: measurement.basis,
        status: "ABOVE_RANGE",
        reason: "BODY_ABOVE_RANGE",
      };
    }

    return {
      type: measurement.type,
      shopperValueCm,
      measurementRange: measurement.range,
      basis: measurement.basis,
      status: "MATCH",
      reason: "BODY_WITHIN_RANGE",
    };
  }

  /*
   * GARMENT measurements describe the garment,
   * not the body it is intended to fit.
   *
   * A direct body-vs-garment range comparison
   * would therefore be misleading. These need
   * the separate ease interpretation layer.
   */
  return {
    type: measurement.type,
    shopperValueCm,
    measurementRange: measurement.range,
    basis: measurement.basis,
    status: "REQUIRES_EASE_INTERPRETATION",
    reason: "GARMENT_MEASUREMENT",
  };
}