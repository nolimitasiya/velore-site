import { describe, expect, it } from "vitest";

import {
  FitMeasurementBasis,
  FitMeasurementType,
  FitUnit,
} from "@prisma/client";

import {
  normalizeMeasurementEvidence,
} from "@/lib/fit/measurementNormalization";

describe("Veilora Fit measurement normalization", () => {
  it("preserves a direct centimetre measurement", () => {
    const result =
      normalizeMeasurementEvidence({
        sourceLabel: "Bust",
        value: 98,
        unit: FitUnit.CM,

        type: FitMeasurementType.BUST,
        basis: FitMeasurementBasis.GARMENT,

        transformation: {
          kind: "NONE",
        },
      });

    expect(result.status).toBe(
      "NORMALIZED"
    );

    if (result.status !== "NORMALIZED") {
      throw new Error(
        "Expected normalized measurement"
      );
    }

    expect(result.measurement.range).toEqual({
      minValueCm: 98,
      maxValueCm: 98,
    });
  });

  it("converts inches to canonical centimetres", () => {
    const result =
      normalizeMeasurementEvidence({
        sourceLabel: "Bust",
        value: 40,
        unit: FitUnit.IN,

        type: FitMeasurementType.BUST,
        basis: FitMeasurementBasis.BODY,

        transformation: {
          kind: "NONE",
        },
      });

    expect(result.status).toBe(
      "NORMALIZED"
    );

    if (result.status !== "NORMALIZED") {
      throw new Error(
        "Expected normalized measurement"
      );
    }

    expect(
      result.measurement.range.minValueCm
    ).toBeCloseTo(101.6);

    expect(
      result.measurement.range.maxValueCm
    ).toBeCloseTo(101.6);
  });

  it("normalizes a verified half-width measurement using an explicit multiplication", () => {
    const result =
      normalizeMeasurementEvidence({
        sourceLabel: "1/2 Chest Width",
        value: 56.5,
        unit: FitUnit.CM,

        type: FitMeasurementType.BUST,
        basis: FitMeasurementBasis.GARMENT,

        transformation: {
          kind: "MULTIPLY",
          factor: 2,
          verified: true,
          rationale:
            "Brand measurement instructions confirm side-to-side half chest width.",
        },
      });

    expect(result.status).toBe(
      "NORMALIZED"
    );

    if (result.status !== "NORMALIZED") {
      throw new Error(
        "Expected normalized measurement"
      );
    }

    expect(result.measurement.range).toEqual({
      minValueCm: 113,
      maxValueCm: 113,
    });

    expect(
      result.measurement.source
    ).toEqual({
      label: "1/2 Chest Width",
      value: 56.5,
      unit: FitUnit.CM,

      transformation: {
        kind: "MULTIPLY",
        factor: 2,
        verified: true,
        rationale:
          "Brand measurement instructions confirm side-to-side half chest width.",
      },

      manufacturingTolerance:
        undefined,
    });
  });

  it("refuses to apply an unverified transformation", () => {
    const result =
      normalizeMeasurementEvidence({
        sourceLabel: "Chest Width",
        value: 56.5,
        unit: FitUnit.CM,

        type: FitMeasurementType.BUST,
        basis: FitMeasurementBasis.GARMENT,

        transformation: {
          kind: "MULTIPLY",
          factor: 2,
          verified: false,
          rationale:
            "Meaning of source width has not been verified.",
        },
      });

    expect(result).toEqual({
      status:
        "UNVERIFIED_TRANSFORMATION",
      measurement: null,
    });
  });

  it("applies source-value tolerance before a verified transformation", () => {
    const result =
      normalizeMeasurementEvidence({
        sourceLabel: "1/2 Chest Width",
        value: 56.5,
        unit: FitUnit.CM,

        type: FitMeasurementType.BUST,
        basis: FitMeasurementBasis.GARMENT,

        transformation: {
          kind: "MULTIPLY",
          factor: 2,
          verified: true,
          rationale:
            "Brand instructions confirm half-width measurement.",
        },

        manufacturingTolerance: {
          minus: 1,
          plus: 1,
          appliesTo: "SOURCE_VALUE",
        },
      });

    expect(result.status).toBe(
      "NORMALIZED"
    );

    if (result.status !== "NORMALIZED") {
      throw new Error(
        "Expected normalized measurement"
      );
    }

    /*
     * 56.5 ±1 = 55.5–57.5
     * then ×2 = 111–115.
     */
    expect(result.measurement.range).toEqual({
      minValueCm: 111,
      maxValueCm: 115,
    });
  });

  it("applies normalized-value tolerance after transformation", () => {
    const result =
      normalizeMeasurementEvidence({
        sourceLabel: "1/2 Chest Width",
        value: 56.5,
        unit: FitUnit.CM,

        type: FitMeasurementType.BUST,
        basis: FitMeasurementBasis.GARMENT,

        transformation: {
          kind: "MULTIPLY",
          factor: 2,
          verified: true,
          rationale:
            "Brand instructions confirm half-width measurement.",
        },

        manufacturingTolerance: {
          minus: 1,
          plus: 1,
          appliesTo: "NORMALIZED_VALUE",
        },
      });

    expect(result.status).toBe(
      "NORMALIZED"
    );

    if (result.status !== "NORMALIZED") {
      throw new Error(
        "Expected normalized measurement"
      );
    }

    /*
     * 56.5 ×2 = 113
     * then ±1 = 112–114.
     */
    expect(result.measurement.range).toEqual({
      minValueCm: 112,
      maxValueCm: 114,
    });
  });

  it("rejects an invalid source value", () => {
    const result =
      normalizeMeasurementEvidence({
        sourceLabel: "Bust",
        value: Number.NaN,
        unit: FitUnit.CM,

        type: FitMeasurementType.BUST,
        basis: FitMeasurementBasis.GARMENT,

        transformation: {
          kind: "NONE",
        },
      });

    expect(result).toEqual({
      status: "INVALID_SOURCE_VALUE",
      measurement: null,
    });
  });

  it("rejects an invalid transformation factor", () => {
    const result =
      normalizeMeasurementEvidence({
        sourceLabel: "1/2 Chest Width",
        value: 56.5,
        unit: FitUnit.CM,

        type: FitMeasurementType.BUST,
        basis: FitMeasurementBasis.GARMENT,

        transformation: {
          kind: "MULTIPLY",
          factor: 0,
          verified: true,
          rationale:
            "Test invalid transformation.",
        },
      });

    expect(result).toEqual({
      status: "INVALID_TRANSFORMATION",
      measurement: null,
    });
  });

  it("rejects invalid manufacturing tolerance", () => {
    const result =
      normalizeMeasurementEvidence({
        sourceLabel: "Bust",
        value: 98,
        unit: FitUnit.CM,

        type: FitMeasurementType.BUST,
        basis: FitMeasurementBasis.GARMENT,

        transformation: {
          kind: "NONE",
        },

        manufacturingTolerance: {
          minus: -1,
          plus: 2,
          appliesTo: "SOURCE_VALUE",
        },
      });

    expect(result).toEqual({
      status: "INVALID_TOLERANCE",
      measurement: null,
    });
  });
});