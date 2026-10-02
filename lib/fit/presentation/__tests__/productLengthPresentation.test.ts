import {
  describe,
  expect,
  it,
} from "vitest";

import {
  FitMeasurementType,
} from "@prisma/client";

import {
  presentProductLength,
} from "@/lib/fit/presentation/productLengthPresentation";

describe("presentProductLength", () => {
  it("preserves a matching size-attached length assessment with canonical measurement evidence", () => {
    expect(
      presentProductLength({
        structure: "SIZE_DEPENDENT",

        result: {
  status: "ASSESSED",
  structure: "SIZE_DEPENDENT",
  assessments: [
            {
              sizeId: "size-m",
              sizeLabel: "M",

              assessment: {
                measurementType:
                  FitMeasurementType.GARMENT_LENGTH,

                garmentRange: {
                  minValueCm: 147.32,
                  maxValueCm: 147.32,
                },

                shopperReference: {
                  minValueCm: 147.32,
                  maxValueCm: 147.32,
                },

                status: "MATCH",
                reason:
                  "WITHIN_PREFERRED_RANGE",
              },
            },
          ],
        },
      })
    ).toEqual({
  state: "ASSESSED",
  structure: "SIZE_ATTACHED",

      sizes: [
        {
          id: "size-m",
          label: "M",
          status: "MATCH",

          garmentRangeCm: {
            min: 147.32,
            max: 147.32,
          },

          shopperReferenceCm: {
            min: 147.32,
            max: 147.32,
          },
        },
      ],
    });
  });

  it("translates shorter-than-preference into the shopper-facing SHORTER state", () => {
    const result =
      presentProductLength({
        structure: "SIZE_DEPENDENT",

        result: {
  status: "ASSESSED",
  structure: "SIZE_DEPENDENT",
  assessments: [

            {
              sizeId: "size-s",
              sizeLabel: "S",

              assessment: {
                measurementType:
                  FitMeasurementType.GARMENT_LENGTH,

                garmentRange: {
                  minValueCm: 140,
                  maxValueCm: 140,
                },

                shopperReference: {
                  minValueCm: 147.32,
                  maxValueCm: 147.32,
                },

                status:
                  "SHORTER_THAN_PREFERENCE",
                reason:
                  "BELOW_PREFERRED_RANGE",
              },
            },
          ],
        },
      });

    expect(result.state).toBe("ASSESSED");

    if (
      result.state !== "ASSESSED" ||
      result.structure !== "SIZE_ATTACHED"
    ) {
      throw new Error(
        "Expected size-attached length presentation"
      );
    }

    expect(result.sizes[0].status).toBe(
      "SHORTER"
    );
  });

  it("translates longer-than-preference into the shopper-facing LONGER state", () => {
    const result =
      presentProductLength({
        structure: "SIZE_DEPENDENT",

        result: {
  status: "ASSESSED",
  structure: "SIZE_DEPENDENT",
  assessments: [
            {
              sizeId: "size-l",
              sizeLabel: "L",

              assessment: {
                measurementType:
                  FitMeasurementType.GARMENT_LENGTH,

                garmentRange: {
                  minValueCm: 152,
                  maxValueCm: 152,
                },

                shopperReference: {
                  minValueCm: 147.32,
                  maxValueCm: 147.32,
                },

                status:
                  "LONGER_THAN_PREFERENCE",
                reason:
                  "ABOVE_PREFERRED_RANGE",
              },
            },
          ],
        },
      });

    expect(result.state).toBe("ASSESSED");

    if (
      result.state !== "ASSESSED" ||
      result.structure !== "SIZE_ATTACHED"
    ) {
      throw new Error(
        "Expected size-attached length presentation"
      );
    }

    expect(result.sizes[0].status).toBe(
      "LONGER"
    );
  });

  it("preserves assessments for multiple size-attached lengths rather than selecting one", () => {
    const result =
      presentProductLength({
        structure: "SIZE_DEPENDENT",

        result: {
  status: "ASSESSED",
  structure: "SIZE_DEPENDENT",
  assessments: [
            {
              sizeId: "size-56",
              sizeLabel: "56",

              assessment: {
                measurementType:
                  FitMeasurementType.GARMENT_LENGTH,

                garmentRange: {
                  minValueCm: 142.24,
                  maxValueCm: 142.24,
                },

                shopperReference: {
                  minValueCm: 147.32,
                  maxValueCm: 147.32,
                },

                status:
                  "SHORTER_THAN_PREFERENCE",
                reason:
                  "BELOW_PREFERRED_RANGE",
              },
            },

            {
              sizeId: "size-58",
              sizeLabel: "58",

              assessment: {
                measurementType:
                  FitMeasurementType.GARMENT_LENGTH,

                garmentRange: {
                  minValueCm: 147.32,
                  maxValueCm: 147.32,
                },

                shopperReference: {
                  minValueCm: 147.32,
                  maxValueCm: 147.32,
                },

                status: "MATCH",
                reason:
                  "WITHIN_PREFERRED_RANGE",
              },
            },

            {
              sizeId: "size-60",
              sizeLabel: "60",

              assessment: {
                measurementType:
                  FitMeasurementType.GARMENT_LENGTH,

                garmentRange: {
                  minValueCm: 152.4,
                  maxValueCm: 152.4,
                },

                shopperReference: {
                  minValueCm: 147.32,
                  maxValueCm: 147.32,
                },

                status:
                  "LONGER_THAN_PREFERENCE",
                reason:
                  "ABOVE_PREFERRED_RANGE",
              },
            },
          ],
        },
      });

    expect(result.state).toBe("ASSESSED");

    if (
      result.state !== "ASSESSED" ||
      result.structure !== "SIZE_ATTACHED"
    ) {
      throw new Error(
        "Expected size-attached length presentation"
      );
    }

    expect(
      result.sizes.map((size) => ({
        label: size.label,
        status: size.status,
      }))
    ).toEqual([
      {
        label: "56",
        status: "SHORTER",
      },
      {
        label: "58",
        status: "MATCH",
      },
      {
        label: "60",
        status: "LONGER",
      },
    ]);
  });

  it("keeps conventional size labels separate from their attached garment lengths", () => {
  const result =
    presentProductLength({
      structure: "SIZE_DEPENDENT",

      result: {
  status: "ASSESSED",
  structure: "SIZE_DEPENDENT",
  assessments: [
          {
            sizeId: "size-s",
            sizeLabel: "S",

            assessment: {
              measurementType:
                FitMeasurementType.GARMENT_LENGTH,

              garmentRange: {
                minValueCm: 137.16,
                maxValueCm: 137.16,
              },

              shopperReference: {
                minValueCm: 147.32,
                maxValueCm: 147.32,
              },

              status:
                "SHORTER_THAN_PREFERENCE",
              reason:
                "BELOW_PREFERRED_RANGE",
            },
          },

          {
            sizeId: "size-m",
            sizeLabel: "M",

            assessment: {
              measurementType:
                FitMeasurementType.GARMENT_LENGTH,

              garmentRange: {
                minValueCm: 142.24,
                maxValueCm: 142.24,
              },

              shopperReference: {
                minValueCm: 147.32,
                maxValueCm: 147.32,
              },

              status:
                "SHORTER_THAN_PREFERENCE",
              reason:
                "BELOW_PREFERRED_RANGE",
            },
          },

          {
            sizeId: "size-l",
            sizeLabel: "L",

            assessment: {
              measurementType:
                FitMeasurementType.GARMENT_LENGTH,

              garmentRange: {
                minValueCm: 147.32,
                maxValueCm: 147.32,
              },

              shopperReference: {
                minValueCm: 147.32,
                maxValueCm: 147.32,
              },

              status: "MATCH",
              reason:
                "WITHIN_PREFERRED_RANGE",
            },
          },

          {
            sizeId: "size-xl",
            sizeLabel: "XL",

            assessment: {
              measurementType:
                FitMeasurementType.GARMENT_LENGTH,

              garmentRange: {
                minValueCm: 152.4,
                maxValueCm: 152.4,
              },

              shopperReference: {
                minValueCm: 147.32,
                maxValueCm: 147.32,
              },

              status:
                "LONGER_THAN_PREFERENCE",
              reason:
                "ABOVE_PREFERRED_RANGE",
            },
          },
        ],
      },
    });

  expect(result.state).toBe("ASSESSED");

  if (
    result.state !== "ASSESSED" ||
    result.structure !== "SIZE_ATTACHED"
  ) {
    throw new Error(
      "Expected size-attached length presentation."
    );
  }

  expect(
    result.sizes.map((size) => ({
      label: size.label,
      garmentLengthCm:
        size.garmentRangeCm.min,
      status: size.status,
    }))
  ).toEqual([
    {
      label: "S",
      garmentLengthCm: 137.16,
      status: "SHORTER",
    },
    {
      label: "M",
      garmentLengthCm: 142.24,
      status: "SHORTER",
    },
    {
      label: "L",
      garmentLengthCm: 147.32,
      status: "MATCH",
    },
    {
      label: "XL",
      garmentLengthCm: 152.4,
      status: "LONGER",
    },
  ]);
});

  it("presents independent normalized length options without pretending they are sizes", () => {
    const result =
      presentProductLength({
        structure: "INDEPENDENT",

        result: {
          status: "ASSESSED",
          structure: "INDEPENDENT",

          assessments: [
            {
              optionId: "length-54",
              optionLabel: '54"',
              valueCm: 137.16,

              assessment: {
                measurementType:
                  FitMeasurementType.GARMENT_LENGTH,

                garmentRange: {
                  minValueCm: 137.16,
                  maxValueCm: 137.16,
                },

                shopperReference: {
                  minValueCm: 147.32,
                  maxValueCm: 147.32,
                },

                status:
                  "SHORTER_THAN_PREFERENCE",
                reason:
                  "BELOW_PREFERRED_RANGE",
              },
            },
            {
              optionId: "length-56",
              optionLabel: '56"',
              valueCm: 142.24,

              assessment: {
                measurementType:
                  FitMeasurementType.GARMENT_LENGTH,

                garmentRange: {
                  minValueCm: 142.24,
                  maxValueCm: 142.24,
                },

                shopperReference: {
                  minValueCm: 147.32,
                  maxValueCm: 147.32,
                },

                status:
                  "SHORTER_THAN_PREFERENCE",
                reason:
                  "BELOW_PREFERRED_RANGE",
              },
            },
            {
              optionId: "length-58",
              optionLabel: '58"',
              valueCm: 147.32,

              assessment: {
                measurementType:
                  FitMeasurementType.GARMENT_LENGTH,

                garmentRange: {
                  minValueCm: 147.32,
                  maxValueCm: 147.32,
                },

                shopperReference: {
                  minValueCm: 147.32,
                  maxValueCm: 147.32,
                },

                status: "MATCH",
                reason:
                  "WITHIN_PREFERRED_RANGE",
              },
            },
          ],
        },
      });

    expect(result.state).toBe("ASSESSED");

    if (
      result.state !== "ASSESSED" ||
      result.structure !== "INDEPENDENT"
    ) {
      throw new Error(
        "Expected independent length presentation"
      );
    }

    expect(
      result.options.map((option) => ({
        label: option.label,
        valueCm: option.valueCm,
        status: option.status,
      }))
    ).toEqual([
      {
        label: '54"',
        valueCm: 137.16,
        status: "SHORTER",
      },
      {
        label: '56"',
        valueCm: 142.24,
        status: "SHORTER",
      },
      {
        label: '58"',
        valueCm: 147.32,
        status: "MATCH",
      },
    ]);
  });

  it("asks for shopper preference only when the shopper reference is missing", () => {
    expect(
      presentProductLength({
        structure: "SIZE_DEPENDENT",

        result: {
  status: "INSUFFICIENT_EVIDENCE",
  structure: "SIZE_DEPENDENT",
  assessments: [],
  reason: "MISSING_SHOPPER_PREFERENCE",
},
      })
    ).toEqual({
      state: "PREFERENCE_REQUIRED",
    });
  });

  it("reports unavailable product evidence separately from missing shopper preference", () => {
    expect(
      presentProductLength({
        structure: "SIZE_DEPENDENT",

        result: {
  status: "INSUFFICIENT_EVIDENCE",
  structure: "SIZE_DEPENDENT",
  assessments: [],
  reason: "MISSING_GARMENT_LENGTH",
},
      })
    ).toEqual({
      state:
        "PRODUCT_EVIDENCE_UNAVAILABLE",
    });
  });

  it("preserves products for which maxi-length assessment does not apply", () => {
    expect(
      presentProductLength({
        structure: "SIZE_DEPENDENT",

        result: {
          status: "NOT_APPLICABLE",
          assessments: [],
        },
      })
    ).toEqual({
      state: "NOT_APPLICABLE",
    });
  });

  it("fails closed if an assessed size-attached result contains no presentable assessments", () => {
    expect(
      presentProductLength({
        structure: "SIZE_DEPENDENT",

        result: {
  status: "ASSESSED",
  structure: "SIZE_DEPENDENT",
  assessments: [],
        },
      })
    ).toEqual({
      state: "UNAVAILABLE",
    });
  });

  it("fails closed if an assessed size-attached item unexpectedly has no shopper reference", () => {
    expect(
      presentProductLength({
        structure: "SIZE_DEPENDENT",

        result: {
  status: "ASSESSED",
  structure: "SIZE_DEPENDENT",
  assessments: [
            {
              sizeId: "size-m",
              sizeLabel: "M",

              assessment: {
                measurementType:
                  FitMeasurementType.GARMENT_LENGTH,

                garmentRange: {
                  minValueCm: 147.32,
                  maxValueCm: 147.32,
                },

                shopperReference: null,

                status:
                  "INSUFFICIENT_EVIDENCE",
                reason:
                  "MISSING_SHOPPER_REFERENCE",
              },
            },
          ],
        },
      })
    ).toEqual({
      state: "UNAVAILABLE",
    });
  });

  it("preserves length-based purchasable sizes as LENGTH_BASED_SIZE rather than collapsing them into SIZE_ATTACHED", () => {
  const result =
    presentProductLength({
      structure: "LENGTH_BASED_SIZE",

      result: {
        status: "ASSESSED",
        structure: "LENGTH_BASED_SIZE",

        assessments: [
          {
            sizeId: "size-54",
            sizeLabel: "54",

            assessment: {
              measurementType:
                FitMeasurementType.GARMENT_LENGTH,

              garmentRange: {
                minValueCm: 137.16,
                maxValueCm: 137.16,
              },

              shopperReference: {
                minValueCm: 147.32,
                maxValueCm: 147.32,
              },

              status:
                "SHORTER_THAN_PREFERENCE",
              reason:
                "BELOW_PREFERRED_RANGE",
            },
          },

          {
            sizeId: "size-56",
            sizeLabel: "56",

            assessment: {
              measurementType:
                FitMeasurementType.GARMENT_LENGTH,

              garmentRange: {
                minValueCm: 142.24,
                maxValueCm: 142.24,
              },

              shopperReference: {
                minValueCm: 147.32,
                maxValueCm: 147.32,
              },

              status:
                "SHORTER_THAN_PREFERENCE",
              reason:
                "BELOW_PREFERRED_RANGE",
            },
          },

          {
            sizeId: "size-58",
            sizeLabel: "58",

            assessment: {
              measurementType:
                FitMeasurementType.GARMENT_LENGTH,

              garmentRange: {
                minValueCm: 147.32,
                maxValueCm: 147.32,
              },

              shopperReference: {
                minValueCm: 147.32,
                maxValueCm: 147.32,
              },

              status: "MATCH",
              reason:
                "WITHIN_PREFERRED_RANGE",
            },
          },

          {
            sizeId: "size-60",
            sizeLabel: "60",

            assessment: {
              measurementType:
                FitMeasurementType.GARMENT_LENGTH,

              garmentRange: {
                minValueCm: 152.4,
                maxValueCm: 152.4,
              },

              shopperReference: {
                minValueCm: 147.32,
                maxValueCm: 147.32,
              },

              status:
                "LONGER_THAN_PREFERENCE",
              reason:
                "ABOVE_PREFERRED_RANGE",
            },
          },
        ],
      },
    });

  expect(result.state).toBe("ASSESSED");

  if (
    result.state !== "ASSESSED" ||
    result.structure !==
      "LENGTH_BASED_SIZE"
  ) {
    throw new Error(
      "Expected length-based size presentation"
    );
  }

  expect(
    result.sizes.map((size) => ({
      id: size.id,
      label: size.label,
      status: size.status,
      garmentLengthCm:
        size.garmentRangeCm.min,
    }))
  ).toEqual([
    {
      id: "size-54",
      label: "54",
      status: "SHORTER",
      garmentLengthCm: 137.16,
    },
    {
      id: "size-56",
      label: "56",
      status: "SHORTER",
      garmentLengthCm: 142.24,
    },
    {
      id: "size-58",
      label: "58",
      status: "MATCH",
      garmentLengthCm: 147.32,
    },
    {
      id: "size-60",
      label: "60",
      status: "LONGER",
      garmentLengthCm: 152.4,
    },
  ]);
});

 it("fails closed if an assessed independent result contains no presentable assessments", () => {
  expect(
    presentProductLength({
      structure: "INDEPENDENT",

      result: {
        status: "ASSESSED",
        structure: "INDEPENDENT",
        assessments: [],
      },
    })
  ).toEqual({
    state: "UNAVAILABLE",
  });
});
it("preserves a complete length-based assessment with no exact match without inventing one", () => {
  const result = presentProductLength({
    structure: "LENGTH_BASED_SIZE",

    result: {
      status: "ASSESSED",
      structure: "LENGTH_BASED_SIZE",

      assessments: [
        {
          sizeId: "size-54",
          sizeLabel: "54",

          assessment: {
            measurementType:
              FitMeasurementType.GARMENT_LENGTH,

            garmentRange: {
              minValueCm: 137.16,
              maxValueCm: 137.16,
            },

            shopperReference: {
              minValueCm: 147.32,
              maxValueCm: 147.32,
            },

            status: "SHORTER_THAN_PREFERENCE",
            reason: "BELOW_PREFERRED_RANGE",
          },
        },

        {
          sizeId: "size-56",
          sizeLabel: "56",

          assessment: {
            measurementType:
              FitMeasurementType.GARMENT_LENGTH,

            garmentRange: {
              minValueCm: 142.24,
              maxValueCm: 142.24,
            },

            shopperReference: {
              minValueCm: 147.32,
              maxValueCm: 147.32,
            },

            status: "SHORTER_THAN_PREFERENCE",
            reason: "BELOW_PREFERRED_RANGE",
          },
        },

        {
          sizeId: "size-60",
          sizeLabel: "60",

          assessment: {
            measurementType:
              FitMeasurementType.GARMENT_LENGTH,

            garmentRange: {
              minValueCm: 152.4,
              maxValueCm: 152.4,
            },

            shopperReference: {
              minValueCm: 147.32,
              maxValueCm: 147.32,
            },

            status: "LONGER_THAN_PREFERENCE",
            reason: "ABOVE_PREFERRED_RANGE",
          },
        },
      ],
    },
  });

  expect(result.state).toBe("ASSESSED");

  if (
    result.state !== "ASSESSED" ||
    result.structure !== "LENGTH_BASED_SIZE"
  ) {
    throw new Error(
      "Expected length-based size presentation."
    );
  }

  expect(
    result.sizes.map((size) => ({
      label: size.label,
      status: size.status,
    }))
  ).toEqual([
    {
      label: "54",
      status: "SHORTER",
    },
    {
      label: "56",
      status: "SHORTER",
    },
    {
      label: "60",
      status: "LONGER",
    },
  ]);

  expect(
    result.sizes.filter(
      (size) => size.status === "MATCH"
    )
  ).toHaveLength(0);
});

});