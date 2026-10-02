import {
  FitGarmentComponent,
  FitMeasurementType,
  ProductType,
  ProductLengthStructure,
} from "@prisma/client";

import {
  assessLength,
  type LengthAssessment,
  type LengthReferenceRange,
} from "@/lib/fit/length";

import type {
  ProductSizeRecommendationInput,
} from "@/lib/fit/recommendation";
import type {
  NormalizedProductLengthInput,
} from "@/lib/fit/loadRecommendationInput";

import { resolveProductSizeGarmentLength } from "@/lib/fit/resolveProductSizeGarmentLength";

export type ProductSizeLengthAssessment = {
  sizeId: string;
  sizeLabel: string;
  assessment: LengthAssessment;
};

export type IndependentLengthOptionAssessment = {
  optionId: string;
  optionLabel: string;
  valueCm: number;
  assessment: LengthAssessment;
};

export type IndependentProductLengthAssessmentResult =
  | {
      status: "ASSESSED";
      structure: "INDEPENDENT";
      assessments:
        IndependentLengthOptionAssessment[];
    }
  | {
      status: "INSUFFICIENT_EVIDENCE";
      structure: "INDEPENDENT";
      assessments: [];
      reason:
        | "MISSING_SHOPPER_PREFERENCE"
        | "MISSING_GARMENT_LENGTH";
    }
  | {
      status: "NOT_APPLICABLE";
      assessments: [];
    };

export type ProductLengthAssessmentResult =
  | {
      status: "ASSESSED";
      structure:
        | "SIZE_DEPENDENT"
        | "LENGTH_BASED_SIZE";
      assessments:
        ProductSizeLengthAssessment[];
    }
  | {
      status: "INSUFFICIENT_EVIDENCE";
      structure:
        | "SIZE_DEPENDENT"
        | "LENGTH_BASED_SIZE";
      assessments: [];
      reason:
        | "MISSING_SHOPPER_PREFERENCE"
        | "MISSING_GARMENT_LENGTH";
    }
  | {
      status: "NOT_APPLICABLE";
      assessments: [];
    };

const MAXI_LENGTH_PRODUCT_TYPES =
  new Set<ProductType>([
    ProductType.DRESS,
    ProductType.ABAYA,
    ProductType.JILBAB,
  ]);

function findShopperMaxiLength(
  input: ProductSizeRecommendationInput
): LengthReferenceRange | null {
  const measurement =
    input.shopperMeasurements.find(
      (candidate) =>
        candidate.type ===
        FitMeasurementType.GARMENT_LENGTH
    );

  if (!measurement) {
    return null;
  }

  return {
    minValueCm: measurement.valueCm,
    maxValueCm: measurement.valueCm,
  };
}

export function assessProductLengths(
  args: {
    input: ProductSizeRecommendationInput;
    structure:
      | "SIZE_DEPENDENT"
      | "LENGTH_BASED_SIZE";
  }
): ProductLengthAssessmentResult {
  const { input, structure } = args;
  if (
    !MAXI_LENGTH_PRODUCT_TYPES.has(
      input.productType
    )
  ) {
    return {
      status: "NOT_APPLICABLE",
      assessments: [],
    };
  }

  const shopperReference =
    findShopperMaxiLength(input);

  if (!shopperReference) {
    return {
  status: "INSUFFICIENT_EVIDENCE",
  structure,
  assessments: [],
  reason: "MISSING_SHOPPER_PREFERENCE",
};
  }

  const assessments:
    ProductSizeLengthAssessment[] = [];

  for (const size of input.sizes) {
    /*
 * Product-size-specific garment evidence takes
 * precedence only when that individual measurement
 * has resolved to the GARMENT basis.
 *
 * The loader resolves inherited null basis values
 * before this engine boundary, so BODY and UNKNOWN
 * must never be treated as garment evidence merely
 * because the product-level basis is GARMENT.
 */
/*
 * Resolve length evidence through the shared
 * production precedence:
 *
 * 1. Product-size-specific GARMENT evidence
 * 2. Mapped GARMENT chart evidence
 * 3. No usable evidence
 */
const garmentRange =
  resolveProductSizeGarmentLength(size);

    if (!garmentRange) {
  /*
   * For LENGTH_BASED_SIZE, every ProductSize is itself
   * a purchasable length choice.
   *
   * The catalogue must therefore be complete before
   * Veilora can assess or recommend from the set.
   *
   * Never silently omit an unevidenced size and never
   * infer garment length from a numeric-looking label.
   *
   * SIZE_DEPENDENT retains its existing behaviour:
   * length is supplemental to the conventional size,
   * so sizes without length evidence may be skipped.
   */
  if (structure === "LENGTH_BASED_SIZE") {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      structure,
      assessments: [],
      reason: "MISSING_GARMENT_LENGTH",
    };
  }

  continue;
}

    assessments.push({
      sizeId: size.sizeId,
      sizeLabel: size.sizeLabel,

      assessment: assessLength({
        productType: input.productType,
        measurementType:
          FitMeasurementType.GARMENT_LENGTH,
        garmentRange,
        shopperReference,
      }),
    });
  }

  if (assessments.length === 0) {
    return {
  status: "INSUFFICIENT_EVIDENCE",
  structure,
  assessments: [],
  reason: "MISSING_GARMENT_LENGTH",
};
  }

  return {
    status: "ASSESSED",
    structure,
    assessments,
  };
}

export function assessIndependentProductLengths(
  args: {
    productType: ProductType;
    shopperMeasurements:
      ProductSizeRecommendationInput["shopperMeasurements"];
    lengthInput: NormalizedProductLengthInput;
  }
): IndependentProductLengthAssessmentResult {
  const {
    productType,
    shopperMeasurements,
    lengthInput,
  } = args;

  if (
    !MAXI_LENGTH_PRODUCT_TYPES.has(productType) ||
    lengthInput.structure !==
      ProductLengthStructure.INDEPENDENT
  ) {
    return {
      status: "NOT_APPLICABLE",
      assessments: [],
    };
  }

  const shopperMeasurement =
    shopperMeasurements.find(
      (candidate) =>
        candidate.type ===
        FitMeasurementType.GARMENT_LENGTH
    );

  if (!shopperMeasurement) {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      structure: "INDEPENDENT",
      assessments: [],
      reason: "MISSING_SHOPPER_PREFERENCE",
    };
  }

  const shopperReference: LengthReferenceRange = {
    minValueCm: shopperMeasurement.valueCm,
    maxValueCm: shopperMeasurement.valueCm,
  };

  const assessments:
    IndependentLengthOptionAssessment[] = [];

  for (const option of lengthInput.options) {
    /*
     * An option may legitimately exist in the catalogue
     * without normalized numerical evidence.
     *
     * Never infer length from its label or source value.
     */
    if (option.valueCm === null) {
      continue;
    }

    const garmentRange: LengthReferenceRange = {
      minValueCm: option.valueCm,
      maxValueCm: option.valueCm,
    };

    assessments.push({
      optionId: option.id,
      optionLabel: option.label,
      valueCm: option.valueCm,

      assessment: assessLength({
        productType,
        measurementType:
          FitMeasurementType.GARMENT_LENGTH,
        garmentRange,
        shopperReference,
      }),
    });
  }

  if (assessments.length === 0) {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      structure: "INDEPENDENT",
      assessments: [],
      reason: "MISSING_GARMENT_LENGTH",
    };
  }

  return {
    status: "ASSESSED",
    structure: "INDEPENDENT",
    assessments,
  };
}