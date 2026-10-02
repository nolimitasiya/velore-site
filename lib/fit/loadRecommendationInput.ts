import {
  FabricStretch,
  FitDataSource,
  FitGarmentComponent,
  FitMeasurementBasis,
  FitMeasurementType,
  FitUnit,
  ProductIntendedFit,
  ProductLengthStructure,
  ProductType,
  ShopperFitPreference,
} from "@prisma/client";

import type {
  BrandChartMeasurementInput,
  ProductSizeMeasurementInput,
} from "@/lib/fit/measurements";

import type {
  MappedSizeChartInput,
  ProductSizeRecommendationInput,
} from "@/lib/fit/recommendation";

/*
 * Prisma Decimal values are converted at the boundary.
 *
 * The Fit engine itself continues to operate on ordinary
 * JavaScript numbers and remains independent of Prisma
 * Decimal.
 */
export type FitNumericValue = {
  toString(): string;
};

/*
 * Minimal shopper data required by the recommendation
 * engine.
 *
 * Database querying/authentication deliberately stays
 * outside this pure translation layer.
 */
export type RecommendationShopperRecord = {
  fitPreference: ShopperFitPreference;

  measurements: readonly {
    type: FitMeasurementType;
    valueCm: FitNumericValue;
  }[];
};

/*
 * A mapped chart entry carries both the chart-level basis
 * and the normalized measurements belonging to the exact
 * brand size entry mapped to this ProductSize.
 */
export type RecommendationChartEntryRecord = {
  chart: {
    measurementBasis: FitMeasurementBasis;
  };

  measurements: readonly {
    type: FitMeasurementType;
    component: FitGarmentComponent;

    minValueCm: FitNumericValue;
    maxValueCm: FitNumericValue;
  }[];
};

/*
 * Product-size-specific evidence has precedence over
 * brand-chart evidence inside the Fit resolution layer.
 *
 * A measurement may explicitly declare its own BODY or
 * GARMENT basis. When it does not, it inherits the
 * ProductFitProfile measurement basis.
 */

export type RecommendationProductSizeRecord = {
  sizeId: string;

  size: {
    name: string;
  };

  fitMeasurements: readonly {
    type: FitMeasurementType;
    component: FitGarmentComponent;
    measurementBasis: FitMeasurementBasis | null;

    minValueCm: FitNumericValue;
    maxValueCm: FitNumericValue;
  }[];

  sizeChartMapping: {
    chartEntry: RecommendationChartEntryRecord;
  } | null;
};

/*
 * Canonical product types come from ProductProductType.
 *
 * legacyProductType exists only as an explicit compatibility
 * fallback for catalogue records that have not yet been
 * migrated to the canonical relation.
 */

export type RecommendationProductLengthOptionRecord = {
  id: string;
  label: string;

  valueCm: FitNumericValue | null;

  sourceValue: FitNumericValue | null;
  sourceUnit: FitUnit | null;

  sortOrder: number;

  source: FitDataSource | null;
  sourceUrl: string | null;
  sourceNotes: string | null;
  lastVerifiedAt: Date | null;
};

export type NormalizedProductLengthOption = {
  id: string;
  label: string;

  /*
   * Canonical centimetre value used for Fit calculations.
   *
   * null means the option remains a legitimate catalogue
   * option but cannot participate in numerical length
   * recommendation.
   */
  valueCm: number | null;

  /*
   * Original brand/source representation is preserved for
   * provenance and shopper-facing explanation.
   *
   * It must never replace valueCm for calculations.
   */
  sourceValue: number | null;
  sourceUnit: FitUnit | null;

  sortOrder: number;

  source: FitDataSource | null;
  sourceUrl: string | null;
  sourceNotes: string | null;
  lastVerifiedAt: Date | null;
};

export type NormalizedProductLengthInput = {
  structure: ProductLengthStructure | null;
  options: readonly NormalizedProductLengthOption[];
};

export type NormalizedProductFitMeasurement = {
  type: FitMeasurementType;
  component: FitGarmentComponent;

  minValueCm: number;
  maxValueCm: number;

  sourceMinValue: number;
  sourceMaxValue: number;
  sourceUnit: FitUnit;
};

export type RecommendationProductRecord = {
  productTypes: readonly {
    productType: ProductType;
  }[];

  legacyProductType: ProductType | null;
  lengthStructure: ProductLengthStructure | null;

  lengthOptions:
   readonly RecommendationProductLengthOptionRecord[];

  fitProfile: {
  intendedFit: ProductIntendedFit | null;
  stretch: FabricStretch;
  measurementBasis: FitMeasurementBasis;

  measurements?: readonly {
  type: FitMeasurementType;
  component: FitGarmentComponent;

  minValueCm: FitNumericValue;
  maxValueCm: FitNumericValue;

  sourceMinValue: FitNumericValue;
  sourceMaxValue: FitNumericValue;
  sourceUnit: FitUnit;
}[];
} | null;

  productSizes:
    readonly RecommendationProductSizeRecord[];
};

