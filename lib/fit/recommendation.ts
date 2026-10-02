import {
  FitGarmentComponent,
  FitMeasurementType,
  ProductType,
  FabricStretch,
  ProductIntendedFit,
  ShopperFitPreference,
} from "@prisma/client";

import {
  compareShopperToSizeMeasurement,
  type FitMeasurementComparison,
} from "@/lib/fit/comparison";

import {
  resolveSizeMeasurement,
  resolveSizeMeasurementEvidence,
  type BrandChartMeasurementInput,
  type ProductSizeMeasurementInput,
  type SizeMeasurementEvidenceResolution,
} from "@/lib/fit/measurements";

import {
  getProductMeasurementRules,
  type MeasurementRequirement,
} from "@/lib/fit/measurementRules";

import {
  interpretEaseContext,
  type EaseInterpretation,
} from "@/lib/fit/ease";

import {
  EASE_POLICIES,
  findEasePolicy,
  isEasePolicyMeasurement,
  type EasePolicy,
  type EasePolicyLookupResult,
} from "@/lib/fit/easePolicy";

import {
  assessGarmentEase,
  type GarmentEaseAssessment,
} from "@/lib/fit/garmentEase";
import {
  assessEvidenceDerivedFit,
  type EvidenceDerivedFitAssessment,
} from "@/lib/fit/evidenceDerivedFit";

import {
  assessEvidenceDerivedSuitability,
  type EvidenceDerivedSuitability,
} from "@/lib/fit/evidenceDerivedSuitability";

import {
  rankSizePreferenceCandidates,
  type SizePreferenceCandidate,
  type SizePreferenceDimension,
} from "@/lib/fit/sizePreferenceRanking";

export type ShopperMeasurementInput = {
  type: FitMeasurementType;
  valueCm: number;
};

export type SizeAssessmentStatus =
  | "SUITABLE"
  | "UNSUITABLE"
  | "NEEDS_GARMENT_EASE"
  | "INSUFFICIENT_EVIDENCE";

export type MeasurementAssessment = {
  requirement: MeasurementRequirement;

  required: boolean;

  comparison:
    | FitMeasurementComparison
    | null;

  easeInterpretation:
    | EaseInterpretation
    | null;

  easePolicy:
    | EasePolicyLookupResult
    | null;

  garmentEase:
    | GarmentEaseAssessment
    | null;

  evidence:
    SizeMeasurementEvidenceResolution;

  evidenceDerivedFit:
    EvidenceDerivedFitAssessment;
  evidenceDerivedSuitability:
     EvidenceDerivedSuitability;
};

export type SizeAssessment = {
  productType: ProductType;

  sizeId: string;
  sizeLabel: string;

  status: SizeAssessmentStatus;

  requiredMeasurements:
    readonly MeasurementAssessment[];

  optionalMeasurements:
    readonly MeasurementAssessment[];
};
export type MappedSizeChartInput = {
  measurementBasis:
    Parameters<
      typeof resolveSizeMeasurement
    >[0]["productMeasurementBasis"];

  measurements:
    readonly BrandChartMeasurementInput[];
};

export type AssessSizeInput = {
  productType: ProductType;

  sizeId: string;
  sizeLabel: string;
  intendedFit: ProductIntendedFit | null;
  stretch: FabricStretch;

  shopperFitPreference:
    ShopperFitPreference;

  productMeasurementBasis:
    Parameters<
      typeof resolveSizeMeasurement
    >[0]["productMeasurementBasis"];

  shopperMeasurements:
    readonly ShopperMeasurementInput[];

  productSizeMeasurements:
    readonly ProductSizeMeasurementInput[];

  mappedChart: MappedSizeChartInput | null;

   bodyMappedChart?: MappedSizeChartInput | null;

   garmentMappedChart?: MappedSizeChartInput | null;
    easePolicies?: readonly EasePolicy[];
};

export type ProductRecommendationStatus =
  | "RECOMMENDED"
  | "MULTIPLE_SUITABLE"
  | "NO_SUITABLE_SIZE"
  | "INSUFFICIENT_EVIDENCE"
  | "SIZE_RECOMMENDATION_NOT_APPLICABLE";

