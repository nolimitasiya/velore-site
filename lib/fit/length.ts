import {
  FitMeasurementType,
  ProductType,
} from "@prisma/client";

export type LengthAssessmentStatus =
  | "MATCH"
  | "SHORTER_THAN_PREFERENCE"
  | "LONGER_THAN_PREFERENCE"
  | "INSUFFICIENT_EVIDENCE"
  | "NOT_APPLICABLE";

export type LengthAssessmentReason =
  | "WITHIN_PREFERRED_RANGE"
  | "BELOW_PREFERRED_RANGE"
  | "ABOVE_PREFERRED_RANGE"
  | "MISSING_SHOPPER_REFERENCE"
  | "UNSUPPORTED_LENGTH_MEASUREMENT"
  | "UNSUPPORTED_PRODUCT_TYPE";

export type LengthReferenceRange = {
  minValueCm: number;
  maxValueCm: number;
};

export type LengthAssessment = {
  measurementType: FitMeasurementType;

  garmentRange: LengthReferenceRange;

  shopperReference: LengthReferenceRange | null;

  status: LengthAssessmentStatus;
  reason: LengthAssessmentReason;
};

/*
 * These measurements describe a linear garment
 * dimension that can meaningfully participate in
 * length assessment.
 */
export const LENGTH_MEASUREMENT_TYPES = [
  FitMeasurementType.SLEEVE_LENGTH,
  FitMeasurementType.INSEAM,
  FitMeasurementType.GARMENT_LENGTH,
  FitMeasurementType.FRONT_LENGTH,
  FitMeasurementType.BACK_LENGTH,
  FitMeasurementType.TOP_LENGTH,
  FitMeasurementType.SKIRT_LENGTH,
  FitMeasurementType.TROUSER_LENGTH,
] as const;

export type LengthMeasurementType =
  (typeof LENGTH_MEASUREMENT_TYPES)[number];

const LENGTH_MEASUREMENT_SET =
  new Set<FitMeasurementType>(
    LENGTH_MEASUREMENT_TYPES
  );

const LENGTH_PRODUCT_TYPES =
  new Set<ProductType>([
    ProductType.DRESS,
    ProductType.ABAYA,
    ProductType.SKIRT,
    ProductType.TOP,
    ProductType.ACTIVEWEAR,
    ProductType.SETS,
    ProductType.MATERNITY,
    ProductType.JILBAB,
    ProductType.COATS_JACKETS,
    ProductType.HOODIE_SWEATSHIRT,
    ProductType.PANTS,
    ProductType.BLAZER,
    ProductType.T_SHIRT,
  ]);

function isValidRange(
  range: LengthReferenceRange
): boolean {
  return (
    Number.isFinite(range.minValueCm) &&
    Number.isFinite(range.maxValueCm) &&
    range.minValueCm >= 0 &&
    range.maxValueCm >= range.minValueCm
  );
}

export function assessLength(args: {
  productType: ProductType;

  measurementType: FitMeasurementType;

  garmentRange: LengthReferenceRange;

  shopperReference:
    | LengthReferenceRange
    | null;
}): LengthAssessment {
  const {
    productType,
    measurementType,
    garmentRange,
    shopperReference,
  } = args;

  if (
    !LENGTH_PRODUCT_TYPES.has(productType)
  ) {
    return {
      measurementType,
      garmentRange,
      shopperReference,
      status: "NOT_APPLICABLE",
      reason: "UNSUPPORTED_PRODUCT_TYPE",
    };
  }

  if (
    !LENGTH_MEASUREMENT_SET.has(
      measurementType
    )
  ) {
    return {
      measurementType,
      garmentRange,
      shopperReference,
      status: "NOT_APPLICABLE",
      reason:
        "UNSUPPORTED_LENGTH_MEASUREMENT",
    };
  }

  /*
   * A garment length on its own is useful product
   * information, but it is not enough to say that
   * the garment will be short or long for a
   * particular shopper.
   */
  if (
    !shopperReference ||
    !isValidRange(shopperReference) ||
    !isValidRange(garmentRange)
  ) {
    return {
      measurementType,
      garmentRange,
      shopperReference,
      status: "INSUFFICIENT_EVIDENCE",
      reason: "MISSING_SHOPPER_REFERENCE",
    };
  }

  /*
   * Entire garment range is shorter than the
   * shopper's acceptable/preferred range.
   */
  if (
    garmentRange.maxValueCm <
    shopperReference.minValueCm
  ) {
    return {
      measurementType,
      garmentRange,
      shopperReference,
      status: "SHORTER_THAN_PREFERENCE",
      reason: "BELOW_PREFERRED_RANGE",
    };
  }

  /*
   * Entire garment range is longer than the
   * shopper's acceptable/preferred range.
   */
  if (
    garmentRange.minValueCm >
    shopperReference.maxValueCm
  ) {
    return {
      measurementType,
      garmentRange,
      shopperReference,
      status: "LONGER_THAN_PREFERENCE",
      reason: "ABOVE_PREFERRED_RANGE",
    };
  }

  /*
   * The garment range intersects the shopper's
   * acceptable/preferred range.
   */
  return {
    measurementType,
    garmentRange,
    shopperReference,
    status: "MATCH",
    reason: "WITHIN_PREFERRED_RANGE",
  };
}