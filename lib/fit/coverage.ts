import {
  FitMeasurementType,
  HijabCoveragePreference,
  ProductType,
} from "@prisma/client";

export type CoverageAssessmentStatus =
  | "COMPATIBLE"
  | "BELOW_PREFERENCE"
  | "ABOVE_PREFERENCE"
  | "INSUFFICIENT_EVIDENCE"
  | "NOT_APPLICABLE";

export type CoverageAssessmentReason =
  | "WITHIN_PREFERRED_RANGE"
  | "BELOW_PREFERRED_RANGE"
  | "ABOVE_PREFERRED_RANGE"
  | "MISSING_COVERAGE_PREFERENCE"
  | "MISSING_COVERAGE_POLICY"
  | "UNSUPPORTED_MEASUREMENT"
  | "UNSUPPORTED_PRODUCT_TYPE";

export type CoverageRange = {
  minValueCm: number;
  maxValueCm: number;
};

export type CoverageAssessment = {
  productType: ProductType;

  measurementType: FitMeasurementType;

  garmentRange: CoverageRange;

  preference:
    | HijabCoveragePreference
    | null;

  preferredRange: CoverageRange | null;

  status: CoverageAssessmentStatus;
  reason: CoverageAssessmentReason;
};

export const COVERAGE_MEASUREMENT_TYPES = [
  FitMeasurementType.WIDTH,
  FitMeasurementType.FRONT_LENGTH,
  FitMeasurementType.BACK_LENGTH,
] as const;

export type CoverageMeasurementType =
  (typeof COVERAGE_MEASUREMENT_TYPES)[number];

const COVERAGE_MEASUREMENT_SET =
  new Set<FitMeasurementType>(
    COVERAGE_MEASUREMENT_TYPES
  );

const COVERAGE_PRODUCT_TYPES =
  new Set<ProductType>([
    ProductType.HIJAB,
    ProductType.KHIMAR,
  ]);

function isValidRange(
  range: CoverageRange
): boolean {
  return (
    Number.isFinite(range.minValueCm) &&
    Number.isFinite(range.maxValueCm) &&
    range.minValueCm >= 0 &&
    range.maxValueCm >= range.minValueCm
  );
}

export function assessCoverage(args: {
  productType: ProductType;

  measurementType: FitMeasurementType;

  garmentRange: CoverageRange;

  preference:
    | HijabCoveragePreference
    | null;

  preferredRange:
    | CoverageRange
    | null;
}): CoverageAssessment {
  const {
    productType,
    measurementType,
    garmentRange,
    preference,
    preferredRange,
  } = args;

  if (
    !COVERAGE_PRODUCT_TYPES.has(
      productType
    )
  ) {
    return {
      productType,
      measurementType,
      garmentRange,
      preference,
      preferredRange,
      status: "NOT_APPLICABLE",
      reason: "UNSUPPORTED_PRODUCT_TYPE",
    };
  }

  if (
    !COVERAGE_MEASUREMENT_SET.has(
      measurementType
    )
  ) {
    return {
      productType,
      measurementType,
      garmentRange,
      preference,
      preferredRange,
      status: "NOT_APPLICABLE",
      reason: "UNSUPPORTED_MEASUREMENT",
    };
  }

  if (!preference) {
    return {
      productType,
      measurementType,
      garmentRange,
      preference: null,
      preferredRange,
      status: "INSUFFICIENT_EVIDENCE",
      reason: "MISSING_COVERAGE_PREFERENCE",
    };
  }

  /*
   * STANDARD / GENEROUS / EXTRA_COVERAGE are
   * semantic shopper preferences.
   *
   * They do not become centimetre thresholds
   * until an explicit coverage policy supplies
   * the appropriate range for this product and
   * measurement type.
   */
  if (
    !preferredRange ||
    !isValidRange(preferredRange) ||
    !isValidRange(garmentRange)
  ) {
    return {
      productType,
      measurementType,
      garmentRange,
      preference,
      preferredRange,
      status: "INSUFFICIENT_EVIDENCE",
      reason: "MISSING_COVERAGE_POLICY",
    };
  }

  if (
    garmentRange.maxValueCm <
    preferredRange.minValueCm
  ) {
    return {
      productType,
      measurementType,
      garmentRange,
      preference,
      preferredRange,
      status: "BELOW_PREFERENCE",
      reason: "BELOW_PREFERRED_RANGE",
    };
  }

  if (
    garmentRange.minValueCm >
    preferredRange.maxValueCm
  ) {
    return {
      productType,
      measurementType,
      garmentRange,
      preference,
      preferredRange,
      status: "ABOVE_PREFERENCE",
      reason: "ABOVE_PREFERRED_RANGE",
    };
  }

  return {
    productType,
    measurementType,
    garmentRange,
    preference,
    preferredRange,
    status: "COMPATIBLE",
    reason: "WITHIN_PREFERRED_RANGE",
  };
}