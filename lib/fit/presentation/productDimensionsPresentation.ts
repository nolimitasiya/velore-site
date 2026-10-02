import {
  FitDataSource,
  FitGarmentComponent,
  FitMeasurementType,
  ProductType,
} from "@prisma/client";

import type {
  NormalizedProductFitMeasurement,
} from "@/lib/fit/loadRecommendationInput";

type OneSizeProductType =
  | "HIJAB"
  | "KHIMAR";

type ProductDimensionType =
  | "GARMENT_LENGTH"
  | "WIDTH"
  | "FRONT_LENGTH"
  | "BACK_LENGTH";

export type ProductDimensionsPresentation =
  | {
      state: "AVAILABLE";
      productType: OneSizeProductType;
      source: FitDataSource | null;
      dimensions: readonly {
        type: ProductDimensionType;
        minValueCm: number;
        maxValueCm: number;
      }[];
    }
  | {
      state: "PRODUCT_EVIDENCE_UNAVAILABLE";
    }
  | {
      state: "NOT_APPLICABLE";
    };

const SUPPORTED_PRODUCT_TYPES =
  new Set<ProductType>([
    ProductType.HIJAB,
    ProductType.KHIMAR,
  ]);

const SUPPORTED_DIMENSIONS =
  new Set<FitMeasurementType>([
    FitMeasurementType.GARMENT_LENGTH,
    FitMeasurementType.WIDTH,
    FitMeasurementType.FRONT_LENGTH,
    FitMeasurementType.BACK_LENGTH,
  ]);

function expectedComponent(
  productType: ProductType
): FitGarmentComponent | null {
  switch (productType) {
    case ProductType.HIJAB:
      return FitGarmentComponent.HIJAB;

    case ProductType.KHIMAR:
      return FitGarmentComponent.KHIMAR;

    default:
      return null;
  }
}

export function presentProductDimensions(args: {
  productType: ProductType;
  source: FitDataSource | null;
  measurements:
    readonly NormalizedProductFitMeasurement[];
}): ProductDimensionsPresentation {
  const {
    productType,
    source,
    measurements,
  } = args;

  if (
    !SUPPORTED_PRODUCT_TYPES.has(productType)
  ) {
    return {
      state: "NOT_APPLICABLE",
    };
  }

  const component =
    expectedComponent(productType);

  if (component === null) {
    return {
      state: "NOT_APPLICABLE",
    };
  }

  const dimensions = measurements
    .filter(
      (measurement) =>
        measurement.component === component &&
        SUPPORTED_DIMENSIONS.has(
          measurement.type
        )
    )
    .map((measurement) => ({
      type:
  measurement.type as ProductDimensionType,

      minValueCm: measurement.minValueCm,
      maxValueCm: measurement.maxValueCm,
    }));

  if (dimensions.length === 0) {
    return {
      state:
        "PRODUCT_EVIDENCE_UNAVAILABLE",
    };
  }

 return {
  state: "AVAILABLE",
  productType: productType as OneSizeProductType,
  source,
  dimensions,
};
}