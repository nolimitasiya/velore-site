import {
  FitDataSource,
  FitMeasurementBasis,
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  assessMeasurementBasis,
  type MeasurementBasisEvidence,
} from "@/lib/fit/measurementBasis";

function evidence(
  overrides: Partial<MeasurementBasisEvidence> = {}
): MeasurementBasisEvidence {
  return {
    basis: FitMeasurementBasis.UNKNOWN,
    evidenceType: "UNRESOLVED",
    note: "Test evidence.",
    source: FitDataSource.ADMIN,
    ...overrides,
  };
}

describe("measurement basis evidence", () => {
  it("confirms BODY when supported by explicit evidence", () => {
    const result = assessMeasurementBasis(
      evidence({
        basis: FitMeasurementBasis.BODY,
        evidenceType: "EXPLICIT_CHART_LABEL",
      })
    );

    expect(result.status).toBe("CONFIRMED");
    expect(result.basis).toBe(
      FitMeasurementBasis.BODY
    );
  });

  it("confirms GARMENT from a brand declaration", () => {
    const result = assessMeasurementBasis(
      evidence({
        basis: FitMeasurementBasis.GARMENT,
        evidenceType: "BRAND_DECLARATION",
        source: FitDataSource.BRAND_PORTAL,
      })
    );

    expect(result.status).toBe("CONFIRMED");
    expect(result.basis).toBe(
      FitMeasurementBasis.GARMENT
    );
  });

  it("keeps unresolved evidence UNKNOWN", () => {
    const result = assessMeasurementBasis(
      evidence()
    );

    expect(result.status).toBe("UNKNOWN");
    expect(result.basis).toBe(
      FitMeasurementBasis.UNKNOWN
    );
  });

  it("does not allow an unresolved classification to confirm BODY", () => {
    const result = assessMeasurementBasis(
      evidence({
        basis: FitMeasurementBasis.BODY,
        evidenceType: "UNRESOLVED",
      })
    );

    expect(result.status).toBe("UNKNOWN");
    expect(result.basis).toBe(
      FitMeasurementBasis.UNKNOWN
    );
  });

  it("does not allow an unresolved classification to confirm GARMENT", () => {
    const result = assessMeasurementBasis(
      evidence({
        basis: FitMeasurementBasis.GARMENT,
        evidenceType: "UNRESOLVED",
      })
    );

    expect(result.status).toBe("UNKNOWN");
    expect(result.basis).toBe(
      FitMeasurementBasis.UNKNOWN
    );
  });
});