export type ProductSizeRecommendationInput =
  Omit<
    AssessSizeInput,
    | "sizeId"
    | "sizeLabel"
    | "productSizeMeasurements"
    | "mappedChart"
  > & {
    sizes: readonly {
      sizeId: string;
      sizeLabel: string;

      productSizeMeasurements:
        readonly ProductSizeMeasurementInput[];

      mappedChart: MappedSizeChartInput | null;

      bodyMappedChart?: MappedSizeChartInput | null;

      garmentMappedChart?: MappedSizeChartInput | null;
    }[];
  };

export type ProductRecommendation = {
  productType: ProductType;

  status: ProductRecommendationStatus;

  recommendedSize:
    | SizeAssessment
    | null;

  suitableSizes:
    readonly SizeAssessment[];

  assessments:
    readonly SizeAssessment[];
};

function getShopperMeasurement(
  measurements:
    readonly ShopperMeasurementInput[],
  type: FitMeasurementType
): number | null {
  const measurement =
    measurements.find(
      (candidate) =>
        candidate.type === type
    );

  return measurement?.valueCm ?? null;
}

function assessRequirement(args: {
  requirement: MeasurementRequirement;

  required: boolean;

  input: AssessSizeInput;
}): MeasurementAssessment {
  const {
    requirement,
    required,
    input,
  } = args;

  const component =
    requirement.component ??
    FitGarmentComponent.WHOLE_GARMENT;

  const bodyEvidence =
   resolveSizeMeasurement({
    type: requirement.type,
    component,
    basis: "BODY",

    productMeasurementBasis:
      input.productMeasurementBasis,

    productSizeMeasurements:
      input.productSizeMeasurements,

    mappedChart:
      input.bodyMappedChart ??
      (
        input.mappedChart?.measurementBasis ===
        "BODY"
          ? input.mappedChart
          : null
      ),
  });

const garmentEvidence =
  resolveSizeMeasurement({
    type: requirement.type,
    component,
    basis: "GARMENT",

    productMeasurementBasis:
      input.productMeasurementBasis,

    productSizeMeasurements:
      input.productSizeMeasurements,

    mappedChart:
      input.garmentMappedChart ??
      (
        input.mappedChart?.measurementBasis ===
        "GARMENT"
          ? input.mappedChart
          : null
      ),
  });

const evidence:
  SizeMeasurementEvidenceResolution = {
    type: requirement.type,
    component,
    body: bodyEvidence,
    garment: garmentEvidence,
  };

  const shopperValueCm =
    getShopperMeasurement(
      input.shopperMeasurements,
      requirement.type
    );

  const evidenceDerivedFit =
    assessEvidenceDerivedFit({
      evidence,
      shopperValueCm,
      intendedFit: input.intendedFit,
      stretch: input.stretch,
      shopperFitPreference:
        input.shopperFitPreference,
    });

  const evidenceDerivedSuitability =
     assessEvidenceDerivedSuitability(
      evidenceDerivedFit
  );
  /*
 * Legacy/general comparison authority.
 *
 * Product-size evidence may now carry its own semantic
 * basis, so this path must never perform a basis-less
 * lookup across mixed BODY/GARMENT evidence.
 *
 * Prefer resolved BODY evidence because BODY ranges are
 * directly comparable to shopper measurements.
 *
 * Otherwise use resolved GARMENT evidence, which then
 * continues through the calibrated ease interpretation
 * path below.
 */
const resolution =
  bodyEvidence.status === "RESOLVED"
    ? bodyEvidence
    : garmentEvidence.status === "RESOLVED"
      ? garmentEvidence
      : bodyEvidence.status === "INVALID"
        ? bodyEvidence
        : garmentEvidence.status === "INVALID"
          ? garmentEvidence
          : {
              status: "MISSING" as const,
              measurement: null,
            };

if (resolution.status !== "RESOLVED") {
  return {
    requirement,
    required,
    comparison: null,
    easeInterpretation: null,
    easePolicy: null,
    garmentEase: null,
    evidence,
    evidenceDerivedFit,
    evidenceDerivedSuitability,
  };
}

const resolved = resolution.measurement;



  const comparison =
    compareShopperToSizeMeasurement(
      resolved,
      shopperValueCm
    );

  /*
   * BODY measurements are already fully
   * interpreted by comparison.ts.
   */
  if (
    comparison.status !==
    "REQUIRES_EASE_INTERPRETATION"
  ) {
    return {
      requirement,
      required,
      comparison,
      easeInterpretation: null,
      easePolicy: null,
      garmentEase: null,
      evidence,
      evidenceDerivedFit,
      evidenceDerivedSuitability,
    };
  }

  /*
   * GARMENT evidence cannot be interpreted if
   * the shopper's corresponding body measurement
   * is missing.
   */
  if (shopperValueCm === null) {
    return {
      requirement,
      required,
      comparison,
      easeInterpretation: null,
      easePolicy: null,
      garmentEase: null,
      evidence,
      evidenceDerivedFit,
      evidenceDerivedSuitability,
    };
  }

  const easeInterpretation =
    interpretEaseContext({
      productType: input.productType,
      measurementType:
        requirement.type,

      intendedFit: input.intendedFit,
      stretch: input.stretch,

      shopperFitPreference:
        input.shopperFitPreference,
    });

  if (
    easeInterpretation.status !==
    "INTERPRETABLE" ||
    !input.intendedFit ||
    input.stretch ===
      FabricStretch.UNKNOWN
  ) {
    return {
      requirement,
      required,
      comparison,
      easeInterpretation,
      easePolicy: null,
      garmentEase: null,
      evidence,
      evidenceDerivedFit,
      evidenceDerivedSuitability,
    };
  }

  if (
  !isEasePolicyMeasurement(
    requirement.type
  )
) {
  return {
    requirement,
    required,
    comparison,
    easeInterpretation,
    easePolicy: null,
    garmentEase: null,
    evidence,
    evidenceDerivedFit,
    evidenceDerivedSuitability,
  };
}

  const easePolicy =
  findEasePolicy(
    {
      productType: input.productType,

      measurementType:
        requirement.type,

      intendedFit: input.intendedFit,
      stretch: input.stretch,

      shopperFitPreference:
        input.shopperFitPreference,
    },
    input.easePolicies ?? EASE_POLICIES
  );

  if (
    easePolicy.status !== "FOUND"
  ) {
    return {
      requirement,
      required,
      comparison,
      easeInterpretation,
      easePolicy,
      garmentEase: null,
      evidence,
      evidenceDerivedFit,
      evidenceDerivedSuitability,
    };
  }

  const garmentEase =
    assessGarmentEase(
      shopperValueCm,
      resolved.range,
      easePolicy.policy
    );

  return {
    requirement,
    required,
    comparison,
    easeInterpretation,
    easePolicy,
    garmentEase,
    evidence,
    evidenceDerivedFit,
    evidenceDerivedSuitability,
  };
}
function compareResolvedBodyEvidence(args: {
  assessment: MeasurementAssessment;
  shopperMeasurements:
    readonly ShopperMeasurementInput[];
}): FitMeasurementComparison | null {
  const { assessment, shopperMeasurements } = args;

  const bodyEvidence = assessment.evidence.body;

  if (bodyEvidence.status !== "RESOLVED") {
    return null;
  }

  const shopperValueCm =
    getShopperMeasurement(
      shopperMeasurements,
      assessment.requirement.type
    );

  return compareShopperToSizeMeasurement(
    bodyEvidence.measurement,
    shopperValueCm
  );
}

