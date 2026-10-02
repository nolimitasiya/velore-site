import {
  FitDataSource,
  FitMeasurementBasis,
} from "@prisma/client";

export type MeasurementBasisEvidenceType =
  | "BRAND_DECLARATION"
  | "EXPLICIT_CHART_LABEL"
  | "MEASUREMENT_INSTRUCTIONS"
  | "ADMIN_VERIFIED"
  | "UNRESOLVED";

export type MeasurementBasisEvidence = {
  basis: FitMeasurementBasis;
  evidenceType: MeasurementBasisEvidenceType;

  /*
   * Human-readable record of why this basis was assigned.
   *
   * Example:
   * "Brand confirmed during onboarding that this chart
   * contains finished garment measurements."
   */
  note: string;

  source: FitDataSource;

  /*
   * Optional external source containing the evidence.
   */
  sourceUrl?: string;
};

export type MeasurementBasisAssessment =
  | {
      status: "CONFIRMED";
      basis:
        | typeof FitMeasurementBasis.BODY
        | typeof FitMeasurementBasis.GARMENT;
      evidence: MeasurementBasisEvidence;
    }
  | {
      status: "UNKNOWN";
      basis: typeof FitMeasurementBasis.UNKNOWN;
      evidence: MeasurementBasisEvidence;
    };

/*
 * Measurement basis must come from explicit evidence.
 *
 * Descriptions such as "stretchy", "flowy", "oversized",
 * or "size down" describe garment behaviour or fit.
 * They do not establish whether chart values represent
 * shopper body measurements or finished garment
 * measurements.
 */
export function assessMeasurementBasis(
  evidence: MeasurementBasisEvidence
): MeasurementBasisAssessment {
  if (
    evidence.basis === FitMeasurementBasis.BODY ||
    evidence.basis === FitMeasurementBasis.GARMENT
  ) {
    if (evidence.evidenceType === "UNRESOLVED") {
      return {
        status: "UNKNOWN",
        basis: FitMeasurementBasis.UNKNOWN,
        evidence: {
          ...evidence,
          basis: FitMeasurementBasis.UNKNOWN,
        },
      };
    }

    return {
      status: "CONFIRMED",
      basis: evidence.basis,
      evidence,
    };
  }

  return {
    status: "UNKNOWN",
    basis: FitMeasurementBasis.UNKNOWN,
    evidence: {
      ...evidence,
      basis: FitMeasurementBasis.UNKNOWN,
    },
  };
}