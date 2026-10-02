import {
  ProductType,
  FitDataSource,
} from "@prisma/client";

import {
  loadNormalizedProductFitMeasurements,
  type RecommendationProductRecord,
} from "@/lib/fit/loadRecommendationInput";

import {
  presentProductDimensions,
  type ProductDimensionsPresentation,
} from "@/lib/fit/presentation/productDimensionsPresentation";

type ProductDimensionsInput = {
  productTypes: readonly {
    productType: ProductType;
  }[];

  legacyProductType: ProductType | null;

  fitProfile:
  | (
      NonNullable<
        RecommendationProductRecord["fitProfile"]
      > & {
        source: FitDataSource | null;
      }
    )
  | null;
};

function resolveProductType(
  product: ProductDimensionsInput
): ProductType | null {
  const canonicalTypes = Array.from(
    new Set(
      product.productTypes.map(
        (item) => item.productType
      )
    )
  );

  /*
   * Canonical ProductProductType is authoritative.
   *
   * We deliberately fail closed when more than one
   * canonical product type exists because factual
   * dimension semantics are product-type-specific.
   */
  if (canonicalTypes.length === 1) {
    return canonicalTypes[0];
  }

  if (canonicalTypes.length > 1) {
    return null;
  }

  /*
   * Legacy Product.productType remains a compatibility
   * fallback only when no canonical type exists.
   */
  return product.legacyProductType;
}

export function getProductDimensions(
  product: ProductDimensionsInput
): ProductDimensionsPresentation {
  const productType =
    resolveProductType(product);

  if (productType === null) {
    return {
      state: "NOT_APPLICABLE",
    };
  }
  if (
  productType !== ProductType.HIJAB &&
  productType !== ProductType.KHIMAR
) {
  return {
    state: "NOT_APPLICABLE",
  };
}

  /*
   * Reuse the existing normalization boundary rather than
   * allowing storefront code to interpret raw Prisma
   * measurement values or measurement basis.
   *
   * No sizes or length options are required because this
   * path represents factual product-level dimensions only.
   */
  const normalizationRecord:
    RecommendationProductRecord = {
      productTypes: product.productTypes,

      legacyProductType:
        product.legacyProductType,

      lengthStructure: null,
      lengthOptions: [],

      fitProfile:
        product.fitProfile,

      productSizes: [],
    };

    if (product.fitProfile === null) {
  return {
    state: "PRODUCT_EVIDENCE_UNAVAILABLE",
  };
}

  return presentProductDimensions({
  productType,
  source: product.fitProfile.source,

  measurements:
    loadNormalizedProductFitMeasurements(
      normalizationRecord
    ),
});
}