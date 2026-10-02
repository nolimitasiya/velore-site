import {
  FabricStretch,
  FitMeasurementType,
  ProductIntendedFit,
  ProductType,
  ShopperFitPreference,
} from "@prisma/client";

export type EaseInterpretationStatus =
  | "INTERPRETABLE"
  | "INSUFFICIENT_EVIDENCE"
  | "NOT_APPLICABLE";

export type EaseInterpretationReason =
  | "GARMENT_EASE_SUPPORTED"
  | "MISSING_INTENDED_FIT"
  | "UNKNOWN_STRETCH"
  | "UNSUPPORTED_MEASUREMENT"
  | "UNSUPPORTED_PRODUCT_TYPE";

export type EaseContext = {
  productType: ProductType;
  measurementType: FitMeasurementType;

  intendedFit: ProductIntendedFit | null;
  stretch: FabricStretch;

  shopperFitPreference: ShopperFitPreference;
};

export type EaseInterpretation = {
  status: EaseInterpretationStatus;
  reason: EaseInterpretationReason;

  intendedFit: ProductIntendedFit | null;
  stretch: FabricStretch;
  shopperFitPreference: ShopperFitPreference;
};

/*
 * These are circumference/body-fit measurements for which
 * garment ease has a meaningful relationship to the
 * shopper's corresponding body measurement.
 *
 * Length and coverage measurements deliberately do not
 * belong here.
 */
const EASE_MEASUREMENT_TYPES =
  new Set<FitMeasurementType>([
    FitMeasurementType.BUST,
    FitMeasurementType.WAIST,
    FitMeasurementType.HIP,
  ]);

/*
 * Product types where conventional body-to-garment
 * ease interpretation is meaningful.
 *
 * Specialised coverage categories remain outside this
 * layer and are handled by their own rules.
 */
const EASE_PRODUCT_TYPES =
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

export function interpretEaseContext(
  context: EaseContext
): EaseInterpretation {
  if (
    !EASE_PRODUCT_TYPES.has(
      context.productType
    )
  ) {
    return {
      status: "NOT_APPLICABLE",
      reason: "UNSUPPORTED_PRODUCT_TYPE",
      intendedFit: context.intendedFit,
      stretch: context.stretch,
      shopperFitPreference:
        context.shopperFitPreference,
    };
  }

  if (
    !EASE_MEASUREMENT_TYPES.has(
      context.measurementType
    )
  ) {
    return {
      status: "NOT_APPLICABLE",
      reason: "UNSUPPORTED_MEASUREMENT",
      intendedFit: context.intendedFit,
      stretch: context.stretch,
      shopperFitPreference:
        context.shopperFitPreference,
    };
  }

  if (!context.intendedFit) {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      reason: "MISSING_INTENDED_FIT",
      intendedFit: null,
      stretch: context.stretch,
      shopperFitPreference:
        context.shopperFitPreference,
    };
  }

  if (
    context.stretch ===
    FabricStretch.UNKNOWN
  ) {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      reason: "UNKNOWN_STRETCH",
      intendedFit: context.intendedFit,
      stretch: context.stretch,
      shopperFitPreference:
        context.shopperFitPreference,
    };
  }

  return {
    status: "INTERPRETABLE",
    reason: "GARMENT_EASE_SUPPORTED",
    intendedFit: context.intendedFit,
    stretch: context.stretch,
    shopperFitPreference:
      context.shopperFitPreference,
  };
}