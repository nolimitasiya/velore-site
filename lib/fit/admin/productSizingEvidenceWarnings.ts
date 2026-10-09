import {
  FitGarmentComponent,
  FitMeasurementBasis,
  FitMeasurementType,
  ProductType,
} from "@prisma/client";

import {
  getProductMeasurementRules,
} from "@/lib/fit/measurementRules";

import {
  resolveSizeMeasurement,
  type ProductSizeMeasurementInput,
  type BrandChartMeasurementInput,
} from "@/lib/fit/measurements";

type SizingRequirement = {
  type: FitMeasurementType;
  component: FitGarmentComponent;
};

type ProductSizingEvidenceSize = {
  sizeId: string;
  sizeName: string;

  productSizeMeasurements:
    readonly ProductSizeMeasurementInput[];

  mappedChart: {
    measurementBasis: FitMeasurementBasis;
    measurements:
      readonly BrandChartMeasurementInput[];
  } | null;
};

export type ProductSizingEvidenceWarning = {
  sizeId: string;
  sizeName: string;
  type: FitMeasurementType;
  component: FitGarmentComponent;
  reason: "MISSING" | "INVALID";
};

export function assessProductSizingEvidenceWarnings(input: {
  productTypes: readonly ProductType[];
  fitComponents: readonly FitGarmentComponent[];

  explicitRequiredBodyFit:
    readonly SizingRequirement[];

  productMeasurementBasis: FitMeasurementBasis;

  sizes: readonly ProductSizingEvidenceSize[];
}): ProductSizingEvidenceWarning[] {
  if (input.productTypes.length !== 1) {
    return [];
  }

  const rules = getProductMeasurementRules(
    input.productTypes[0],
    input.fitComponents
  );

  if (!rules.supportsSizeRecommendation) {
    return [];
  }

  const requirements =
    input.explicitRequiredBodyFit.length > 0
      ? input.explicitRequiredBodyFit
      : rules.requiredBodyFit;

  const warnings: ProductSizingEvidenceWarning[] = [];

  for (const size of input.sizes) {
    for (const requirement of requirements) {
      const result = resolveSizeMeasurement({
        type: requirement.type,
        component: requirement.component,
        basis: FitMeasurementBasis.BODY,

        productMeasurementBasis:
          input.productMeasurementBasis,

        productSizeMeasurements:
          size.productSizeMeasurements,

        mappedChart: size.mappedChart,
      });

      if (result.status === "RESOLVED") {
        continue;
      }

      warnings.push({
        sizeId: size.sizeId,
        sizeName: size.sizeName,
        type: requirement.type,
        component:
          requirement.component ??
          FitGarmentComponent.WHOLE_GARMENT,
        reason: result.status,
      });
    }
  }

  return warnings;
}