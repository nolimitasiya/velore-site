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

export const PRODUCT_MEASUREMENT_RULES: Partial<
  Record<ProductType, ProductMeasurementRules>
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
  measurement(
    FitMeasurementType.GARMENT_LENGTH,
    FitGarmentComponent.DRESS
  ),
  measurement(
    FitMeasurementType.FRONT_LENGTH,
    FitGarmentComponent.DRESS
  ),
  measurement(
    FitMeasurementType.SLEEVE_LENGTH,
    FitGarmentComponent.DRESS
  ),
],

    coverage: [],
  },

  ABAYA: {
  supportsSizeRecommendation: true,

  requiredBodyFit: [
    measurement(
      FitMeasurementType.BUST,
      FitGarmentComponent.ABAYA
    ),
  ],

  optionalBodyFit: [
    measurement(
      FitMeasurementType.WAIST,
      FitGarmentComponent.ABAYA
    ),
    measurement(
      FitMeasurementType.HIP,
      FitGarmentComponent.ABAYA
    ),
    measurement(
      FitMeasurementType.SHOULDER_WIDTH,
      FitGarmentComponent.ABAYA
    ),
  ],

  length: [
    measurement(
      FitMeasurementType.GARMENT_LENGTH,
      FitGarmentComponent.ABAYA
    ),
    measurement(
      FitMeasurementType.SLEEVE_LENGTH,
      FitGarmentComponent.ABAYA
    ),
  ],

  coverage: [],
},

SKIRT: {
  supportsSizeRecommendation: true,

  requiredBodyFit: [
    measurement(
      FitMeasurementType.WAIST,
      FitGarmentComponent.SKIRT
    ),
    measurement(
      FitMeasurementType.HIP,
      FitGarmentComponent.SKIRT
    ),
  ],

  optionalBodyFit: [],

  length: [
    measurement(
      FitMeasurementType.SKIRT_LENGTH,
      FitGarmentComponent.SKIRT
    ),
  ],

  coverage: [],
},

  TOP: {
  supportsSizeRecommendation: true,

  requiredBodyFit: [
    measurement(
      FitMeasurementType.BUST,
      FitGarmentComponent.TOP
    ),
  ],

  optionalBodyFit: [
    measurement(
      FitMeasurementType.WAIST,
      FitGarmentComponent.TOP
    ),
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
      FitMeasurementType.SLEEVE_LENGTH,
      FitGarmentComponent.TOP
    ),
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
    measurement(
      FitMeasurementType.BUST,
      FitGarmentComponent.JILBAB
    ),
  ],

  optionalBodyFit: [
    measurement(
      FitMeasurementType.HIP,
      FitGarmentComponent.JILBAB
    ),
    measurement(
      FitMeasurementType.SHOULDER_WIDTH,
      FitGarmentComponent.JILBAB
    ),
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
    measurement(
      FitMeasurementType.BUST,
      FitGarmentComponent.JACKET
    ),
  ],

  optionalBodyFit: [
    measurement(
      FitMeasurementType.WAIST,
      FitGarmentComponent.JACKET
    ),
    measurement(
      FitMeasurementType.HIP,
      FitGarmentComponent.JACKET
    ),
    measurement(
      FitMeasurementType.SHOULDER_WIDTH,
      FitGarmentComponent.JACKET
    ),
  ],

  length: [
    measurement(
      FitMeasurementType.GARMENT_LENGTH,
      FitGarmentComponent.JACKET
    ),
    measurement(
      FitMeasurementType.SLEEVE_LENGTH,
      FitGarmentComponent.JACKET
    ),
  ],

  coverage: [],
},

 HOODIE_SWEATSHIRT: {
  supportsSizeRecommendation: true,

  requiredBodyFit: [
    measurement(
      FitMeasurementType.BUST,
      FitGarmentComponent.TOP
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
      FitMeasurementType.SLEEVE_LENGTH,
      FitGarmentComponent.TOP
    ),
  ],

  coverage: [],
},

