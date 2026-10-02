import { describe, expect, it } from "vitest";

import {
  assessEvidenceDerivedSuitability,
} from "@/lib/fit/evidenceDerivedSuitability";

import type {
  EvidenceDerivedFitAssessment,
} from "@/lib/fit/evidenceDerivedFit";

type AssessedEvidenceDerivedFit = Extract<
  EvidenceDerivedFitAssessment,
  { status: "ASSESSED" }
>;

type DesignedFitRelationship =
  AssessedEvidenceDerivedFit["interpretation"]["relationship"];

function assessed(
  relationship: DesignedFitRelationship
): AssessedEvidenceDerivedFit {
  return {
    status: "ASSESSED",

    designedEase: {
      status: "DERIVED",
      evidence: {
        type: "BUST",
        component: "WHOLE_GARMENT",
        range: {
          minEaseCm: 6,
          maxEaseCm: 10,
        },
        bodyEvidence: {
          type: "BUST",
          component: "WHOLE_GARMENT",
          range: {
            minValueCm: 88,
            maxValueCm: 90,
          },
          basis: "BODY",
          source: "BRAND_SIZE_CHART",
        },
        garmentEvidence: {
          type: "BUST",
          component: "WHOLE_GARMENT",
          range: {
            minValueCm: 96,
            maxValueCm: 98,
          },
          basis: "GARMENT",
          source: "BRAND_SIZE_CHART",
        },
      },
    },

    actualEase: {
      status: "CALCULATED",
      range: {
        minEaseCm: 7,
        maxEaseCm: 9,
      },
      shopperValueCm: 89,
      garmentRange: {
        minValueCm: 96,
        maxValueCm: 98,
      },
    },

    comparison: {
      status: "WITHIN_DESIGNED_RANGE",
      actualEase: {
        minEaseCm: 7,
        maxEaseCm: 9,
      },
      designedEase: {
        minEaseCm: 6,
        maxEaseCm: 10,
      },
    },

    interpretation: {
      relationship,
      comparisonStatus:
        "WITHIN_DESIGNED_RANGE",
    },

    preferenceAssessment: {
      status: "RANKED",
      relationship,
      intendedFit: "REGULAR",
      stretch: "NONE",
      preference: "REGULAR",
      eligibility: {
        status: "ELIGIBLE",
        reason: "ELIGIBLE",
      },
      ranking: {
        rank: 0,
        relationship,
        preference: "REGULAR",
      },
    },
  };
}

describe("Veilora Fit evidence-derived suitability", () => {
  it.each([
    "PRESERVES_DESIGNED_FIT",
    "CLOSER_THAN_DESIGNED",
    "LOOSER_THAN_DESIGNED",
    "PARTIALLY_CLOSER_THAN_DESIGNED",
    "PARTIALLY_LOOSER_THAN_DESIGNED",
  ] as const)(
    "treats %s as a credible fit candidate",
    (relationship) => {
      const result =
        assessEvidenceDerivedSuitability(
          assessed(relationship)
        );

      expect(result).toEqual({
        status: "SUITABLE",
        reason: "CREDIBLE_FIT",
      });
    }
  );

  it("does not treat an ambiguous relationship as suitable", () => {
    const result =
      assessEvidenceDerivedSuitability(
        assessed(
          "AMBIGUOUS_AROUND_DESIGNED_FIT"
        )
      );

    expect(result).toEqual({
      status: "INSUFFICIENT_EVIDENCE",
      reason:
        "AMBIGUOUS_FIT_RELATIONSHIP",
    });
  });

  it("does not manufacture suitability from incomplete fit evidence", () => {
    const incomplete: EvidenceDerivedFitAssessment = {
      status: "INSUFFICIENT_EVIDENCE",
      reason: "DESIGNED_EASE_UNAVAILABLE",
      designedEase: {
        status: "INSUFFICIENT_EVIDENCE",
        evidence: null,
      },
      actualEase: null,
      comparison: null,
      interpretation: null,
      preferenceAssessment: null,
    };

    const result =
      assessEvidenceDerivedSuitability(
        incomplete
      );

    expect(result).toEqual({
      status: "INSUFFICIENT_EVIDENCE",
      reason:
        "INSUFFICIENT_FIT_EVIDENCE",
    });
  });
});