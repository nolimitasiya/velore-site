import {
  FitGarmentComponent,
  FitMeasurementBasis,
  FitMeasurementType,
  ProductType,
} from "@prisma/client";

import {
  getProductMeasurementRules,
  type MeasurementRequirement,
} from "@/lib/fit/measurementRules";

export type ProductFitReadinessStatus =
  | "READY"
  | "ENHANCED"
  | "CONDITIONAL"
  | "NOT_READY"
  | "NOT_APPLICABLE";

export type ProductFitReadinessReason =
  | "BODY_EVIDENCE_COMPLETE"
  | "BODY_AND_GARMENT_EVIDENCE_COMPLETE"
  | "GARMENT_EVIDENCE_REQUIRES_EASE"
  | "MISSING_REQUIRED_BODY_EVIDENCE"
  | "INCOMPLETE_SIZE_MAPPING"
  | "NO_CATALOGUE_SIZES"
  | "SIZE_RECOMMENDATION_NOT_SUPPORTED"
  | "MISSING_PRODUCT_TYPE"
  | "MULTIPLE_PRODUCT_TYPES"
  | "DESIGNED_EASE_EVIDENCE_COMPLETE";

export type ProductFitReadinessMeasurement = {
  type: FitMeasurementType;
  component: FitGarmentComponent;
  basis: FitMeasurementBasis;
  minValueCm: number | null;
  maxValueCm: number | null;
};

export type ProductFitReadinessInput = {
  productTypes: readonly ProductType[];

  catalogueSizeCount: number;
  mappedSizeCount: number;

  measurements: readonly ProductFitReadinessMeasurement[];

  hasSufficientDesignedEaseEvidence: boolean;
};

export type ProductFitReadinessResult = {
  status: ProductFitReadinessStatus;
  reason: ProductFitReadinessReason;

  supportsSizeRecommendation: boolean;

  requiredBodyMeasurements: readonly MeasurementRequirement[];
  missingBodyMeasurements: readonly MeasurementRequirement[];

  hasBodyEvidence: boolean;
  hasGarmentEvidence: boolean;

  catalogueSizeCount: number;
  mappedSizeCount: number;
};

function measurementHasUsableRange(
  measurement: ProductFitReadinessMeasurement
) {
  return (
    measurement.minValueCm !== null ||
    measurement.maxValueCm !== null
  );
}

function requirementMatchesMeasurement(
  requirement: MeasurementRequirement,
  measurement: ProductFitReadinessMeasurement
) {
  if (measurement.type !== requirement.type) {
    return false;
  }

  /*
   * A component-specific requirement must be satisfied by
   * evidence for that same component.
   *
   * A component-less requirement is intentionally broader and
   * may be satisfied by that measurement type regardless of the
   * garment component attached to the evidence.
   */
  if (
    requirement.component !== undefined &&
    measurement.component !== requirement.component
  ) {
    return false;
  }

  return true;
}

function dedupeRequirements(
  requirements: readonly MeasurementRequirement[]
) {
  const seen = new Set<string>();

  return requirements.filter((requirement) => {
    const key = `${requirement.type}:${
      requirement.component ?? "*"
    }`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function assessProductFitReadiness(
  input: ProductFitReadinessInput
): ProductFitReadinessResult {
  const resolvedProductType =
  input.productTypes.length === 1
    ? input.productTypes[0]
    : null;

const rules =
  resolvedProductType !== null
    ? getProductMeasurementRules(
        resolvedProductType
      )
    : null;

const supportsSizeRecommendation =
  rules?.supportsSizeRecommendation ?? false;

const requiredBodyMeasurements =
  rules
    ? dedupeRequirements(rules.requiredBodyFit)
    : [];

  const usableMeasurements =
    input.measurements.filter(
      measurementHasUsableRange
    );

  const bodyMeasurements =
    usableMeasurements.filter(
      (measurement) =>
        measurement.basis === FitMeasurementBasis.BODY
    );

  const garmentMeasurements =
    usableMeasurements.filter(
      (measurement) =>
        measurement.basis === FitMeasurementBasis.GARMENT
    );

  const missingBodyMeasurements =
    requiredBodyMeasurements.filter(
      (requirement) =>
        !bodyMeasurements.some((measurement) =>
          requirementMatchesMeasurement(
            requirement,
            measurement
          )
        )
    );

  const hasBodyEvidence =
    requiredBodyMeasurements.length > 0 &&
    missingBodyMeasurements.length === 0;

  const hasGarmentEvidence =
    garmentMeasurements.length > 0;

  const baseResult = {
    supportsSizeRecommendation,
    requiredBodyMeasurements,
    missingBodyMeasurements,
    hasBodyEvidence,
    hasGarmentEvidence,
    catalogueSizeCount: input.catalogueSizeCount,
    mappedSizeCount: input.mappedSizeCount,
  };

  if (input.productTypes.length === 0) {
   return {
    ...baseResult,
    status: "NOT_READY",
    reason: "MISSING_PRODUCT_TYPE",
  };
}

if (input.productTypes.length > 1) {
  return {
    ...baseResult,
    status: "NOT_READY",
    reason: "MULTIPLE_PRODUCT_TYPES",
  };
}

  if (!supportsSizeRecommendation) {
    return {
      ...baseResult,
      status: "NOT_APPLICABLE",
      reason: "SIZE_RECOMMENDATION_NOT_SUPPORTED",
    };
  }

  if (input.catalogueSizeCount === 0) {
    return {
      ...baseResult,
      status: "NOT_READY",
      reason: "NO_CATALOGUE_SIZES",
    };
  }

  if (
    input.mappedSizeCount !==
    input.catalogueSizeCount
  ) {
    return {
      ...baseResult,
      status: "NOT_READY",
      reason: "INCOMPLETE_SIZE_MAPPING",
    };
  }

  if (hasBodyEvidence && hasGarmentEvidence) {
    return {
      ...baseResult,
      status: "ENHANCED",
      reason:
        "BODY_AND_GARMENT_EVIDENCE_COMPLETE",
    };
  }

  if (hasBodyEvidence) {
    return {
      ...baseResult,
      status: "READY",
      reason: "BODY_EVIDENCE_COMPLETE",
    };
  }

  if (
    hasGarmentEvidence &&
    !input.hasSufficientDesignedEaseEvidence
  ) {
    return {
      ...baseResult,
      status: "CONDITIONAL",
      reason: "GARMENT_EVIDENCE_REQUIRES_EASE",
    };
  }

 if (
  hasGarmentEvidence &&
  input.hasSufficientDesignedEaseEvidence
) {
  return {
    ...baseResult,
    status: "READY",
    reason: "DESIGNED_EASE_EVIDENCE_COMPLETE",
  };
}

  return {
    ...baseResult,
    status: "NOT_READY",
    reason: "MISSING_REQUIRED_BODY_EVIDENCE",
  };
}