import { describe, expect, it } from "vitest";

import {
  assessEvidenceDerivedFit,
} from "@/lib/fit/evidenceDerivedFit";

import type {
  SizeMeasurementEvidenceResolution,
} from "@/lib/fit/measurements";

function resolvedEvidence(args: {
  bodyMin: number;
  bodyMax: number;
  garmentMin: number;
  garmentMax: number;
}): SizeMeasurementEvidenceResolution {
  return {
    type: "BUST",
    component: "WHOLE_GARMENT",

    body: {
      status: "RESOLVED",
      measurement: {
        type: "BUST",
        component: "WHOLE_GARMENT",
        range: {
          minValueCm: args.bodyMin,
          maxValueCm: args.bodyMax,
        },
        basis: "BODY",
        source: "BRAND_SIZE_CHART",
      },
    },

    garment: {
      status: "RESOLVED",
      measurement: {
        type: "BUST",
        component: "WHOLE_GARMENT",
        range: {
          minValueCm: args.garmentMin,
          maxValueCm: args.garmentMax,
        },
        basis: "GARMENT",
        source: "BRAND_SIZE_CHART",
      },
    },
  };
}

describe("Veilora Fit evidence-derived fit assessment", () => {
  it("assesses a shopper who preserves the designed fit", () => {
    const result = assessEvidenceDerivedFit({
      evidence: resolvedEvidence({
        bodyMin: 88,
        bodyMax: 90,
        garmentMin: 96,
        garmentMax: 98,
      }),
      shopperValueCm: 89,
      intendedFit: "REGULAR",
      stretch: "NONE",
      shopperFitPreference: "REGULAR",
    });

    expect(result.status).toBe("ASSESSED");

    if (result.status !== "ASSESSED") {
      throw new Error("Expected assessed fit");
    }

    expect(result.designedEase.evidence.range).toEqual({
      minEaseCm: 6,
      maxEaseCm: 10,
    });

    expect(result.actualEase.range).toEqual({
      minEaseCm: 7,
      maxEaseCm: 9,
    });

    expect(result.comparison.status).toBe(
      "WITHIN_DESIGNED_RANGE"
    );

    expect(result.interpretation.relationship).toBe(
      "PRESERVES_DESIGNED_FIT"
    );

    expect(result.preferenceAssessment.status).toBe(
      "RANKED"
    );
  });

  it("identifies a shopper as closer than the designed fit", () => {
    const result = assessEvidenceDerivedFit({
      evidence: resolvedEvidence({
        bodyMin: 88,
        bodyMax: 90,
        garmentMin: 96,
        garmentMax: 98,
      }),
      shopperValueCm: 94,
      intendedFit: "REGULAR",
      stretch: "LOW",
      shopperFitPreference: "CLOSER",
    });

    expect(result.status).toBe("ASSESSED");

    if (result.status !== "ASSESSED") {
      throw new Error("Expected assessed fit");
    }

    expect(result.actualEase.range).toEqual({
      minEaseCm: 2,
      maxEaseCm: 4,
    });

    expect(result.comparison.status).toBe(
      "BELOW_DESIGNED_RANGE"
    );

    expect(result.interpretation.relationship).toBe(
      "CLOSER_THAN_DESIGNED"
    );
  });

  it("identifies a shopper as looser than the designed fit", () => {
    const result = assessEvidenceDerivedFit({
      evidence: resolvedEvidence({
        bodyMin: 88,
        bodyMax: 90,
        garmentMin: 96,
        garmentMax: 98,
      }),
      shopperValueCm: 84,
      intendedFit: "REGULAR",
      stretch: "NONE",
      shopperFitPreference: "RELAXED",
    });

    expect(result.status).toBe("ASSESSED");

    if (result.status !== "ASSESSED") {
      throw new Error("Expected assessed fit");
    }

    expect(result.actualEase.range).toEqual({
      minEaseCm: 12,
      maxEaseCm: 14,
    });

    expect(result.interpretation.relationship).toBe(
      "LOOSER_THAN_DESIGNED"
    );
  });

  it("preserves negative designed and actual ease", () => {
    const result = assessEvidenceDerivedFit({
      evidence: resolvedEvidence({
        bodyMin: 90,
        bodyMax: 92,
        garmentMin: 86,
        garmentMax: 88,
      }),
      shopperValueCm: 91,
      intendedFit: "SLIM",
      stretch: "HIGH",
      shopperFitPreference: "REGULAR",
    });

    expect(result.status).toBe("ASSESSED");

    if (result.status !== "ASSESSED") {
      throw new Error("Expected assessed fit");
    }

    expect(result.designedEase.evidence.range).toEqual({
      minEaseCm: -6,
      maxEaseCm: -2,
    });

    expect(result.actualEase.range).toEqual({
      minEaseCm: -5,
      maxEaseCm: -3,
    });

    expect(result.comparison.status).toBe(
      "WITHIN_DESIGNED_RANGE"
    );
  });

  it("returns insufficient evidence when BODY evidence is missing", () => {
    const evidence =
      resolvedEvidence({
        bodyMin: 88,
        bodyMax: 90,
        garmentMin: 96,
        garmentMax: 98,
      });

    const missingBody: SizeMeasurementEvidenceResolution = {
      ...evidence,
      body: {
        status: "MISSING",
        measurement: null,
      },
    };

    const result = assessEvidenceDerivedFit({
      evidence: missingBody,
      shopperValueCm: 89,
      intendedFit: "REGULAR",
      stretch: "NONE",
      shopperFitPreference: "REGULAR",
    });

    expect(result.status).toBe(
      "INSUFFICIENT_EVIDENCE"
    );

    if (result.status !== "INSUFFICIENT_EVIDENCE") {
      throw new Error(
        "Expected insufficient evidence"
      );
    }

    expect(result.reason).toBe(
      "DESIGNED_EASE_UNAVAILABLE"
    );

    expect(result.preferenceAssessment).toBeNull();
  });

  it("returns insufficient evidence when GARMENT evidence is missing", () => {
    const evidence =
      resolvedEvidence({
        bodyMin: 88,
        bodyMax: 90,
        garmentMin: 96,
        garmentMax: 98,
      });

    const missingGarment: SizeMeasurementEvidenceResolution = {
      ...evidence,
      garment: {
        status: "MISSING",
        measurement: null,
      },
    };

    const result = assessEvidenceDerivedFit({
      evidence: missingGarment,
      shopperValueCm: 89,
      intendedFit: "REGULAR",
      stretch: "NONE",
      shopperFitPreference: "REGULAR",
    });

    expect(result.status).toBe(
      "INSUFFICIENT_EVIDENCE"
    );

    if (result.status !== "INSUFFICIENT_EVIDENCE") {
      throw new Error(
        "Expected insufficient evidence"
      );
    }

    expect(result.reason).toBe(
      "DESIGNED_EASE_UNAVAILABLE"
    );

    expect(result.preferenceAssessment).toBeNull();
  });

  it("returns insufficient evidence when shopper measurement is missing", () => {
    const result = assessEvidenceDerivedFit({
      evidence: resolvedEvidence({
        bodyMin: 88,
        bodyMax: 90,
        garmentMin: 96,
        garmentMax: 98,
      }),
      shopperValueCm: null,
      intendedFit: "REGULAR",
      stretch: "NONE",
      shopperFitPreference: "REGULAR",
    });

    expect(result.status).toBe(
      "INSUFFICIENT_EVIDENCE"
    );

    if (result.status !== "INSUFFICIENT_EVIDENCE") {
      throw new Error(
        "Expected insufficient evidence"
      );
    }

    expect(result.reason).toBe(
      "ACTUAL_EASE_UNAVAILABLE"
    );

    expect(result.actualEase).toBeNull();
    expect(result.preferenceAssessment).toBeNull();
  });

  it("does not rank preference when stretch is unknown", () => {
    const result = assessEvidenceDerivedFit({
      evidence: resolvedEvidence({
        bodyMin: 88,
        bodyMax: 90,
        garmentMin: 96,
        garmentMax: 98,
      }),
      shopperValueCm: 89,
      intendedFit: "REGULAR",
      stretch: "UNKNOWN",
      shopperFitPreference: "REGULAR",
    });

    expect(result.status).toBe("ASSESSED");

    if (result.status !== "ASSESSED") {
      throw new Error("Expected assessed fit");
    }

    expect(result.preferenceAssessment.status).toBe(
      "NOT_RANKED"
    );

    expect(
      result.preferenceAssessment.ranking
    ).toBeNull();

    expect(
      result.preferenceAssessment.eligibility
    ).toEqual({
      status: "INELIGIBLE",
      reason: "UNKNOWN_STRETCH",
    });
  });

  it("does not rank preference when intended fit is missing", () => {
    const result = assessEvidenceDerivedFit({
      evidence: resolvedEvidence({
        bodyMin: 88,
        bodyMax: 90,
        garmentMin: 96,
        garmentMax: 98,
      }),
      shopperValueCm: 89,
      intendedFit: null,
      stretch: "NONE",
      shopperFitPreference: "REGULAR",
    });

    expect(result.status).toBe("ASSESSED");

    if (result.status !== "ASSESSED") {
      throw new Error("Expected assessed fit");
    }

    expect(result.preferenceAssessment.status).toBe(
      "NOT_RANKED"
    );

    expect(
      result.preferenceAssessment.ranking
    ).toBeNull();

    expect(
      result.preferenceAssessment.eligibility
    ).toEqual({
      status: "INELIGIBLE",
      reason: "MISSING_INTENDED_FIT",
    });
  });

  it("does not allow an invalid shopper value to reach preference ranking", () => {
    const result = assessEvidenceDerivedFit({
      evidence: resolvedEvidence({
        bodyMin: 88,
        bodyMax: 90,
        garmentMin: 96,
        garmentMax: 98,
      }),
      shopperValueCm: 0,
      intendedFit: "REGULAR",
      stretch: "NONE",
      shopperFitPreference: "REGULAR",
    });

    expect(result.status).toBe(
      "INSUFFICIENT_EVIDENCE"
    );

    if (result.status !== "INSUFFICIENT_EVIDENCE") {
      throw new Error(
        "Expected insufficient evidence"
      );
    }

    expect(result.reason).toBe(
      "ACTUAL_EASE_UNAVAILABLE"
    );

    expect(result.preferenceAssessment).toBeNull();
  });
});