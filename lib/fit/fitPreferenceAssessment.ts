import {
  FabricStretch,
  ProductIntendedFit,
  ShopperFitPreference,
} from "@prisma/client";

import type {
  DesignedFitRelationship,
} from "@/lib/fit/designedFitInterpretation";

import {
  assessFitPreferenceEligibility,
  type FitPreferenceEligibilityReason,
} from "@/lib/fit/fitPreferenceEligibility";

import {
  rankDesignedFitForPreference,
  type FitPreferenceRank,
} from "@/lib/fit/fitPreference";

export type FitPreferenceAssessmentInput = {
  relationship: DesignedFitRelationship;
  intendedFit: ProductIntendedFit | null;
  stretch: FabricStretch;
  preference: ShopperFitPreference;
};

export type FitPreferenceAssessment =
  | {
      status: "RANKED";
      relationship: DesignedFitRelationship;
      intendedFit: ProductIntendedFit;
      stretch: Exclude<FabricStretch, "UNKNOWN">;
      preference: ShopperFitPreference;
      eligibility: {
        status: "ELIGIBLE";
        reason: "ELIGIBLE";
      };
      ranking: FitPreferenceRank;
    }
  | {
      status: "NOT_RANKED";
      relationship: DesignedFitRelationship;
      intendedFit: ProductIntendedFit | null;
      stretch: FabricStretch;
      preference: ShopperFitPreference;
      eligibility: {
        status: "INELIGIBLE";
        reason: Exclude<
          FitPreferenceEligibilityReason,
          "ELIGIBLE"
        >;
      };
      ranking: null;
    };

export function assessFitPreference(
  input: FitPreferenceAssessmentInput
): FitPreferenceAssessment {
  const eligibility =
    assessFitPreferenceEligibility({
      relationship: input.relationship,
      intendedFit: input.intendedFit,
      stretch: input.stretch,
    });

  if (eligibility.status === "INELIGIBLE") {
    return {
      status: "NOT_RANKED",
      relationship: input.relationship,
      intendedFit: input.intendedFit,
      stretch: input.stretch,
      preference: input.preference,
      eligibility,
      ranking: null,
    };
  }

  const ranking =
    rankDesignedFitForPreference(
      input.relationship,
      input.preference
    );

  return {
    status: "RANKED",
    relationship: input.relationship,
    intendedFit:
      input.intendedFit as ProductIntendedFit,
    stretch:
      input.stretch as Exclude<
        FabricStretch,
        "UNKNOWN"
      >,
    preference: input.preference,
    eligibility,
    ranking,
  };
}