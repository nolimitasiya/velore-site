import {
  FabricStretch,
  ProductIntendedFit,
} from "@prisma/client";

import type {
  DesignedFitRelationship,
} from "@/lib/fit/designedFitInterpretation";

export type FitPreferenceEligibilityReason =
  | "ELIGIBLE"
  | "MISSING_INTENDED_FIT"
  | "UNKNOWN_STRETCH"
  | "AMBIGUOUS_FIT_RELATIONSHIP";

export type FitPreferenceEligibility =
  | {
      status: "ELIGIBLE";
      reason: "ELIGIBLE";
    }
  | {
      status: "INELIGIBLE";
      reason: Exclude<
        FitPreferenceEligibilityReason,
        "ELIGIBLE"
      >;
    };

export type AssessFitPreferenceEligibilityInput = {
  relationship: DesignedFitRelationship;

  intendedFit: ProductIntendedFit | null;

  stretch: FabricStretch;
};

export function assessFitPreferenceEligibility(
  input: AssessFitPreferenceEligibilityInput
): FitPreferenceEligibility {
  if (!input.intendedFit) {
    return {
      status: "INELIGIBLE",
      reason: "MISSING_INTENDED_FIT",
    };
  }

  if (input.stretch === "UNKNOWN") {
    return {
      status: "INELIGIBLE",
      reason: "UNKNOWN_STRETCH",
    };
  }

  if (
    input.relationship ===
    "AMBIGUOUS_AROUND_DESIGNED_FIT"
  ) {
    return {
      status: "INELIGIBLE",
      reason: "AMBIGUOUS_FIT_RELATIONSHIP",
    };
  }

  return {
    status: "ELIGIBLE",
    reason: "ELIGIBLE",
  };
}