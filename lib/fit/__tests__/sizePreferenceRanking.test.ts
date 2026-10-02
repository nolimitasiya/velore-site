import { describe, expect, it } from "vitest";

import {
  FitGarmentComponent,
  FitMeasurementType,
  ShopperFitPreference,
} from "@prisma/client";

import {
  rankSizePreferenceCandidates,
  type SizePreferenceCandidate,
  type SizePreferenceDimension,
} from "@/lib/fit/sizePreferenceRanking";

function dimension(
  type: FitMeasurementType,
  minEaseCm: number,
  maxEaseCm: number,
  component: FitGarmentComponent =
    FitGarmentComponent.WHOLE_GARMENT
): SizePreferenceDimension {
  return {
    type,
    component,
    actualEase: {
      minEaseCm,
      maxEaseCm,
    },
  };
}

function candidate(
  sizeId: string,
  sizeLabel: string,
  args: {
    bust: [number, number];
    waist: [number, number];
    hip: [number, number];
  }
): SizePreferenceCandidate {
  return {
    sizeId,
    sizeLabel,

    dimensions: [
      dimension(
        FitMeasurementType.BUST,
        args.bust[0],
        args.bust[1]
      ),
      dimension(
        FitMeasurementType.WAIST,
        args.waist[0],
        args.waist[1]
      ),
      dimension(
        FitMeasurementType.HIP,
        args.hip[0],
        args.hip[1]
      ),
    ],
  };
}

