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

type ResolveProductSizeLengthMeasurementArgs = {
  measurementType: FitMeasurementType;
  component?: FitGarmentComponent;
};

function matchesRequestedMeasurement(
  measurement: LengthMeasurement,
  args: ResolveProductSizeLengthMeasurementArgs
): boolean {
  if (
    measurement.type !== args.measurementType
  ) {
    return false;
  }

  if (
    args.component !== undefined &&
    measurement.component !== args.component
  ) {
    return false;
  }

  return true;
}

function findChartGarmentMeasurement(
  measurements: readonly LengthMeasurement[],
  args: ResolveProductSizeLengthMeasurementArgs
): LengthReferenceRange | null {
  const measurement = measurements.find(
    (candidate) =>
      matchesRequestedMeasurement(
        candidate,
        args
      )
  );

  if (!measurement) {
    return null;
  }

  return {
    minValueCm: measurement.minValueCm,
    maxValueCm: measurement.maxValueCm,
  };
}

function findProductSpecificGarmentMeasurement(
  measurements: ProductSizeInput["productSizeMeasurements"],
  args: ResolveProductSizeLengthMeasurementArgs
): LengthReferenceRange | null {
  const measurement = measurements.find(
    (candidate) =>
      matchesRequestedMeasurement(
        candidate,
        args
      ) &&
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

export function resolveProductSizeLengthMeasurement(
  size: ProductSizeInput,
  args: ResolveProductSizeLengthMeasurementArgs
): LengthReferenceRange | null {
  const productSpecificMeasurement =
    findProductSpecificGarmentMeasurement(
      size.productSizeMeasurements,
      args
    );

  if (productSpecificMeasurement) {
    return productSpecificMeasurement;
  }

  if (!size.garmentMappedChart) {
    return null;
  }

  return findChartGarmentMeasurement(
    size.garmentMappedChart.measurements,
    args
  );
}

/*
 * Backwards-compatible semantic wrapper for the
 * existing maxi-length path.
 *
 * Dress, abaya and jilbab length assessment continues
 * to request GARMENT_LENGTH exactly as before.
 */
export function resolveProductSizeGarmentLength(
  size: ProductSizeInput
): LengthReferenceRange | null {
  return resolveProductSizeLengthMeasurement(
    size,
    {
      measurementType:
        FitMeasurementType.GARMENT_LENGTH,
    }
  );
}