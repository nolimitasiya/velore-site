import {
  FitMeasurementBasis,
  FitMeasurementType,
  FitUnit,
} from "@prisma/client";

import type {
  FitMeasurementRange,
} from "@/lib/fit/measurements";

import {
  applyManufacturingTolerance,
  type GarmentManufacturingTolerance,
} from "@/lib/fit/measurementTolerance";

export type MeasurementTransformation =
  | {
      kind: "NONE";
    }
  | {
      kind: "MULTIPLY";
      factor: number;
      verified: boolean;
      rationale: string;
    };

export type SourceManufacturingTolerance = {
  minus: number;
  plus: number;

  /*
   * SOURCE_VALUE:
   * tolerance belongs to the original measurement
   * and therefore participates in transformation.
   *
   * NORMALIZED_VALUE:
   * tolerance belongs to the final normalized
   * measurement and is applied after transformation.
   */
  appliesTo:
    | "SOURCE_VALUE"
    | "NORMALIZED_VALUE";
};

export type RawMeasurementEvidence = {
  sourceLabel: string;

  value: number;
  unit: FitUnit;

  type: FitMeasurementType;
  basis: FitMeasurementBasis;

  transformation: MeasurementTransformation;

  manufacturingTolerance?:
    SourceManufacturingTolerance;
};

export type NormalizedMeasurementEvidence = {
  type: FitMeasurementType;
  basis: FitMeasurementBasis;

  range: FitMeasurementRange;

  source: {
    label: string;
    value: number;
    unit: FitUnit;

    transformation:
      MeasurementTransformation;

    manufacturingTolerance?:
      SourceManufacturingTolerance;
  };
};

export type NormalizeMeasurementResult =
  | {
      status: "NORMALIZED";
      measurement:
        NormalizedMeasurementEvidence;
    }
  | {
      status:
        | "INVALID_SOURCE_VALUE"
        | "UNVERIFIED_TRANSFORMATION"
        | "INVALID_TRANSFORMATION"
        | "INVALID_TOLERANCE";

      measurement: null;
    };

function toCentimetres(
  value: number,
  unit: FitUnit
): number {
  if (unit === FitUnit.IN) {
    return value * 2.54;
  }

  return value;
}

function toleranceToCentimetres(
  tolerance:
    SourceManufacturingTolerance,
  unit: FitUnit
): GarmentManufacturingTolerance {
  return {
    minusCm: toCentimetres(
      tolerance.minus,
      unit
    ),

    plusCm: toCentimetres(
      tolerance.plus,
      unit
    ),
  };
}

function applyTransformation(
  range: FitMeasurementRange,
  transformation:
    MeasurementTransformation
):
  | {
      status: "TRANSFORMED";
      range: FitMeasurementRange;
    }
  | {
      status:
        | "UNVERIFIED_TRANSFORMATION"
        | "INVALID_TRANSFORMATION";
      range: null;
    } {
  if (transformation.kind === "NONE") {
    return {
      status: "TRANSFORMED",
      range,
    };
  }

  if (!transformation.verified) {
    return {
      status: "UNVERIFIED_TRANSFORMATION",
      range: null,
    };
  }

  if (
    !Number.isFinite(
      transformation.factor
    ) ||
    transformation.factor <= 0
  ) {
    return {
      status: "INVALID_TRANSFORMATION",
      range: null,
    };
  }

  return {
    status: "TRANSFORMED",

    range: {
      minValueCm:
        range.minValueCm *
        transformation.factor,

      maxValueCm:
        range.maxValueCm *
        transformation.factor,
    },
  };
}

export function normalizeMeasurementEvidence(
  input: RawMeasurementEvidence
): NormalizeMeasurementResult {
  if (
    !Number.isFinite(input.value) ||
    input.value < 0
  ) {
    return {
      status: "INVALID_SOURCE_VALUE",
      measurement: null,
    };
  }

  const sourceValueCm =
    toCentimetres(
      input.value,
      input.unit
    );

  let workingRange: FitMeasurementRange = {
    minValueCm: sourceValueCm,
    maxValueCm: sourceValueCm,
  };

  /*
   * Some source tolerances belong to the raw
   * published measurement itself.
   *
   * Example:
   * 1/2 Chest Width = 56.5 ±1 cm
   *
   * If that source measurement is later
   * transformed ×2, its tolerance must be
   * transformed with it.
   */
  if (
    input.manufacturingTolerance
      ?.appliesTo === "SOURCE_VALUE"
  ) {
    const toleranceResult =
      applyManufacturingTolerance(
        workingRange,
        toleranceToCentimetres(
          input.manufacturingTolerance,
          input.unit
        )
      );

    if (
      toleranceResult.status !==
      "APPLIED"
    ) {
      return {
        status: "INVALID_TOLERANCE",
        measurement: null,
      };
    }

    workingRange =
      toleranceResult.range;
  }

  const transformationResult =
    applyTransformation(
      workingRange,
      input.transformation
    );

  if (
    transformationResult.status !==
    "TRANSFORMED"
  ) {
    return {
      status: transformationResult.status,
      measurement: null,
    };
  }

  workingRange =
    transformationResult.range;

  /*
   * Other sources explicitly state tolerance
   * against the normalized/full measurement.
   * In that case transformation happens first.
   */
  if (
    input.manufacturingTolerance
      ?.appliesTo === "NORMALIZED_VALUE"
  ) {
    const toleranceResult =
      applyManufacturingTolerance(
        workingRange,
        toleranceToCentimetres(
          input.manufacturingTolerance,
          input.unit
        )
      );

    if (
      toleranceResult.status !==
      "APPLIED"
    ) {
      return {
        status: "INVALID_TOLERANCE",
        measurement: null,
      };
    }

    workingRange =
      toleranceResult.range;
  }

  return {
    status: "NORMALIZED",

    measurement: {
      type: input.type,
      basis: input.basis,

      range: workingRange,

      source: {
        label: input.sourceLabel,
        value: input.value,
        unit: input.unit,
        transformation:
          input.transformation,
        manufacturingTolerance:
          input.manufacturingTolerance,
      },
    },
  };
}