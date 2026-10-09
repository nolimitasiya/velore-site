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

import {
  resolveProductSizeGarmentLength,
  resolveProductSizeLengthMeasurement,
} from "@/lib/fit/resolveProductSizeGarmentLength";

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
      measurementType: FitMeasurementType;
      assessments:
        IndependentLengthOptionAssessment[];
    }
  | {
      status: "INSUFFICIENT_EVIDENCE";
      structure: "INDEPENDENT";
      measurementType: FitMeasurementType;
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
      measurementType: FitMeasurementType;
      assessments:
        ProductSizeLengthAssessment[];
    }
  | {
      status: "INSUFFICIENT_EVIDENCE";
      structure:
        | "SIZE_DEPENDENT"
        | "LENGTH_BASED_SIZE";
      measurementType: FitMeasurementType;
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

  type SizeAttachedLengthSemantic = {
  shopperMeasurementType: FitMeasurementType;
  garmentMeasurementType: FitMeasurementType;
  garmentComponent?: FitGarmentComponent;
};

function getSizeAttachedLengthSemantic(
  productType: ProductType,
  fitComponents: readonly FitGarmentComponent[] = []
): SizeAttachedLengthSemantic | null {
  if (MAXI_LENGTH_PRODUCT_TYPES.has(productType)) {
    return {
      shopperMeasurementType:
        FitMeasurementType.GARMENT_LENGTH,

      garmentMeasurementType:
        FitMeasurementType.GARMENT_LENGTH,
    };
  }



  if (productType === ProductType.SKIRT) {
  return {
    shopperMeasurementType:
      FitMeasurementType.SKIRT_LENGTH,

    garmentMeasurementType:
      FitMeasurementType.SKIRT_LENGTH,

    garmentComponent:
      FitGarmentComponent.SKIRT,
  };
}


  if (productType === ProductType.PANTS) {
    return {
      shopperMeasurementType:
        FitMeasurementType.INSEAM,

      garmentMeasurementType:
        FitMeasurementType.INSEAM,

      garmentComponent:
        FitGarmentComponent.TROUSER,
    };
  }

    if (productType === ProductType.ACTIVEWEAR) {
    const uniqueComponents =
      new Set(fitComponents);

    const isTrouserOnly =
      uniqueComponents.size === 1 &&
      uniqueComponents.has(
        FitGarmentComponent.TROUSER
      );

    const isTopTrouser =
      uniqueComponents.size === 2 &&
      uniqueComponents.has(
        FitGarmentComponent.TOP
      ) &&
      uniqueComponents.has(
        FitGarmentComponent.TROUSER
      );

    if (isTrouserOnly || isTopTrouser) {
      return {
        shopperMeasurementType:
          FitMeasurementType.INSEAM,

        garmentMeasurementType:
          FitMeasurementType.INSEAM,

        garmentComponent:
          FitGarmentComponent.TROUSER,
      };
    }

    /*
     * TOP-only activewear deliberately has no
     * personalised length semantic.
     *
     * Missing or unsupported activewear
     * composition also fails closed here.
     */
    return null;
  }
  if (productType === ProductType.SETS) {
    const uniqueComponents =
      new Set(fitComponents);

    const isTopTrouserSet =
      uniqueComponents.size === 2 &&
      uniqueComponents.has(
        FitGarmentComponent.TOP
      ) &&
      uniqueComponents.has(
        FitGarmentComponent.TROUSER
      );

    if (isTopTrouserSet) {
      return {
        shopperMeasurementType:
          FitMeasurementType.INSEAM,

        garmentMeasurementType:
          FitMeasurementType.INSEAM,

        garmentComponent:
          FitGarmentComponent.TROUSER,
      };
    }

   /*
 * TOP + SKIRT sets deliberately have no
 * personalised length semantic yet.
 *
 * Veilora supports preferred skirt length for
 * standalone SKIRT products, but set-skirt length
 * remains intentionally unsupported for now.
 *
 * Never reinterpret preferred maxi length as a
 * skirt-length preference.
 */
return null;
  }

  return null;
}

function findShopperLengthReference(
  input: ProductSizeRecommendationInput,
  measurementType: FitMeasurementType
): LengthReferenceRange | null {
  const measurement =
    input.shopperMeasurements.find(
      (candidate) =>
        candidate.type === measurementType
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

const semantic =
  getSizeAttachedLengthSemantic(
    input.productType,
    input.fitComponents
  );

if (!semantic) {
  return {
    status: "NOT_APPLICABLE",
    assessments: [],
  };
}

const shopperReference =
  findShopperLengthReference(
    input,
    semantic.shopperMeasurementType
  );

if (!shopperReference) {
  return {
    status: "INSUFFICIENT_EVIDENCE",
    structure,
    measurementType:
  semantic.garmentMeasurementType,
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
  semantic.garmentMeasurementType ===
  FitMeasurementType.GARMENT_LENGTH
    ? resolveProductSizeGarmentLength(size)
    : resolveProductSizeLengthMeasurement(
        size,
        {
          measurementType:
            semantic.garmentMeasurementType,

          component:
            semantic.garmentComponent,
        }
      );

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
      measurementType: semantic.garmentMeasurementType,
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
    semantic.garmentMeasurementType,
  garmentRange,
  shopperReference,
}),
    });
  }

  if (assessments.length === 0) {
    return {
  status: "INSUFFICIENT_EVIDENCE",
  structure,
  measurementType:
  semantic.garmentMeasurementType,
  assessments: [],
  reason: "MISSING_GARMENT_LENGTH",
};
  }

  return {
    status: "ASSESSED",
    structure,
    measurementType:
      semantic.garmentMeasurementType,
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
      measurementType: FitMeasurementType.GARMENT_LENGTH,
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
      measurementType: FitMeasurementType.GARMENT_LENGTH,
      assessments: [],
      reason: "MISSING_GARMENT_LENGTH",
    };
  }

  return {
    status: "ASSESSED",
    structure: "INDEPENDENT",
    measurementType: FitMeasurementType.GARMENT_LENGTH,
    assessments,
  };
}