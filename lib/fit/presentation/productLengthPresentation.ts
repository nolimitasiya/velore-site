import type {
  ProductLengthServiceAssessment,
} from "@/lib/fit/getProductSizeRecommendation";

export type ProductLengthPresentation =
  | {
    state: "ASSESSED";
    structure:
      | "SIZE_ATTACHED"
      | "LENGTH_BASED_SIZE";

      sizes: readonly {
        id: string;
        label: string;

        status:
          | "MATCH"
          | "SHORTER"
          | "LONGER";

        garmentRangeCm: {
          min: number;
          max: number;
        };

        shopperReferenceCm: {
          min: number;
          max: number;
        };
      }[];
    }
  | {
      state: "ASSESSED";
      structure: "INDEPENDENT";

      options: readonly {
        id: string;
        label: string;
        valueCm: number;

        status:
          | "MATCH"
          | "SHORTER"
          | "LONGER";

        garmentRangeCm: {
          min: number;
          max: number;
        };

        shopperReferenceCm: {
          min: number;
          max: number;
        };
      }[];
    }
  | {
      state: "PREFERENCE_REQUIRED";
    }
  | {
      state: "PRODUCT_EVIDENCE_UNAVAILABLE";
    }
  | {
      state: "NOT_APPLICABLE";
    }
  | {
      state: "UNAVAILABLE";
    };
    function presentAssessmentStatus(
  status:
    | "MATCH"
    | "SHORTER_THAN_PREFERENCE"
    | "LONGER_THAN_PREFERENCE"
    | "INSUFFICIENT_EVIDENCE"
    | "NOT_APPLICABLE"
):
  | "MATCH"
  | "SHORTER"
  | "LONGER"
  | null {
  switch (status) {
    case "MATCH":
      return "MATCH";

    case "SHORTER_THAN_PREFERENCE":
      return "SHORTER";

    case "LONGER_THAN_PREFERENCE":
      return "LONGER";

    case "INSUFFICIENT_EVIDENCE":
    case "NOT_APPLICABLE":
      return null;
  }
}
export function presentProductLength(
  assessment: ProductLengthServiceAssessment
): ProductLengthPresentation {
  /*
   * Keep narrowing on the service-level discriminator.
   *
   * Do not detach assessment.result before narrowing,
   * otherwise TypeScript loses the relationship between
   * the structure and its corresponding result shape.
   */
  if (assessment.structure === "INDEPENDENT") {
    const result = assessment.result;

    if (result.status === "NOT_APPLICABLE") {
      return {
        state: "NOT_APPLICABLE",
      };
    }

    if (
      result.status ===
      "INSUFFICIENT_EVIDENCE"
    ) {
      if (
        result.reason ===
        "MISSING_SHOPPER_PREFERENCE"
      ) {
        return {
          state: "PREFERENCE_REQUIRED",
        };
      }

      if (
        result.reason ===
        "MISSING_GARMENT_LENGTH"
      ) {
        return {
          state:
            "PRODUCT_EVIDENCE_UNAVAILABLE",
        };
      }

      return {
        state: "UNAVAILABLE",
      };
    }

    const options =
      result.assessments.flatMap(
        ({
          optionId,
          optionLabel,
          valueCm,
          assessment: lengthAssessment,
        }) => {
          if (
            !lengthAssessment.shopperReference
          ) {
            return [];
          }

          const status =
            presentAssessmentStatus(
              lengthAssessment.status
            );

          if (status === null) {
            return [];
          }

          return [
            {
              id: optionId,
              label: optionLabel,
              valueCm,

              status,

              garmentRangeCm: {
                min:
                  lengthAssessment
                    .garmentRange
                    .minValueCm,

                max:
                  lengthAssessment
                    .garmentRange
                    .maxValueCm,
              },

              shopperReferenceCm: {
                min:
                  lengthAssessment
                    .shopperReference
                    .minValueCm,

                max:
                  lengthAssessment
                    .shopperReference
                    .maxValueCm,
              },
            },
          ];
        }
      );

    if (options.length === 0) {
      return {
        state: "UNAVAILABLE",
      };
    }

    return {
      state: "ASSESSED",
      structure: "INDEPENDENT",
      options,
    };
  }

  /*
 * Reaching here means the service discriminator is
 * SIZE_DEPENDENT or LENGTH_BASED_SIZE.
 *
 * Both use ProductLengthAssessmentResult because both
 * derive length evidence from ProductSize records.
 *
 * Their shopper-facing semantics remain distinct:
 * SIZE_DEPENDENT becomes SIZE_ATTACHED, while
 * LENGTH_BASED_SIZE remains LENGTH_BASED_SIZE.
 */
  const result = assessment.result;

  if (result.status === "NOT_APPLICABLE") {
    return {
      state: "NOT_APPLICABLE",
    };
  }

  if (
    result.status ===
    "INSUFFICIENT_EVIDENCE"
  ) {
    if (
      result.reason ===
      "MISSING_SHOPPER_PREFERENCE"
    ) {
      return {
        state: "PREFERENCE_REQUIRED",
      };
    }

    if (
      result.reason ===
      "MISSING_GARMENT_LENGTH"
    ) {
      return {
        state:
          "PRODUCT_EVIDENCE_UNAVAILABLE",
      };
    }

    return {
      state: "UNAVAILABLE",
    };
  }

  const sizes =
    result.assessments.flatMap(
      ({
        sizeId,
        sizeLabel,
        assessment: lengthAssessment,
      }) => {
        if (
          !lengthAssessment.shopperReference
        ) {
          return [];
        }

        const status =
          presentAssessmentStatus(
            lengthAssessment.status
          );

        if (status === null) {
          return [];
        }

        return [
          {
            id: sizeId,
            label: sizeLabel,

            status,

            garmentRangeCm: {
              min:
                lengthAssessment
                  .garmentRange
                  .minValueCm,

              max:
                lengthAssessment
                  .garmentRange
                  .maxValueCm,
            },

            shopperReferenceCm: {
              min:
                lengthAssessment
                  .shopperReference
                  .minValueCm,

              max:
                lengthAssessment
                  .shopperReference
                  .maxValueCm,
            },
          },
        ];
      }
    );

  if (sizes.length === 0) {
    return {
      state: "UNAVAILABLE",
    };
  }

  return {
  state: "ASSESSED",

  structure:
    assessment.structure ===
    "LENGTH_BASED_SIZE"
      ? "LENGTH_BASED_SIZE"
      : "SIZE_ATTACHED",

  sizes,
};
}