export type LoadRecommendationInputArgs = {
  product: RecommendationProductRecord;
  shopper: RecommendationShopperRecord;
};

/*
 * The loader can refuse to construct an engine input when
 * the catalogue record itself is structurally ambiguous.
 *
 * That is different from the recommendation engine returning
 * INSUFFICIENT_EVIDENCE for valid-but-incomplete fit data.
 */
export type LoadRecommendationInputResult =
  | {
      status: "READY";
      input: ProductSizeRecommendationInput;
    }
  | {
      status: "NOT_LOADABLE";
      input: null;
      reason:
        | "MISSING_PRODUCT_TYPE"
        | "MULTIPLE_PRODUCT_TYPES";
    };

/*
 * Conversion helpers will be implemented in Step 26A.2.
 *
 * These declarations make the intended translation boundary
 * explicit before we add orchestration.
 */
function toNumber(
  value: FitNumericValue
): number {
  return Number(value.toString());
}

function toNullableNumber(
  value: FitNumericValue | null
): number | null {
  if (value === null) {
    return null;
  }

  return toNumber(value);
}

function toNormalizedProductFitMeasurement(
  measurement: NonNullable<
    NonNullable<
      RecommendationProductRecord["fitProfile"]
    >["measurements"]
  >[number]
): NormalizedProductFitMeasurement {
  return {
    type: measurement.type,
    component: measurement.component,

    minValueCm: toNumber(
      measurement.minValueCm
    ),
    maxValueCm: toNumber(
      measurement.maxValueCm
    ),

    sourceMinValue: toNumber(
      measurement.sourceMinValue
    ),
    sourceMaxValue: toNumber(
      measurement.sourceMaxValue
    ),
    sourceUnit: measurement.sourceUnit,
  };
}

function toNormalizedLengthOption(
  option: RecommendationProductLengthOptionRecord
): NormalizedProductLengthOption {
  return {
    id: option.id,
    label: option.label,

    valueCm:
      toNullableNumber(option.valueCm),

    sourceValue:
      toNullableNumber(option.sourceValue),

    sourceUnit: option.sourceUnit,
    sortOrder: option.sortOrder,

    source: option.source,
    sourceUrl: option.sourceUrl,
    sourceNotes: option.sourceNotes,
    lastVerifiedAt: option.lastVerifiedAt,
  };
}

function toProductSizeMeasurement(
  measurement:
    RecommendationProductSizeRecord["fitMeasurements"][number],
  inheritedMeasurementBasis: FitMeasurementBasis
): ProductSizeMeasurementInput {
  return {
    type: measurement.type,
    component: measurement.component,

    measurementBasis:
      measurement.measurementBasis ??
      inheritedMeasurementBasis,

    minValueCm: toNumber(
      measurement.minValueCm
    ),

    maxValueCm: toNumber(
      measurement.maxValueCm
    ),
  };
}

function toChartMeasurement(
  measurement:
    RecommendationChartEntryRecord["measurements"][number]
): BrandChartMeasurementInput {
  return {
    type: measurement.type,
    component: measurement.component,
    minValueCm: toNumber(
      measurement.minValueCm
    ),
    maxValueCm: toNumber(
      measurement.maxValueCm
    ),
  };
}

function toMappedChart(
  entry: RecommendationChartEntryRecord
): MappedSizeChartInput {
  return {
    measurementBasis:
      entry.chart.measurementBasis,

    measurements:
      entry.measurements.map(
        toChartMeasurement
      ),
  };
}
function resolveProductType(
  product: RecommendationProductRecord
):
  | {
      status: "RESOLVED";
      productType: ProductType;
    }
  | {
      status: "NOT_LOADABLE";
      reason:
        | "MISSING_PRODUCT_TYPE"
        | "MULTIPLE_PRODUCT_TYPES";
    } {
  /*
   * ProductProductType is canonical.
   *
   * The legacy Product.productType field is used only when
   * the canonical relation contains no product types.
   */
  if (product.productTypes.length === 1) {
    return {
      status: "RESOLVED",
      productType:
        product.productTypes[0].productType,
    };
  }

  if (product.productTypes.length > 1) {
    return {
      status: "NOT_LOADABLE",
      reason: "MULTIPLE_PRODUCT_TYPES",
    };
  }

  if (product.legacyProductType !== null) {
    return {
      status: "RESOLVED",
      productType:
        product.legacyProductType,
    };
  }

  return {
    status: "NOT_LOADABLE",
    reason: "MISSING_PRODUCT_TYPE",
  };
}

