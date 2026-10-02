import {
  FitGarmentComponent,
  FitMeasurementType,
} from "@prisma/client";

import type {
  ResolvedSizeMeasurement,
  SizeMeasurementEvidenceResolution,
} from "@/lib/fit/measurements";

export type DesignedEaseRange = {
  minEaseCm: number;
  maxEaseCm: number;
};

export type DesignedEaseEvidence = {
  type: FitMeasurementType;
  component: FitGarmentComponent;

  range: DesignedEaseRange;

  bodyEvidence: ResolvedSizeMeasurement;
  garmentEvidence: ResolvedSizeMeasurement;
};

export type DesignedEaseResolution =
  | {
      status: "DERIVED";
      evidence: DesignedEaseEvidence;
    }
  | {
      status: "INSUFFICIENT_EVIDENCE";
      evidence: null;
    };

export function deriveDesignedEase(
  bodyEvidence: ResolvedSizeMeasurement,
  garmentEvidence: ResolvedSizeMeasurement
): DesignedEaseResolution {
  if (
    bodyEvidence.basis !== "BODY" ||
    garmentEvidence.basis !== "GARMENT"
  ) {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      evidence: null,
    };
  }

  if (
    bodyEvidence.type !== garmentEvidence.type ||
    bodyEvidence.component !==
      garmentEvidence.component
  ) {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      evidence: null,
    };
  }

  const minEaseCm =
    garmentEvidence.range.minValueCm -
    bodyEvidence.range.maxValueCm;

  const maxEaseCm =
    garmentEvidence.range.maxValueCm -
    bodyEvidence.range.minValueCm;

  return {
    status: "DERIVED",

    evidence: {
      type: bodyEvidence.type,
      component: bodyEvidence.component,

      range: {
        minEaseCm,
        maxEaseCm,
      },

      bodyEvidence,
      garmentEvidence,
    },
  };
}
export function deriveDesignedEaseFromResolution(
  resolution: SizeMeasurementEvidenceResolution
): DesignedEaseResolution {
  if (
    resolution.body.status !== "RESOLVED" ||
    resolution.garment.status !== "RESOLVED"
  ) {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      evidence: null,
    };
  }

  return deriveDesignedEase(
    resolution.body.measurement,
    resolution.garment.measurement
  );
}