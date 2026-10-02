import {
  FitGarmentComponent,
  FitMeasurementType,
  ProductType,
} from "@prisma/client";

export type FitMeasurementRole =
  | "BODY_FIT"
  | "SECONDARY_FIT"
  | "LENGTH"
  | "COVERAGE";

export type MeasurementRequirement = {
  type: FitMeasurementType;
  component?: FitGarmentComponent;
};

export type ProductMeasurementRules = {
  supportsSizeRecommendation: boolean;

  requiredBodyFit: readonly MeasurementRequirement[];
  optionalBodyFit: readonly MeasurementRequirement[];

  length: readonly MeasurementRequirement[];
  coverage: readonly MeasurementRequirement[];
};

const measurement = (
  type: FitMeasurementType,
  component?: FitGarmentComponent
): MeasurementRequirement => ({
  type,
  component,
});

const EMPTY_RULES: ProductMeasurementRules = {
  supportsSizeRecommendation: false,
  requiredBodyFit: [],
  optionalBodyFit: [],
  length: [],
  coverage: [],
};

export const PRODUCT_MEASUREMENT_RULES: Record<
  ProductType,
  ProductMeasurementRules
> = {
  DRESS: {
    supportsSizeRecommendation: true,

    requiredBodyFit: [
      measurement(
         FitMeasurementType.BUST,
         FitGarmentComponent.DRESS
  ),
      measurement(
        FitMeasurementType.WAIST,
        FitGarmentComponent.DRESS
  ),
       measurement(
        FitMeasurementType.HIP,
        FitGarmentComponent.DRESS
  ),
],

    optionalBodyFit: [
      measurement(
        FitMeasurementType.SHOULDER_WIDTH,
        FitGarmentComponent.DRESS
      ),
    ],

    length: [
      measurement(FitMeasurementType.GARMENT_LENGTH),
      measurement(FitMeasurementType.FRONT_LENGTH),
      measurement(FitMeasurementType.SLEEVE_LENGTH),
    ],

    coverage: [],
  },

  ABAYA: {
    supportsSizeRecommendation: true,

    requiredBodyFit: [
      measurement(FitMeasurementType.BUST),
    ],

    optionalBodyFit: [
      measurement(FitMeasurementType.WAIST),
      measurement(FitMeasurementType.HIP),
      measurement(FitMeasurementType.SHOULDER_WIDTH),
    ],

    length: [
      measurement(FitMeasurementType.GARMENT_LENGTH),
      measurement(FitMeasurementType.SLEEVE_LENGTH),
    ],

    coverage: [],
  },

  SKIRT: {
    supportsSizeRecommendation: true,

    requiredBodyFit: [
      measurement(FitMeasurementType.WAIST),
      measurement(FitMeasurementType.HIP),
    ],

    optionalBodyFit: [],

    length: [
      measurement(FitMeasurementType.SKIRT_LENGTH),
    ],

    coverage: [],
  },

  TOP: {
    supportsSizeRecommendation: true,

    requiredBodyFit: [
      measurement(FitMeasurementType.BUST),
    ],

    optionalBodyFit: [
      measurement(FitMeasurementType.WAIST),
      measurement(FitMeasurementType.SHOULDER_WIDTH),
    ],

    length: [
      measurement(FitMeasurementType.TOP_LENGTH),
      measurement(FitMeasurementType.SLEEVE_LENGTH),
    ],

    coverage: [],
  },

  HIJAB: {
    supportsSizeRecommendation: false,

    requiredBodyFit: [],
    optionalBodyFit: [],
    length: [],

    coverage: [
      measurement(
        FitMeasurementType.WIDTH,
        FitGarmentComponent.HIJAB
      ),
      measurement(
        FitMeasurementType.FRONT_LENGTH,
        FitGarmentComponent.HIJAB
      ),
      measurement(
        FitMeasurementType.BACK_LENGTH,
        FitGarmentComponent.HIJAB
      ),
    ],
  },

  ACTIVEWEAR: {
    supportsSizeRecommendation: true,

    requiredBodyFit: [
      measurement(FitMeasurementType.BUST),
      measurement(FitMeasurementType.WAIST),
      measurement(FitMeasurementType.HIP),
    ],

    optionalBodyFit: [],

    length: [
      measurement(FitMeasurementType.INSEAM),
      measurement(FitMeasurementType.SLEEVE_LENGTH),
    ],

    coverage: [],
  },

  SETS: {
    supportsSizeRecommendation: true,

    requiredBodyFit: [
      measurement(
        FitMeasurementType.BUST,
        FitGarmentComponent.TOP
      ),
      measurement(
        FitMeasurementType.WAIST,
        FitGarmentComponent.BOTTOM
      ),
      measurement(
        FitMeasurementType.HIP,
        FitGarmentComponent.BOTTOM
      ),
    ],

    optionalBodyFit: [
      measurement(
        FitMeasurementType.SHOULDER_WIDTH,
        FitGarmentComponent.TOP
      ),
    ],

    length: [
      measurement(
        FitMeasurementType.TOP_LENGTH,
        FitGarmentComponent.TOP
      ),
      measurement(
        FitMeasurementType.TROUSER_LENGTH,
        FitGarmentComponent.TROUSER
      ),
      measurement(
        FitMeasurementType.SKIRT_LENGTH,
        FitGarmentComponent.SKIRT
      ),
    ],

    coverage: [],
  },

  MATERNITY: {
    supportsSizeRecommendation: true,

    requiredBodyFit: [
      measurement(FitMeasurementType.BUST),
      measurement(FitMeasurementType.HIP),
    ],

    optionalBodyFit: [
      measurement(FitMeasurementType.WAIST),
    ],

    length: [
      measurement(FitMeasurementType.GARMENT_LENGTH),
    ],

    coverage: [],
  },

  KHIMAR: {
    supportsSizeRecommendation: false,

    requiredBodyFit: [],
    optionalBodyFit: [],
    length: [],

    coverage: [
      measurement(
        FitMeasurementType.FRONT_LENGTH,
        FitGarmentComponent.KHIMAR
      ),
      measurement(
        FitMeasurementType.BACK_LENGTH,
        FitGarmentComponent.KHIMAR
      ),
      measurement(
        FitMeasurementType.WIDTH,
        FitGarmentComponent.KHIMAR
      ),
    ],
  },

  JILBAB: {
    supportsSizeRecommendation: true,

    requiredBodyFit: [
      measurement(FitMeasurementType.BUST),
    ],

    optionalBodyFit: [
      measurement(FitMeasurementType.HIP),
      measurement(FitMeasurementType.SHOULDER_WIDTH),
    ],

    length: [
      measurement(
        FitMeasurementType.GARMENT_LENGTH,
        FitGarmentComponent.JILBAB
      ),
      measurement(
        FitMeasurementType.SLEEVE_LENGTH,
        FitGarmentComponent.JILBAB
      ),
    ],

    coverage: [],
  },

  COATS_JACKETS: {
    supportsSizeRecommendation: true,

    requiredBodyFit: [
      measurement(FitMeasurementType.BUST),
    ],

    optionalBodyFit: [
      measurement(FitMeasurementType.WAIST),
      measurement(FitMeasurementType.HIP),
      measurement(FitMeasurementType.SHOULDER_WIDTH),
    ],

    length: [
      measurement(FitMeasurementType.GARMENT_LENGTH),
      measurement(FitMeasurementType.SLEEVE_LENGTH),
    ],

    coverage: [],
  },

  HOODIE_SWEATSHIRT: {
    supportsSizeRecommendation: true,

    requiredBodyFit: [
      measurement(FitMeasurementType.BUST),
    ],

    optionalBodyFit: [
      measurement(FitMeasurementType.SHOULDER_WIDTH),
    ],

    length: [
      measurement(FitMeasurementType.TOP_LENGTH),
      measurement(FitMeasurementType.SLEEVE_LENGTH),
    ],

    coverage: [],
  },

  PANTS: {
    supportsSizeRecommendation: true,

    requiredBodyFit: [
      measurement(FitMeasurementType.WAIST),
      measurement(FitMeasurementType.HIP),
    ],

    optionalBodyFit: [],

    length: [
      measurement(FitMeasurementType.INSEAM),
      measurement(FitMeasurementType.TROUSER_LENGTH),
    ],

    coverage: [],
  },

  BLAZER: {
    supportsSizeRecommendation: true,

    requiredBodyFit: [
      measurement(FitMeasurementType.BUST),
    ],

    optionalBodyFit: [
      measurement(FitMeasurementType.WAIST),
      measurement(FitMeasurementType.SHOULDER_WIDTH),
    ],

    length: [
      measurement(FitMeasurementType.GARMENT_LENGTH),
      measurement(FitMeasurementType.SLEEVE_LENGTH),
    ],

    coverage: [],
  },

  T_SHIRT: {
    supportsSizeRecommendation: true,

    requiredBodyFit: [
      measurement(FitMeasurementType.BUST),
    ],

    optionalBodyFit: [
      measurement(FitMeasurementType.SHOULDER_WIDTH),
    ],

    length: [
      measurement(FitMeasurementType.TOP_LENGTH),
    ],

    coverage: [],
  },

  ACCESSORIES: {
    supportsSizeRecommendation: false,

    requiredBodyFit: [],
    optionalBodyFit: [],
    length: [],
    coverage: [],
  },
};

export function getProductMeasurementRules(
  productType: ProductType
): ProductMeasurementRules {
  return (
    PRODUCT_MEASUREMENT_RULES[productType] ??
    EMPTY_RULES
  );
}