function determineSizeStatus(args: {
  requiredMeasurements:
    readonly MeasurementAssessment[];

  shopperMeasurements:
    readonly ShopperMeasurementInput[];
}): SizeAssessmentStatus {
  const {
    requiredMeasurements,
    shopperMeasurements,
  } = args;

  if (
    requiredMeasurements.length === 0
  ) {
    return "INSUFFICIENT_EVIDENCE";
  }
  /*
 * Verified BODY evidence is direct size-compatibility
 * authority.
 *
 * GARMENT/designed-ease evidence may explain how a
 * suitable size is intended to fit, but it must never
 * override a verified BODY range that excludes the
 * shopper.
 */
const bodyComparisons =
  requiredMeasurements.map((assessment) => ({
    assessment,
    comparison:
      compareResolvedBodyEvidence({
        assessment,
        shopperMeasurements,
      }),
  }));

if (
  bodyComparisons.some(
    ({ comparison }) =>
      comparison?.status === "BELOW_RANGE" ||
      comparison?.status === "ABOVE_RANGE"
  )
) {
  return "UNSUITABLE";
}
/*
 * Resolved canonical BODY evidence is authoritative
 * only when it can actually establish compatibility.
 *
 * Missing shopper measurements or otherwise
 * uninterpretable BODY comparisons must fail closed.
 *
 * Complete evidence-derived BODY + GARMENT evidence
 * is handled separately below and must not be vetoed
 * by the legacy compatibility channel.
 */
if (
  bodyComparisons.some(
    ({ assessment, comparison }) =>
      assessment.evidence.body.status === "RESOLVED" &&
      comparison?.status !== "MATCH"
  )
) {
  return "INSUFFICIENT_EVIDENCE";
}
  if (
  requiredMeasurements.some(
    (assessment) =>
      assessment.comparison === null &&
      assessment.evidenceDerivedSuitability
        .status !== "SUITABLE"
  )
) {
  return "INSUFFICIENT_EVIDENCE";
}


  /*
   * Direct BODY evidence can reject a size.
   */
  if (
    requiredMeasurements.some(
      (assessment) =>
        assessment.comparison?.status ===
          "BELOW_RANGE" ||
        assessment.comparison?.status ===
          "ABOVE_RANGE"
    )
  ) {
    return "UNSUITABLE";
  }

const garmentMeasurements =
  requiredMeasurements.filter(
    (assessment) =>
      assessment.comparison?.status ===
        "REQUIRES_EASE_INTERPRETATION" ||
      assessment.evidence.garment.status ===
        "RESOLVED"
  );

  /*
   * GARMENT authority transition:
   *
   * 1. Prefer complete evidence-derived suitability.
   * 2. Fall back to the legacy calibrated ease-policy
   *    path when evidence-derived fit is incomplete.
   * 3. If neither path can establish fit, preserve
   *    uncertainty.
   */
  for (const assessment of garmentMeasurements) {
    const evidenceDerived =
      assessment.evidenceDerivedSuitability;

    if (evidenceDerived.status === "SUITABLE") {
      continue;
    }

    /*
     * An ambiguous evidence-derived relationship is
     * deliberately not overridden by the legacy path.
     *
     * We have complete evidence, but that evidence does
     * not support a sufficiently clear relationship.
     */
    if (
      evidenceDerived.reason ===
      "AMBIGUOUS_FIT_RELATIONSHIP"
    ) {
      return "INSUFFICIENT_EVIDENCE";
    }

    /*
     * The evidence-derived path is incomplete.
     * Preserve the existing calibrated policy path as
     * a fallback during the migration.
     */
    const hasLegacyAssessment =
      assessment.easeInterpretation?.status ===
        "INTERPRETABLE" &&
      assessment.easePolicy?.status === "FOUND" &&
      assessment.garmentEase !== null;

    if (!hasLegacyAssessment) {
      return "INSUFFICIENT_EVIDENCE";
    }

    if (
      assessment.garmentEase?.status ===
        "TOO_LITTLE_EASE" ||
      assessment.garmentEase?.status ===
        "TOO_MUCH_EASE"
    ) {
      return "UNSUITABLE";
    }
  }
  /*
 * Every required measurement must have an
 * authoritative compatibility path before the size
 * can be declared suitable.
 *
 * A measurement is established when either:
 *
 * - verified BODY evidence directly matches the
 *   shopper, or
 * - complete evidence-derived BODY + GARMENT
 *   evidence establishes suitability, or
 * - the legacy calibrated GARMENT fallback has
 *   established acceptable ease.
 *
 * Unresolved/UNKNOWN evidence must never become
 * suitable merely by falling through this function.
 */
const everyRequiredMeasurementEstablished =
  requiredMeasurements.every((assessment) => {
    const bodyComparison =
      bodyComparisons.find(
        (candidate) =>
          candidate.assessment === assessment
      )?.comparison;

    if (bodyComparison?.status === "MATCH") {
      return true;
    }

    if (
      assessment.evidenceDerivedSuitability
        .status === "SUITABLE"
    ) {
      return true;
    }

    const hasSuitableLegacyGarmentAssessment =
      assessment.easeInterpretation?.status ===
        "INTERPRETABLE" &&
      assessment.easePolicy?.status === "FOUND" &&
      assessment.garmentEase?.status === "MATCH";

    return hasSuitableLegacyGarmentAssessment;
  });

if (!everyRequiredMeasurementEstablished) {
  return "INSUFFICIENT_EVIDENCE";
}

 /*
 * At this point every required measurement has been
 * established through either:
 *
 * - complete evidence-derived fit evidence, or
 * - the legacy calibrated ease-policy fallback.
 *
 * No required measurement has established
 * incompatibility or unresolved ambiguity.
 */
return "SUITABLE";
}

