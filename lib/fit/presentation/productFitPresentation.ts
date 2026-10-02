import type {
  ProductSizeRecommendationServiceResult,
} from "@/lib/fit/getProductSizeRecommendation";

export type ProductFitPresentation =
  | {
      state: "SIGN_IN_REQUIRED";
    }
  | {
      state: "FIT_PROFILE_REQUIRED";
    }
  | {
      state: "RECOMMENDED";
      recommendedSize: {
        id: string;
        label: string;
      };
      suitableSizes: readonly {
        id: string;
        label: string;
      }[];
    }
  | {
      state: "MULTIPLE_SUITABLE";
      suitableSizes: readonly {
        id: string;
        label: string;
      }[];
    }
  | {
      state: "NO_SUITABLE_SIZE";
    }
  | {
      state: "INSUFFICIENT_EVIDENCE";
    }
  | {
      state: "NOT_APPLICABLE";
    }
  | {
      state: "UNAVAILABLE";
    };

type PresentProductFitInput = {
  isAuthenticated: boolean;
  result:
    | ProductSizeRecommendationServiceResult
    | null;
};

function assertNever(
  value: never
): never {
  throw new Error(
    `Unhandled Veilora Fit state: ${String(value)}`
  );
}

export function presentProductFit(
  input: PresentProductFitInput
): ProductFitPresentation {
  /*
   * Authentication belongs to the application layer,
   * not the recommendation service.
   */
  if (!input.isAuthenticated) {
    return {
      state: "SIGN_IN_REQUIRED",
    };
  }

  /*
   * An authenticated shopper should normally have a
   * service result. Preserve a defensive fail-closed
   * state rather than pretending Fit was assessed.
   */
  if (input.result === null) {
    return {
      state: "UNAVAILABLE",
    };
  }

  if (input.result.status === "UNAVAILABLE") {
    switch (input.result.reason) {
      case "SHOPPER_FIT_PROFILE_MISSING":
        return {
          state: "FIT_PROFILE_REQUIRED",
        };

      case "PRODUCT_NOT_FOUND":
      case "SHOPPER_NOT_FOUND":
      case "PRODUCT_NOT_LOADABLE":
        return {
          state: "UNAVAILABLE",
        };

      default:
        return assertNever(
          input.result.reason
        );
    }
  }

  const recommendation =
    input.result.recommendation;

  switch (recommendation.status) {
    case "RECOMMENDED": {
      /*
       * RECOMMENDED is only valid when the engine has
       * actually supplied the winning size.
       *
       * Fail closed if that invariant is ever violated
       * by a future engine change.
       */
      if (!recommendation.recommendedSize) {
        return {
          state: "UNAVAILABLE",
        };
      }

      return {
        state: "RECOMMENDED",

        recommendedSize: {
          id: recommendation.recommendedSize.sizeId,
          label:
            recommendation.recommendedSize.sizeLabel,
        },

        suitableSizes:
          recommendation.suitableSizes.map(
            (size) => ({
              id: size.sizeId,
              label: size.sizeLabel,
            })
          ),
      };
    }

    case "MULTIPLE_SUITABLE":
      /*
       * Preserve every suitable size.
       *
       * Missing preference evidence must never make an
       * otherwise suitable candidate disappear from the
       * shopper-facing result.
       */
      return {
        state: "MULTIPLE_SUITABLE",

        suitableSizes:
          recommendation.suitableSizes.map(
            (size) => ({
              id: size.sizeId,
              label: size.sizeLabel,
            })
          ),
      };

    case "NO_SUITABLE_SIZE":
      return {
        state: "NO_SUITABLE_SIZE",
      };

    case "INSUFFICIENT_EVIDENCE":
      return {
        state: "INSUFFICIENT_EVIDENCE",
      };

    case "SIZE_RECOMMENDATION_NOT_APPLICABLE":
      return {
        state: "NOT_APPLICABLE",
      };

    default:
      return assertNever(
        recommendation.status
      );
  }
}