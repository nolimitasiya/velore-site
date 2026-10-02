import {
  FitGarmentComponent,
  FitMeasurementBasis,
  FitMeasurementType,
} from "@prisma/client";

import type { LengthReferenceRange } from "@/lib/fit/length";
import type { ProductSizeRecommendationInput } from "@/lib/fit/recommendation";

type ProductSizeInput =
  ProductSizeRecommendationInput["sizes"][number];

type LengthMeasurement = {
  type: FitMeasurementType;
  component: FitGarmentComponent;
  minValueCm: number;
  maxValueCm: number;
};

function findGarmentLength(
  measurements: readonly LengthMeasurement[]
): LengthReferenceRange | null {
  const measurement = measurements.find(
    (candidate) =>
      candidate.type ===
      FitMeasurementType.GARMENT_LENGTH
  );

  if (!measurement) {
    return null;
  }

  return {
    minValueCm: measurement.minValueCm,
    maxValueCm: measurement.maxValueCm,
  };
}

function findProductSpecificGarmentLength(
  measurements: ProductSizeInput["productSizeMeasurements"]
): LengthReferenceRange | null {
  const measurement = measurements.find(
    (candidate) =>
      candidate.type ===
        FitMeasurementType.GARMENT_LENGTH &&
      candidate.measurementBasis ===
        FitMeasurementBasis.GARMENT
  );

  if (!measurement) {
    return null;
  }

  return {
    minValueCm: measurement.minValueCm,
    maxValueCm: measurement.maxValueCm,
  };
}

export function resolveProductSizeGarmentLength(
  size: ProductSizeInput
): LengthReferenceRange | null {
  const productSpecificLength =
    findProductSpecificGarmentLength(
      size.productSizeMeasurements
    );

  if (productSpecificLength) {
    return productSpecificLength;
  }

  if (!size.garmentMappedChart) {
    return null;
  }

  return findGarmentLength(
    size.garmentMappedChart.measurements
  );
}