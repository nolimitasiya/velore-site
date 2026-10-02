import {
  FabricStretch,
  ProductIntendedFit,
  ShopperFitPreference,
} from "@prisma/client";

import {
  calculateActualEase,
  type ActualEaseResolution,
} from "@/lib/fit/actualEase";

import {
  deriveDesignedEaseFromResolution,
  type DesignedEaseResolution,
} from "@/lib/fit/designedEase";

import {
  compareActualEaseRangeToDesignedEase,
  type DesignedEaseRangeComparison,
} from "@/lib/fit/designedEaseComparison";

import {
  interpretDesignedFit,
  type DesignedFitInterpretation,
} from "@/lib/fit/designedFitInterpretation";

import {
  assessFitPreference,
  type FitPreferenceAssessment,
} from "@/lib/fit/fitPreferenceAssessment";

import type {
  SizeMeasurementEvidenceResolution,
} from "@/lib/fit/measurements";

export type EvidenceDerivedFitFailureReason =
  | "DESIGNED_EASE_UNAVAILABLE"
  | "ACTUAL_EASE_UNAVAILABLE";

export type EvidenceDerivedFitAssessment =
  | {
      status: "ASSESSED";

      designedEase: Extract<
        DesignedEaseResolution,
        { status: "DERIVED" }
      >;

      actualEase: Extract<
        ActualEaseResolution,
        { status: "CALCULATED" }
      >;

      comparison: DesignedEaseRangeComparison;

      interpretation: DesignedFitInterpretation;

      preferenceAssessment: FitPreferenceAssessment;
    }
  | {
      status: "INSUFFICIENT_EVIDENCE";

      reason: EvidenceDerivedFitFailureReason;

      designedEase: DesignedEaseResolution;

      actualEase: ActualEaseResolution | null;

      comparison: null;
      interpretation: null;
      preferenceAssessment: null;
    };

export type AssessEvidenceDerivedFitInput = {
  evidence: SizeMeasurementEvidenceResolution;

  shopperValueCm: number | null;

  intendedFit: ProductIntendedFit | null;

  stretch: FabricStretch;

  shopperFitPreference: ShopperFitPreference;
};

export function assessEvidenceDerivedFit(
  input: AssessEvidenceDerivedFitInput
): EvidenceDerivedFitAssessment {
  const designedEase =
    deriveDesignedEaseFromResolution(
      input.evidence
    );

  if (designedEase.status !== "DERIVED") {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      reason: "DESIGNED_EASE_UNAVAILABLE",
      designedEase,
      actualEase: null,
      comparison: null,
      interpretation: null,
      preferenceAssessment: null,
    };
  }

  if (
    input.shopperValueCm === null ||
    input.evidence.garment.status !==
      "RESOLVED"
  ) {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      reason: "ACTUAL_EASE_UNAVAILABLE",
      designedEase,
      actualEase: null,
      comparison: null,
      interpretation: null,
      preferenceAssessment: null,
    };
  }

  const actualEase = calculateActualEase(
    input.shopperValueCm,
    input.evidence.garment.measurement.range
  );

  if (actualEase.status !== "CALCULATED") {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      reason: "ACTUAL_EASE_UNAVAILABLE",
      designedEase,
      actualEase,
      comparison: null,
      interpretation: null,
      preferenceAssessment: null,
    };
  }

  const comparison =
    compareActualEaseRangeToDesignedEase(
      actualEase.range,
      designedEase.evidence.range
    );

  const interpretation =
    interpretDesignedFit(comparison);

  const preferenceAssessment =
    assessFitPreference({
      relationship:
        interpretation.relationship,

      intendedFit: input.intendedFit,

      stretch: input.stretch,

      preference:
        input.shopperFitPreference,
    });

  return {
    status: "ASSESSED",
    designedEase,
    actualEase,
    comparison,
    interpretation,
    preferenceAssessment,
  };
}