function splitMappedChartByBasis(
  mapping:
    RecommendationProductSizeRecord["sizeChartMapping"]
): {
  mappedChart: MappedSizeChartInput | null;
  bodyMappedChart: MappedSizeChartInput | null;
  garmentMappedChart: MappedSizeChartInput | null;
} {
  if (mapping === null) {
    return {
      mappedChart: null,
      bodyMappedChart: null,
      garmentMappedChart: null,
    };
  }

  const mappedChart =
    toMappedChart(mapping.chartEntry);

  if (
    mappedChart.measurementBasis ===
    FitMeasurementBasis.BODY
  ) {
    return {
      mappedChart,
      bodyMappedChart: mappedChart,
      garmentMappedChart: null,
    };
  }

  if (
    mappedChart.measurementBasis ===
    FitMeasurementBasis.GARMENT
  ) {
    return {
      mappedChart,
      bodyMappedChart: null,
      garmentMappedChart: mappedChart,
    };
  }

  /*
   * UNKNOWN evidence is preserved rather than guessed.
   *
   * mappedChart keeps it available to the legacy/general
   * resolution path, while neither semantic BODY nor
   * GARMENT channel claims it.
   */
  return {
    mappedChart,
    bodyMappedChart: null,
    garmentMappedChart: null,
  };
}

export function loadNormalizedProductFitMeasurements(
  product: RecommendationProductRecord
): readonly NormalizedProductFitMeasurement[] {
  if (
    !product.fitProfile ||
    product.fitProfile.measurementBasis !==
      FitMeasurementBasis.GARMENT
  ) {
    return [];
  }

  return (
  product.fitProfile.measurements ?? []
).map(
  toNormalizedProductFitMeasurement
);
}

export function loadNormalizedProductLengthInput(
  product: RecommendationProductRecord
): NormalizedProductLengthInput {
  const options =
    product.lengthOptions
      .map(toNormalizedLengthOption)
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }

        return a.label.localeCompare(b.label);
      });

  return {
    structure: product.lengthStructure,
    options,
  };
}

export function loadNormalizedRecommendationSizes(
  product: RecommendationProductRecord
): ProductSizeRecommendationInput["sizes"] {
  const productMeasurementBasis =
    product.fitProfile?.measurementBasis ??
    FitMeasurementBasis.UNKNOWN;

  return product.productSizes.map(
    (productSize) => {
      const charts =
        splitMappedChartByBasis(
          productSize.sizeChartMapping
        );

      return {
        sizeId: productSize.sizeId,

        sizeLabel: productSize.size.name,

        productSizeMeasurements:
          productSize.fitMeasurements.map(
            (measurement) =>
              toProductSizeMeasurement(
                measurement,
                productMeasurementBasis
              )
          ),

        mappedChart:
          charts.mappedChart,

        bodyMappedChart:
          charts.bodyMappedChart,

        garmentMappedChart:
          charts.garmentMappedChart,
      };
    }
  );
}

export function loadRecommendationInput(
  args: LoadRecommendationInputArgs
): LoadRecommendationInputResult {
  const {
    product,
    shopper,
  } = args;

  const productTypeResolution =
    resolveProductType(product);

  if (
    productTypeResolution.status ===
    "NOT_LOADABLE"
  ) {
    return {
      status: "NOT_LOADABLE",
      input: null,
      reason:
        productTypeResolution.reason,
    };
  }

  /*
   * Absence of ProductFitProfile is valid catalogue state.
   *
   * We preserve that lack of evidence instead of inventing
   * intended-fit or stretch semantics.
   */
  const intendedFit =
    product.fitProfile?.intendedFit ?? null;

  const stretch =
    product.fitProfile?.stretch ??
    FabricStretch.UNKNOWN;

  const productMeasurementBasis =
    product.fitProfile?.measurementBasis ??
    FitMeasurementBasis.UNKNOWN;

  const sizes =
  loadNormalizedRecommendationSizes(product);

  return {
    status: "READY",

    input: {
      productType:
        productTypeResolution.productType,

      intendedFit,

      stretch,

      shopperFitPreference:
        shopper.fitPreference,

      productMeasurementBasis,

      shopperMeasurements:
        shopper.measurements.map(
          (measurement) => ({
            type: measurement.type,
            valueCm: toNumber(
              measurement.valueCm
            ),
          })
        ),

      sizes,
    },
  };
}