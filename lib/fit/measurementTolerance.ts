import type {
  FitMeasurementRange,
} from "@/lib/fit/measurements";

/*
 * Manufacturing tolerance describes variation
 * in the finished garment declared or verified
 * from catalogue evidence.
 *
 * It is NOT:
 * - shopper measurement uncertainty
 * - garment ease
 * - a universal Veilora allowance
 */
export type GarmentManufacturingTolerance = {
  minusCm: number;
  plusCm: number;
};

export type ApplyManufacturingToleranceResult =
  | {
      status: "APPLIED";
      range: FitMeasurementRange;
    }
  | {
      status: "INVALID_TOLERANCE";
      range: FitMeasurementRange;
    };

function isValidTolerance(
  tolerance: GarmentManufacturingTolerance
): boolean {
  return (
    Number.isFinite(tolerance.minusCm) &&
    Number.isFinite(tolerance.plusCm) &&
    tolerance.minusCm >= 0 &&
    tolerance.plusCm >= 0
  );
}

export function applyManufacturingTolerance(
  range: FitMeasurementRange,
  tolerance: GarmentManufacturingTolerance
): ApplyManufacturingToleranceResult {
  if (!isValidTolerance(tolerance)) {
    return {
      status: "INVALID_TOLERANCE",
      range,
    };
  }

  return {
    status: "APPLIED",

    range: {
      minValueCm: Math.max(
        0,
        range.minValueCm - tolerance.minusCm
      ),

      maxValueCm:
        range.maxValueCm + tolerance.plusCm,
    },
  };
}