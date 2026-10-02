import {
  loadProductRecommendationData,
  loadShopperRecommendationData,
} from "@/lib/fit/loadRecommendationData";

import {
  loadNormalizedProductFitMeasurements,
  loadNormalizedProductLengthInput,
  loadRecommendationInput,
  type RecommendationProductRecord,
  type RecommendationShopperRecord,
} from "@/lib/fit/loadRecommendationInput";

import {
  assessProductSizes,
} from "@/lib/fit/recommendation";

import {
  assessIndependentProductLengths,
  assessProductLengths,
  type IndependentProductLengthAssessmentResult,
  type ProductLengthAssessmentResult,
} from "@/lib/fit/productLengthAssessment";

import {
  presentProductDimensions,
  type ProductDimensionsPresentation,
} from "@/lib/fit/presentation/productDimensionsPresentation";

export type ProductLengthServiceAssessment =
  | {
      structure: "INDEPENDENT";
      result:
        IndependentProductLengthAssessmentResult;
    }
  | {
      structure:
        | "SIZE_DEPENDENT"
        | "LENGTH_BASED_SIZE";
      result: ProductLengthAssessmentResult;
    };

export type ProductSizeRecommendationServiceResult =
  | {
      status: "ASSESSED";

      recommendation: ReturnType<
        typeof assessProductSizes
      >;

      lengthAssessment:
  ProductLengthServiceAssessment;

productDimensions:
  ProductDimensionsPresentation;

shopperDisplayUnit: "CM" | "IN";
    }
  | {
      status: "UNAVAILABLE";
      recommendation: null;
      reason:
        | "PRODUCT_NOT_FOUND"
        | "SHOPPER_NOT_FOUND"
        | "SHOPPER_FIT_PROFILE_MISSING"
        | "PRODUCT_NOT_LOADABLE";
      detail?: string;
    };

export async function getProductSizeRecommendation(
  args: {
    productId: string;
    shopperId: string;
  }
): Promise<ProductSizeRecommendationServiceResult> {
  /*
   * Product and shopper are independent reads.
   *
   * Neither depends on the result of the other, so load
   * them concurrently rather than introducing unnecessary
   * database latency.
   */
  const [
    product,
    shopper,
  ] = await Promise.all([
    loadProductRecommendationData(
      args.productId
    ),

    loadShopperRecommendationData(
      args.shopperId
    ),
  ]);

  if (product === null) {
    return {
      status: "UNAVAILABLE",
      recommendation: null,
      reason: "PRODUCT_NOT_FOUND",
    };
  }

  if (shopper === null) {
    return {
      status: "UNAVAILABLE",
      recommendation: null,
      reason: "SHOPPER_NOT_FOUND",
    };
  }

  if (shopper.fitProfile === null) {
    return {
      status: "UNAVAILABLE",
      recommendation: null,
      reason:
        "SHOPPER_FIT_PROFILE_MISSING",
    };
  }

  /*
   * Prisma's generated result structurally matches the
   * deliberately minimal loader contracts.
   *
   * Rename only the legacy Product.productType field at
   * this boundary. The canonical ProductProductType
   * relation remains productTypes.
   */
  const productRecord: RecommendationProductRecord = {
  productTypes:
    product.productTypes,

  legacyProductType:
    product.productType,

  lengthStructure:
    product.lengthStructure,

  lengthOptions:
    product.lengthOptions,

  fitProfile:
    product.fitProfile,

  productSizes:
    product.productSizes,
};

  const shopperRecord: RecommendationShopperRecord = {
    fitPreference:
      shopper.fitProfile.fitPreference,

    measurements:
      shopper.fitProfile.measurements,
  };

  const loaded =
    loadRecommendationInput({
      product: productRecord,
      shopper: shopperRecord,
    });

  if (loaded.status === "NOT_LOADABLE") {
    return {
      status: "UNAVAILABLE",
      recommendation: null,
      reason: "PRODUCT_NOT_LOADABLE",
      detail: loaded.reason,
    };
  }

const recommendation =
  assessProductSizes(loaded.input);

  /*
 * Factual product dimensions are independent from
 * personalised size and length assessment.
 *
 * The loader exposes only explicit GARMENT product-level
 * measurements. The presentation layer further restricts
 * these dimensions to supported one-size product types.
 */
const productDimensions =
  presentProductDimensions({
    productType:
      loaded.input.productType,

    source:
      product.fitProfile?.source ??
      null,

    measurements:
      loadNormalizedProductFitMeasurements(
        productRecord
      ),
  });


/*
 * Length is assessed independently from conventional
 * size suitability.
 *
 * A product may have insufficient body-fit evidence while
 * still having enough verified garment-length evidence to
 * provide useful length guidance.
 *
 * Conversely, a valid size recommendation does not imply
 * that the garment length matches the shopper's preference.
 */
const normalizedLengthInput =
  loadNormalizedProductLengthInput(
    productRecord
  );

const lengthAssessment:
  ProductLengthServiceAssessment =
    normalizedLengthInput.structure ===
    "INDEPENDENT"
      ? {
          structure: "INDEPENDENT",

          result:
            assessIndependentProductLengths({
              productType:
                loaded.input.productType,

              shopperMeasurements:
                loaded.input
                  .shopperMeasurements,

              lengthInput:
                normalizedLengthInput,
            }),
        }
      : normalizedLengthInput.structure ===
          "LENGTH_BASED_SIZE"
        ? {
            structure:
              "LENGTH_BASED_SIZE",

            result:
              assessProductLengths({
                input: loaded.input,
                structure:
                  "LENGTH_BASED_SIZE",
              }),
          }
        : {
            /*
             * Explicit SIZE_DEPENDENT and legacy/null
             * products both retain the conventional
             * size-attached length path.
             *
             * LENGTH_BASED_SIZE is explicit-only and
             * must never be inferred from an absent
             * structure.
             */
            structure: "SIZE_DEPENDENT",

            result:
              assessProductLengths({
                input: loaded.input,
                structure:
                  "SIZE_DEPENDENT",
              }),
          };

return {
  status: "ASSESSED",

  recommendation,

  lengthAssessment,

  productDimensions,

  shopperDisplayUnit:
    shopper.fitProfile.preferredUnit,
};
}