PANTS: {
  supportsSizeRecommendation: true,

  requiredBodyFit: [
    measurement(
      FitMeasurementType.WAIST,
      FitGarmentComponent.TROUSER
    ),
    measurement(
      FitMeasurementType.HIP,
      FitGarmentComponent.TROUSER
    ),
  ],

  optionalBodyFit: [],

  length: [
    measurement(
      FitMeasurementType.INSEAM,
      FitGarmentComponent.TROUSER
    ),
    measurement(
      FitMeasurementType.TROUSER_LENGTH,
      FitGarmentComponent.TROUSER
    ),
  ],

  coverage: [],
},

 BLAZER: {
  supportsSizeRecommendation: true,

  requiredBodyFit: [
    measurement(
      FitMeasurementType.BUST,
      FitGarmentComponent.JACKET
    ),
  ],

  optionalBodyFit: [
  measurement(
    FitMeasurementType.WAIST,
    FitGarmentComponent.JACKET
  ),
  measurement(
    FitMeasurementType.HIP,
    FitGarmentComponent.JACKET
  ),
  measurement(
    FitMeasurementType.SHOULDER_WIDTH,
    FitGarmentComponent.JACKET
  ),
],

  length: [
    measurement(
      FitMeasurementType.GARMENT_LENGTH,
      FitGarmentComponent.JACKET
    ),
    measurement(
      FitMeasurementType.SLEEVE_LENGTH,
      FitGarmentComponent.JACKET
    ),
  ],

  coverage: [],
},

  T_SHIRT: {
  supportsSizeRecommendation: true,

  requiredBodyFit: [
    measurement(
      FitMeasurementType.BUST,
      FitGarmentComponent.TOP
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

const SET_TOP_SKIRT_RULES: ProductMeasurementRules = {
  supportsSizeRecommendation: true,

  requiredBodyFit: [
    measurement(
      FitMeasurementType.BUST,
      FitGarmentComponent.TOP
    ),
    measurement(
      FitMeasurementType.WAIST,
      FitGarmentComponent.SKIRT
    ),
    measurement(
      FitMeasurementType.HIP,
      FitGarmentComponent.SKIRT
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
      FitMeasurementType.SKIRT_LENGTH,
      FitGarmentComponent.SKIRT
    ),
  ],

  coverage: [],
};

const SET_TOP_TROUSER_RULES: ProductMeasurementRules = {
  supportsSizeRecommendation: true,

  requiredBodyFit: [
    measurement(
      FitMeasurementType.BUST,
      FitGarmentComponent.TOP
    ),
    measurement(
      FitMeasurementType.WAIST,
      FitGarmentComponent.TROUSER
    ),
    measurement(
      FitMeasurementType.HIP,
      FitGarmentComponent.TROUSER
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
      FitMeasurementType.INSEAM,
      FitGarmentComponent.TROUSER
    ),
    measurement(
      FitMeasurementType.TROUSER_LENGTH,
      FitGarmentComponent.TROUSER
    ),
  ],

  coverage: [],
};

const ACTIVEWEAR_TOP_RULES: ProductMeasurementRules = {
  supportsSizeRecommendation: true,

  requiredBodyFit: [
    measurement(
      FitMeasurementType.BUST,
      FitGarmentComponent.TOP
    ),
  ],

  optionalBodyFit: [],

  /*
   * Activewear tops can retain factual garment
   * dimensions in the catalogue, but Veilora
   * does not currently personalise top length
   * or sleeve length.
   */
  length: [],

  coverage: [],
};

const ACTIVEWEAR_TROUSER_RULES: ProductMeasurementRules = {
  supportsSizeRecommendation: true,

  requiredBodyFit: [
    measurement(
      FitMeasurementType.WAIST,
      FitGarmentComponent.TROUSER
    ),
    measurement(
      FitMeasurementType.HIP,
      FitGarmentComponent.TROUSER
    ),
  ],

  optionalBodyFit: [],

  length: [
    measurement(
      FitMeasurementType.INSEAM,
      FitGarmentComponent.TROUSER
    ),
    measurement(
      FitMeasurementType.TROUSER_LENGTH,
      FitGarmentComponent.TROUSER
    ),
  ],

  coverage: [],
};

const ACTIVEWEAR_TOP_TROUSER_RULES: ProductMeasurementRules = {
  supportsSizeRecommendation: true,

  requiredBodyFit: [
    measurement(
      FitMeasurementType.BUST,
      FitGarmentComponent.TOP
    ),
    measurement(
      FitMeasurementType.WAIST,
      FitGarmentComponent.TROUSER
    ),
    measurement(
      FitMeasurementType.HIP,
      FitGarmentComponent.TROUSER
    ),
  ],

  optionalBodyFit: [],

  length: [
    measurement(
      FitMeasurementType.INSEAM,
      FitGarmentComponent.TROUSER
    ),
    measurement(
      FitMeasurementType.TROUSER_LENGTH,
      FitGarmentComponent.TROUSER
    ),
  ],

  coverage: [],
};

function hasExactComponents(
  actual: readonly FitGarmentComponent[],
  expected: readonly FitGarmentComponent[]
): boolean {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);

  return (
    actualSet.size === expectedSet.size &&
    [...expectedSet].every((component) =>
      actualSet.has(component)
    )
  );
}

function getSetMeasurementRules(
  fitComponents: readonly FitGarmentComponent[]
): ProductMeasurementRules {
  if (
    hasExactComponents(fitComponents, [
      FitGarmentComponent.TOP,
      FitGarmentComponent.SKIRT,
    ])
  ) {
    return SET_TOP_SKIRT_RULES;
  }

  if (
    hasExactComponents(fitComponents, [
      FitGarmentComponent.TOP,
      FitGarmentComponent.TROUSER,
    ])
  ) {
    return SET_TOP_TROUSER_RULES;
  }

  return EMPTY_RULES;
}

function getActivewearMeasurementRules(
  fitComponents: readonly FitGarmentComponent[]
): ProductMeasurementRules {
  if (
    hasExactComponents(fitComponents, [
      FitGarmentComponent.TOP,
    ])
  ) {
    return ACTIVEWEAR_TOP_RULES;
  }

  if (
    hasExactComponents(fitComponents, [
      FitGarmentComponent.TROUSER,
    ])
  ) {
    return ACTIVEWEAR_TROUSER_RULES;
  }

  if (
    hasExactComponents(fitComponents, [
      FitGarmentComponent.TOP,
      FitGarmentComponent.TROUSER,
    ])
  ) {
    return ACTIVEWEAR_TOP_TROUSER_RULES;
  }

  /*
   * Activewear is structurally ambiguous without
   * an explicit supported garment composition.
   * Fail closed rather than guessing which body
   * measurements should drive the recommendation.
   */
  return EMPTY_RULES;
}

export function getProductMeasurementRules(
  productType: ProductType,
  fitComponents: readonly FitGarmentComponent[] = []
): ProductMeasurementRules {
  if (productType === ProductType.SETS) {
  return getSetMeasurementRules(
    fitComponents
  );
}

if (
  productType === ProductType.ACTIVEWEAR
) {
  return getActivewearMeasurementRules(
    fitComponents
  );
}

return (
    PRODUCT_MEASUREMENT_RULES[productType] ??
    EMPTY_RULES
  );
}