describe("size preference ranking", () => {
  it("prefers consistently smaller actual-ease ranges for CLOSER", () => {
    const result =
      rankSizePreferenceCandidates({
        preference:
          ShopperFitPreference.CLOSER,

        candidates: [
          candidate("m", "M", {
            bust: [6, 10],
            waist: [6, 10],
            hip: [6, 10],
          }),

          candidate("m-l", "M/L", {
            bust: [8, 12],
            waist: [8, 12],
            hip: [8, 12],
          }),
        ],
      });

    expect(result.status).toBe("PREFERRED");

    if (result.status !== "PREFERRED") {
      throw new Error(
        "Expected a preferred size"
      );
    }

    expect(
      result.preferred.candidate.sizeId
    ).toBe("m");
  });

  it("prefers consistently larger actual-ease ranges for RELAXED", () => {
    const result =
      rankSizePreferenceCandidates({
        preference:
          ShopperFitPreference.RELAXED,

        candidates: [
          candidate("m", "M", {
            bust: [6, 10],
            waist: [6, 10],
            hip: [6, 10],
          }),

          candidate("m-l", "M/L", {
            bust: [8, 12],
            waist: [8, 12],
            hip: [8, 12],
          }),
        ],
      });

    expect(result.status).toBe("PREFERRED");

    if (result.status !== "PREFERRED") {
      throw new Error(
        "Expected a preferred size"
      );
    }

    expect(
      result.preferred.candidate.sizeId
    ).toBe("m-l");
  });

  it("does not invent a cross-size target for REGULAR", () => {
    const result =
      rankSizePreferenceCandidates({
        preference:
          ShopperFitPreference.REGULAR,

        candidates: [
          candidate("m", "M", {
            bust: [6, 10],
            waist: [6, 10],
            hip: [6, 10],
          }),

          candidate("l", "L", {
            bust: [8, 12],
            waist: [8, 12],
            hip: [8, 12],
          }),
        ],
      });

    expect(result.status).toBe(
      "NO_DOMINANT_CANDIDATE"
    );

    expect(result.preferred).toBeNull();
  });

  it("preserves ambiguity when candidates trade off across measurements", () => {
    const result =
      rankSizePreferenceCandidates({
        preference:
          ShopperFitPreference.CLOSER,

        candidates: [
          candidate("m", "M", {
            bust: [6, 10],
            waist: [9, 13],
            hip: [6, 10],
          }),

          candidate("l", "L", {
            bust: [8, 12],
            waist: [7, 11],
            hip: [8, 12],
          }),
        ],
      });

    expect(result.status).toBe(
      "NO_DOMINANT_CANDIDATE"
    );

    expect(result.preferred).toBeNull();
  });

  it("preserves ambiguity when ease ranges cross within a required dimension", () => {
    const result =
      rankSizePreferenceCandidates({
        preference:
          ShopperFitPreference.CLOSER,

        candidates: [
          candidate("m", "M", {
            bust: [6, 12],
            waist: [6, 10],
            hip: [6, 10],
          }),

          candidate("l", "L", {
            bust: [8, 10],
            waist: [8, 12],
            hip: [8, 12],
          }),
        ],
      });

    expect(result.status).toBe(
      "NO_DOMINANT_CANDIDATE"
    );

    expect(result.preferred).toBeNull();
  });

  it("allows equal dimensions while requiring a strict advantage somewhere for dominance", () => {
    const result =
      rankSizePreferenceCandidates({
        preference:
          ShopperFitPreference.CLOSER,

        candidates: [
          candidate("m", "M", {
            bust: [6, 10],
            waist: [6, 10],
            hip: [6, 10],
          }),

          candidate("l", "L", {
            bust: [6, 10],
            waist: [8, 12],
            hip: [6, 10],
          }),
        ],
      });

    expect(result.status).toBe("PREFERRED");

    if (result.status !== "PREFERRED") {
      throw new Error(
        "Expected a preferred size"
      );
    }

    expect(
      result.preferred.candidate.sizeId
    ).toBe("m");
  });

  it("preserves ambiguity when all actual-ease ranges are identical", () => {
    const result =
      rankSizePreferenceCandidates({
        preference:
          ShopperFitPreference.CLOSER,

        candidates: [
          candidate("m", "M", {
            bust: [6, 10],
            waist: [6, 10],
            hip: [6, 10],
          }),

          candidate("l", "L", {
            bust: [6, 10],
            waist: [6, 10],
            hip: [6, 10],
          }),
        ],
      });

    expect(result.status).toBe(
      "NO_DOMINANT_CANDIDATE"
    );

    expect(result.preferred).toBeNull();
  });

  it("supports negative actual ease without special-case ranking logic", () => {
    const result =
      rankSizePreferenceCandidates({
        preference:
          ShopperFitPreference.CLOSER,

        candidates: [
          candidate("s", "S", {
            bust: [-4, 0],
            waist: [-3, 1],
            hip: [-4, 0],
          }),

          candidate("m", "M", {
            bust: [-2, 2],
            waist: [-1, 3],
            hip: [-2, 2],
          }),
        ],
      });

    expect(result.status).toBe("PREFERRED");

    if (result.status !== "PREFERRED") {
      throw new Error(
        "Expected a preferred size"
      );
    }

    expect(
      result.preferred.candidate.sizeId
    ).toBe("s");
  });

  it("requires candidates to expose the same semantic dimensions", () => {
    const complete = candidate("m", "M", {
      bust: [6, 10],
      waist: [6, 10],
      hip: [6, 10],
    });

    const incomplete: SizePreferenceCandidate = {
      sizeId: "l",
      sizeLabel: "L",

      dimensions: [
        dimension(
          FitMeasurementType.BUST,
          8,
          12
        ),
        dimension(
          FitMeasurementType.WAIST,
          8,
          12
        ),
      ],
    };

    const result =
      rankSizePreferenceCandidates({
        preference:
          ShopperFitPreference.CLOSER,

        candidates: [
          complete,
          incomplete,
        ],
      });

    expect(result.status).toBe(
      "INSUFFICIENT_EVIDENCE"
    );

    expect(result.preferred).toBeNull();
  });

  it("matches dimensions by measurement type and component rather than array position", () => {
    const first = candidate("m", "M", {
      bust: [6, 10],
      waist: [6, 10],
      hip: [6, 10],
    });

    const second: SizePreferenceCandidate = {
      sizeId: "l",
      sizeLabel: "L",

      /*
       * Deliberately use a different order.
       */
      dimensions: [
        dimension(
          FitMeasurementType.HIP,
          8,
          12
        ),
        dimension(
          FitMeasurementType.BUST,
          8,
          12
        ),
        dimension(
          FitMeasurementType.WAIST,
          8,
          12
        ),
      ],
    };

    const result =
      rankSizePreferenceCandidates({
        preference:
          ShopperFitPreference.CLOSER,

        candidates: [first, second],
      });

    expect(result.status).toBe("PREFERRED");

    if (result.status !== "PREFERRED") {
      throw new Error(
        "Expected a preferred size"
      );
    }

    expect(
      result.preferred.candidate.sizeId
    ).toBe("m");
  });

  it("treats different garment components as different semantic dimensions", () => {
    const wholeGarment =
      candidate("m", "M", {
        bust: [6, 10],
        waist: [6, 10],
        hip: [6, 10],
      });

    const differentComponent:
      SizePreferenceCandidate = {
      sizeId: "l",
      sizeLabel: "L",

      dimensions: [
        dimension(
          FitMeasurementType.BUST,
          8,
          12,
          FitGarmentComponent.TOP
        ),
        dimension(
          FitMeasurementType.WAIST,
          8,
          12
        ),
        dimension(
          FitMeasurementType.HIP,
          8,
          12
        ),
      ],
    };

    const result =
      rankSizePreferenceCandidates({
        preference:
          ShopperFitPreference.CLOSER,

        candidates: [
          wholeGarment,
          differentComponent,
        ],
      });

    expect(result.status).toBe(
      "INSUFFICIENT_EVIDENCE"
    );
  });

  it("rejects duplicate semantic dimensions within a candidate", () => {
    const duplicate:
      SizePreferenceCandidate = {
      sizeId: "m",
      sizeLabel: "M",

      dimensions: [
        dimension(
          FitMeasurementType.BUST,
          6,
          10
        ),
        dimension(
          FitMeasurementType.BUST,
          7,
          11
        ),
        dimension(
          FitMeasurementType.WAIST,
          6,
          10
        ),
        dimension(
          FitMeasurementType.HIP,
          6,
          10
        ),
      ],
    };

    const result =
      rankSizePreferenceCandidates({
        preference:
          ShopperFitPreference.CLOSER,

        candidates: [
          duplicate,

          candidate("l", "L", {
            bust: [8, 12],
            waist: [8, 12],
            hip: [8, 12],
          }),
        ],
      });

    expect(result.status).toBe(
      "INSUFFICIENT_EVIDENCE"
    );
  });

  it("rejects invalid actual-ease ranges", () => {
    const invalid:
      SizePreferenceCandidate = {
      sizeId: "m",
      sizeLabel: "M",

      dimensions: [
        dimension(
          FitMeasurementType.BUST,
          10,
          6
        ),
        dimension(
          FitMeasurementType.WAIST,
          6,
          10
        ),
        dimension(
          FitMeasurementType.HIP,
          6,
          10
        ),
      ],
    };

    const result =
      rankSizePreferenceCandidates({
        preference:
          ShopperFitPreference.CLOSER,

        candidates: [
          invalid,

          candidate("l", "L", {
            bust: [8, 12],
            waist: [8, 12],
            hip: [8, 12],
          }),
        ],
      });

    expect(result.status).toBe(
      "INSUFFICIENT_EVIDENCE"
    );
  });

  it("does not make a multi-size preference decision for a single candidate", () => {
    const result =
      rankSizePreferenceCandidates({
        preference:
          ShopperFitPreference.CLOSER,

        candidates: [
          candidate("m", "M", {
            bust: [6, 10],
            waist: [6, 10],
            hip: [6, 10],
          }),
        ],
      });

    expect(result.status).toBe(
      "INSUFFICIENT_EVIDENCE"
    );
  });

  it("does not rank an empty candidate set", () => {
    const result =
      rankSizePreferenceCandidates({
        preference:
          ShopperFitPreference.CLOSER,
        candidates: [],
      });

    expect(result.status).toBe(
      "INSUFFICIENT_EVIDENCE"
    );
  });

  it("produces the same preference decision regardless of candidate input order", () => {
    const m = candidate("m", "M", {
      bust: [6, 10],
      waist: [6, 10],
      hip: [6, 10],
    });

    const l = candidate("l", "L", {
      bust: [8, 12],
      waist: [8, 12],
      hip: [8, 12],
    });

    const xl = candidate("xl", "XL", {
      bust: [10, 14],
      waist: [10, 14],
      hip: [10, 14],
    });

    const first =
      rankSizePreferenceCandidates({
        preference:
          ShopperFitPreference.CLOSER,
        candidates: [m, l, xl],
      });

    const second =
      rankSizePreferenceCandidates({
        preference:
          ShopperFitPreference.CLOSER,
        candidates: [xl, l, m],
      });

    expect(first.status).toBe("PREFERRED");
    expect(second.status).toBe("PREFERRED");

    if (
      first.status !== "PREFERRED" ||
      second.status !== "PREFERRED"
    ) {
      throw new Error(
        "Expected both orderings to produce a preferred size"
      );
    }

    expect(
      first.preferred.candidate.sizeId
    ).toBe("m");

    expect(
      second.preferred.candidate.sizeId
    ).toBe("m");
  });

  it("preserves ambiguity when no candidate dominates the entire field", () => {
    const result =
      rankSizePreferenceCandidates({
        preference:
          ShopperFitPreference.CLOSER,

        candidates: [
          candidate("s", "S", {
            bust: [5, 9],
            waist: [9, 13],
            hip: [9, 13],
          }),

          candidate("m", "M", {
            bust: [7, 11],
            waist: [5, 9],
            hip: [9, 13],
          }),

          candidate("l", "L", {
            bust: [9, 13],
            waist: [7, 11],
            hip: [5, 9],
          }),
        ],
      });

    expect(result.status).toBe(
      "NO_DOMINANT_CANDIDATE"
    );

    expect(result.preferred).toBeNull();
  });
});