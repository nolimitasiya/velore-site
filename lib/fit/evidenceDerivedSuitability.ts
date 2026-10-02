import type {
  EvidenceDerivedFitAssessment,
} from "@/lib/fit/evidenceDerivedFit";

export type EvidenceDerivedSuitabilityReason =
  | "CREDIBLE_FIT"
  | "INSUFFICIENT_FIT_EVIDENCE"
  | "AMBIGUOUS_FIT_RELATIONSHIP";

export type EvidenceDerivedSuitability =
  | {
      status: "SUITABLE";
      reason: "CREDIBLE_FIT";
    }
  | {
      status: "INSUFFICIENT_EVIDENCE";
      reason:
        | "INSUFFICIENT_FIT_EVIDENCE"
        | "AMBIGUOUS_FIT_RELATIONSHIP";
    };

export function assessEvidenceDerivedSuitability(
  assessment: EvidenceDerivedFitAssessment
): EvidenceDerivedSuitability {
  if (assessment.status !== "ASSESSED") {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      reason: "INSUFFICIENT_FIT_EVIDENCE",
    };
  }

  if (
    assessment.interpretation.relationship ===
    "AMBIGUOUS_AROUND_DESIGNED_FIT"
  ) {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      reason: "AMBIGUOUS_FIT_RELATIONSHIP",
    };
  }

  return {
    status: "SUITABLE",
    reason: "CREDIBLE_FIT",
  };
}