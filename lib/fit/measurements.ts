import {
  FitGarmentComponent,
  FitMeasurementBasis,
  FitMeasurementType,
} from "@prisma/client";

export type FitMeasurementRange = {
  minValueCm: number;
  maxValueCm: number;
};

export type ResolvedSizeMeasurementSource =
  | "PRODUCT_SIZE"
  | "BRAND_SIZE_CHART";

export type ResolvedSizeMeasurement = {
  type: FitMeasurementType;
  component: FitGarmentComponent;

  range: FitMeasurementRange;

  basis: FitMeasurementBasis;
  source: ResolvedSizeMeasurementSource;
};

export type SizeMeasurementResolution =
  | {
      status: "RESOLVED";
      measurement: ResolvedSizeMeasurement;
    }
  | {
      status: "MISSING";
      measurement: null;
    }
  | {
      status: "INVALID";
      measurement: null;
      source: ResolvedSizeMeasurementSource;
    };

export type SizeMeasurementEvidenceResolution = {
  type: FitMeasurementType;
  component: FitGarmentComponent;

  body: SizeMeasurementResolution;
  garment: SizeMeasurementResolution;
};
export type ProductSizeMeasurementInput = {
  type: FitMeasurementType;
  component: FitGarmentComponent;

  /*
   * Effective semantic basis for this exact measurement.
   *
   * The loader resolves:
   * measurement-level basis
   *   → otherwise ProductFitProfile basis.
   */
  measurementBasis: FitMeasurementBasis;

  minValueCm: number;
  maxValueCm: number;
};

export type BrandChartMeasurementInput = {
  type: FitMeasurementType;
  component: FitGarmentComponent;

  minValueCm: number;
  maxValueCm: number;
};

export type ResolveSizeMeasurementInput = {
  type: FitMeasurementType;
  component?: FitGarmentComponent;

  /*
   * When provided, basis becomes part of the
   * semantic measurement being requested.
   *
   * This allows BODY and GARMENT evidence for
   * the same type/component to coexist.
   */
  basis?: FitMeasurementBasis;

  productMeasurementBasis: FitMeasurementBasis;

  productSizeMeasurements:
    readonly ProductSizeMeasurementInput[];

  mappedChart:
    | {
        measurementBasis: FitMeasurementBasis;
        measurements:
          readonly BrandChartMeasurementInput[];
      }
    | null;
};

function sameMeasurement(
  measurement: {
    type: FitMeasurementType;
    component: FitGarmentComponent;
  },
  type: FitMeasurementType,
  component: FitGarmentComponent
): boolean {
  return (
    measurement.type === type &&
    measurement.component === component
  );
}
function matchesRequestedBasis(
  evidenceBasis: FitMeasurementBasis,
  requestedBasis:
    | FitMeasurementBasis
    | undefined
): boolean {
  return (
    requestedBasis === undefined ||
    evidenceBasis === requestedBasis
  );
}
function isValidRange(
  minValueCm: number,
  maxValueCm: number
): boolean {
  return (
    Number.isFinite(minValueCm) &&
    Number.isFinite(maxValueCm) &&
    minValueCm >= 0 &&
    maxValueCm >= minValueCm
  );
}

export function resolveSizeMeasurement(
  input: ResolveSizeMeasurementInput
): SizeMeasurementResolution {
  const component =
    input.component ??
    FitGarmentComponent.WHOLE_GARMENT;

  /*
   * Product + size specific evidence has
   * precedence over the mapped brand chart.
   */
  const productSizeMeasurement =
    input.productSizeMeasurements.find(
     (measurement) =>
       sameMeasurement(
        measurement,
        input.type,
        component
      ) &&
      matchesRequestedBasis(
        measurement.measurementBasis,
        input.basis
      )
  );

 if (productSizeMeasurement) {
  if (
    !isValidRange(
      productSizeMeasurement.minValueCm,
      productSizeMeasurement.maxValueCm
    )
  ) {
    return {
      status: "INVALID",
      measurement: null,
      source: "PRODUCT_SIZE",
    };
  }

  return {
    status: "RESOLVED",

    measurement: {
      type: input.type,
      component,

      range: {
        minValueCm:
          productSizeMeasurement.minValueCm,
        maxValueCm:
          productSizeMeasurement.maxValueCm,
      },

      basis:
        productSizeMeasurement.measurementBasis,

      source: "PRODUCT_SIZE",
    },
  };
}

  /*
   * Otherwise use the mapped chart entry
   * for this actual ProductSize.
   */
  const chartMeasurement =
  input.mappedChart &&
  matchesRequestedBasis(
    input.mappedChart.measurementBasis,
    input.basis
  )
    ? input.mappedChart.measurements.find(
        (measurement) =>
          sameMeasurement(
            measurement,
            input.type,
            component
          )
      )
    : undefined;

  if (chartMeasurement) {
  if (
    !isValidRange(
      chartMeasurement.minValueCm,
      chartMeasurement.maxValueCm
    )
  ) {
    return {
      status: "INVALID",
      measurement: null,
      source: "BRAND_SIZE_CHART",
    };
  }

  return {
    status: "RESOLVED",

    measurement: {
      type: input.type,
      component,

      range: {
        minValueCm:
          chartMeasurement.minValueCm,
        maxValueCm:
          chartMeasurement.maxValueCm,
      },

      basis:
        input.mappedChart!
          .measurementBasis,

      source: "BRAND_SIZE_CHART",
    },
  };
}

  return {
  status: "MISSING",
  measurement: null,
};
}
export function resolveSizeMeasurementEvidence(
  input: Omit<
    ResolveSizeMeasurementInput,
    "basis"
  >
): SizeMeasurementEvidenceResolution {
  const component =
    input.component ??
    FitGarmentComponent.WHOLE_GARMENT;

  const body =
    resolveSizeMeasurement({
      ...input,
      component,
      basis: FitMeasurementBasis.BODY,
    });

  const garment =
    resolveSizeMeasurement({
      ...input,
      component,
      basis: FitMeasurementBasis.GARMENT,
    });

  return {
    type: input.type,
    component,
    body,
    garment,
  };
}

export function resolveSizeMeasurements(
  input: Omit<
    ResolveSizeMeasurementInput,
    "type" | "component"
  >,
  requirements: readonly {
    type: FitMeasurementType;
    component?: FitGarmentComponent;
  }[]
): ResolvedSizeMeasurement[] {
  return requirements.flatMap(
    (requirement) => {
      const resolved =
        resolveSizeMeasurement({
          ...input,
          type: requirement.type,
          component:
            requirement.component,
        });

      return resolved.status === "RESOLVED"
  ? [resolved.measurement]
  : [];
    }
  );
}