export function assessSize(
  input: AssessSizeInput
): SizeAssessment {
  const rules =
    getProductMeasurementRules(
      input.productType
    );

  const requiredMeasurements =
    rules.requiredBodyFit.map(
      (requirement) =>
        assessRequirement({
          requirement,
          required: true,
          input,
        })
    );

  const optionalMeasurements =
    rules.optionalBodyFit.map(
      (requirement) =>
        assessRequirement({
          requirement,
          required: false,
          input,
        })
    );

  const status =
  determineSizeStatus({
    requiredMeasurements,
    shopperMeasurements:
      input.shopperMeasurements,
  });
  return {
    productType: input.productType,

    sizeId: input.sizeId,
    sizeLabel: input.sizeLabel,

    status,

    requiredMeasurements,
    optionalMeasurements,
  };
}

export function assessProductSizes(
  input: ProductSizeRecommendationInput
): ProductRecommendation {
  const rules =
    getProductMeasurementRules(
      input.productType
    );

  /*
   * Some Veilora Fit experiences are intentionally
   * not conventional size recommendations.
   *
   * Hijabs and khimars, for example, belong to the
   * coverage path rather than S/M/L ranking.
   */
  if (!rules.supportsSizeRecommendation) {
    return {
      productType: input.productType,

      status:
        "SIZE_RECOMMENDATION_NOT_APPLICABLE",

      recommendedSize: null,
      suitableSizes: [],
      assessments: [],
    };
  }

  if (input.sizes.length === 0) {
    return {
      productType: input.productType,

      status: "INSUFFICIENT_EVIDENCE",

      recommendedSize: null,
      suitableSizes: [],
      assessments: [],
    };
  }

  const assessments =
    input.sizes.map((size) =>
      assessSize({
        productType:
          input.productType,

        sizeId: size.sizeId,
        sizeLabel: size.sizeLabel,

        intendedFit:
          input.intendedFit,

        stretch:
          input.stretch,

        shopperFitPreference:
          input.shopperFitPreference,

        productMeasurementBasis:
          input.productMeasurementBasis,

        shopperMeasurements:
          input.shopperMeasurements,

        productSizeMeasurements:
          size.productSizeMeasurements,

        mappedChart:
          size.mappedChart,
        bodyMappedChart:
          size.bodyMappedChart,
        garmentMappedChart:
          size.garmentMappedChart,
        easePolicies:
            input.easePolicies,
      })
    );

  const suitableSizes =
    assessments.filter(
      (assessment) =>
        assessment.status === "SUITABLE"
    );

  /*
   * Exactly one suitable size is the only situation
   * where the current evidence supports a unique
   * recommendation without further ranking logic.
   */
  if (suitableSizes.length === 1) {
    return {
      productType: input.productType,

      status: "RECOMMENDED",

      recommendedSize:
        suitableSizes[0],

      suitableSizes,
      assessments,
    };
  }

  /*
 * Multiple sizes can legitimately satisfy the
 * physical fit evidence.
 *
 * Shopper fit preference may resolve that ambiguity,
 * but only between sizes that are already suitable.
 *
 * Preference is not suitability authority and cannot
 * rescue an unsuitable size.
 */
if (suitableSizes.length > 1) {
  const preferenceCandidates:
    SizePreferenceCandidate[] =
      suitableSizes.map((size) => {
        const dimensions:
          SizePreferenceDimension[] = [];

        for (
          const measurement of
          size.requiredMeasurements
        ) {
          /*
           * Cross-size preference is based on the
           * shopper's actual garment room in each
           * already-suitable size.
           *
           * It deliberately does NOT reuse the
           * within-size designed-fit preference rank.
           */
          const actualEase =
  measurement.evidenceDerivedFit
    .actualEase;

/*
 * Cross-size preference requires calculated
 * actual garment room for every compared
 * required fit dimension.
 *
 * A missing or unresolved actual-ease assessment
 * is not converted into a preference signal.
 */
if (
  actualEase === null ||
  actualEase.status !== "CALCULATED"
) {
  continue;
}

dimensions.push({
  type: measurement.requirement.type,

  component:
    measurement.requirement.component ??
    FitGarmentComponent.WHOLE_GARMENT,

  actualEase: actualEase.range,
});
        }

        return {
          sizeId: size.sizeId,
          sizeLabel: size.sizeLabel,
          dimensions,
        };
      });

  const preferenceRanking =
    rankSizePreferenceCandidates({
      preference:
        input.shopperFitPreference,

      candidates:
        preferenceCandidates,
    });

  if (
    preferenceRanking.status ===
    "PREFERRED"
  ) {
    const preferredSize =
      suitableSizes.find(
        (size) =>
          size.sizeId ===
          preferenceRanking.preferred
            .candidate.sizeId
      );

    /*
     * Preference only ranks sizes that were already
     * established as suitable.
     *
     * It never changes physical suitability itself.
     */
    if (preferredSize) {
      return {
        productType: input.productType,

        status: "RECOMMENDED",

        recommendedSize: preferredSize,

        /*
         * Preserve every physically suitable size for
         * explanation and future PDP presentation.
         */
        suitableSizes,
        assessments,
      };
    }
  }

  /*
   * No unique evidence-backed preference winner.
   *
   * This includes:
   * - genuine cross-dimension trade-offs
   * - crossing actual-ease ranges
   * - REGULAR without an evidence-backed target
   * - incomplete cross-size preference evidence
   *
   * In all of those cases the truthful result remains
   * MULTIPLE_SUITABLE.
   */
  return {
    productType: input.productType,

    status: "MULTIPLE_SUITABLE",

    recommendedSize: null,

    suitableSizes,
    assessments,
  };
}

  const hasInsufficientEvidence =
    assessments.some(
      (assessment) =>
        assessment.status ===
          "INSUFFICIENT_EVIDENCE" ||
        assessment.status ===
          "NEEDS_GARMENT_EASE"
    );

  /*
   * If no size is currently suitable but at least
   * one candidate could not be fully assessed, we
   * cannot truthfully conclude that no size fits.
   */
  if (hasInsufficientEvidence) {
    return {
      productType: input.productType,

      status: "INSUFFICIENT_EVIDENCE",

      recommendedSize: null,
      suitableSizes: [],
      assessments,
    };
  }

  /*
   * Only when every assessed size has sufficient
   * evidence and all are unsuitable can Veilora
   * conclude that no suitable size was found.
   */
  return {
    productType: input.productType,

    status: "NO_SUITABLE_SIZE",

    recommendedSize: null,
    suitableSizes: [],
    assessments,
  };


}
