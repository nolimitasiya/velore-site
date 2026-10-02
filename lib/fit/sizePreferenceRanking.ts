import {
  ShopperFitPreference,
} from "@prisma/client";

import type {
  FitGarmentComponent,
  FitMeasurementType,
} from "@prisma/client";

import type {
  ActualEaseRange,
} from "@/lib/fit/actualEase";

export type SizePreferenceDimension = {
  type: FitMeasurementType;
  component: FitGarmentComponent;
  actualEase: ActualEaseRange;
};

export type SizePreferenceCandidate = {
  sizeId: string;
  sizeLabel: string;

  dimensions:
    readonly SizePreferenceDimension[];
};

export type SizePreferenceRankingInput = {
  preference: ShopperFitPreference;

  candidates:
    readonly SizePreferenceCandidate[];
};

export type RankedSizePreferenceCandidate = {
  candidate: SizePreferenceCandidate;
};

export type SizePreferenceRankingResult =
  | {
      status: "PREFERRED";
      preferred:
        RankedSizePreferenceCandidate;
      ranked:
        readonly RankedSizePreferenceCandidate[];
    }
  | {
      status: "NO_DOMINANT_CANDIDATE";
      preferred: null;
      ranked:
        readonly RankedSizePreferenceCandidate[];
    }
  | {
      status: "INSUFFICIENT_EVIDENCE";
      preferred: null;
      ranked:
        readonly RankedSizePreferenceCandidate[];
    };

function dimensionKey(
  dimension: SizePreferenceDimension
): string {
  return `${dimension.type}:${dimension.component}`;
}

function isValidEaseRange(
  range: ActualEaseRange
): boolean {
  return (
    Number.isFinite(range.minEaseCm) &&
    Number.isFinite(range.maxEaseCm) &&
    range.maxEaseCm >= range.minEaseCm
  );
}

function buildDimensionMap(
  candidate: SizePreferenceCandidate
): Map<string, SizePreferenceDimension> | null {
  if (candidate.dimensions.length === 0) {
    return null;
  }

  const map =
    new Map<string, SizePreferenceDimension>();

  for (const dimension of candidate.dimensions) {
    if (!isValidEaseRange(dimension.actualEase)) {
      return null;
    }

    const key = dimensionKey(dimension);

    /*
     * Duplicate semantic dimensions would make the
     * comparison ambiguous. Refuse to guess which one
     * should be authoritative.
     */
    if (map.has(key)) {
      return null;
    }

    map.set(key, dimension);
  }

  return map;
}

function haveSameDimensions(
  left: Map<string, SizePreferenceDimension>,
  right: Map<string, SizePreferenceDimension>
): boolean {
  if (left.size !== right.size) {
    return false;
  }

  for (const key of left.keys()) {
    if (!right.has(key)) {
      return false;
    }
  }

  return true;
}

type DimensionPreference =
  | "BETTER"
  | "EQUAL"
  | "WORSE"
  | "INCOMPARABLE";

function compareDimension(
  candidate: ActualEaseRange,
  other: ActualEaseRange,
  preference: ShopperFitPreference
): DimensionPreference {
  /*
   * REGULAR needs an evidence-backed target for what
   * "regular" means across sizes.
   *
   * We deliberately refuse to invent a midpoint or
   * universal target ease.
   */
  if (preference === ShopperFitPreference.REGULAR) {
    return "INCOMPARABLE";
  }

  /*
   * For CLOSER, a range is clearly better only when
   * the entire candidate range is no looser than the
   * other range, with at least one strict difference.
   *
   * This supports both separated and nested ranges
   * without reducing either range to a midpoint.
   */
  if (preference === ShopperFitPreference.CLOSER) {
    const noLooser =
      candidate.minEaseCm <= other.minEaseCm &&
      candidate.maxEaseCm <= other.maxEaseCm;

    const strictlyCloser =
      candidate.minEaseCm < other.minEaseCm ||
      candidate.maxEaseCm < other.maxEaseCm;

    if (noLooser && strictlyCloser) {
      return "BETTER";
    }

    const noCloser =
      candidate.minEaseCm >= other.minEaseCm &&
      candidate.maxEaseCm >= other.maxEaseCm;

    const strictlyLooser =
      candidate.minEaseCm > other.minEaseCm ||
      candidate.maxEaseCm > other.maxEaseCm;

    if (noCloser && strictlyLooser) {
      return "WORSE";
    }
  }

  /*
   * RELAXED is the mirror image: consistently more
   * actual ease is preferred.
   */
  if (preference === ShopperFitPreference.RELAXED) {
    const noTighter =
      candidate.minEaseCm >= other.minEaseCm &&
      candidate.maxEaseCm >= other.maxEaseCm;

    const strictlyMoreRelaxed =
      candidate.minEaseCm > other.minEaseCm ||
      candidate.maxEaseCm > other.maxEaseCm;

    if (noTighter && strictlyMoreRelaxed) {
      return "BETTER";
    }

    const noLooser =
      candidate.minEaseCm <= other.minEaseCm &&
      candidate.maxEaseCm <= other.maxEaseCm;

    const strictlyCloser =
      candidate.minEaseCm < other.minEaseCm ||
      candidate.maxEaseCm < other.maxEaseCm;

    if (noLooser && strictlyCloser) {
      return "WORSE";
    }
  }

  if (
    candidate.minEaseCm === other.minEaseCm &&
    candidate.maxEaseCm === other.maxEaseCm
  ) {
    return "EQUAL";
  }

  /*
   * Crossing ranges represent a real trade-off.
   * We preserve that ambiguity instead of collapsing
   * the ranges to averages or midpoints.
   */
  return "INCOMPARABLE";
}

function dominates(
  candidate: Map<string, SizePreferenceDimension>,
  other: Map<string, SizePreferenceDimension>,
  preference: ShopperFitPreference
): boolean {
  let betterOnAtLeastOne = false;

  for (const [key, candidateDimension] of candidate) {
    const otherDimension = other.get(key);

    if (!otherDimension) {
      return false;
    }

    const comparison = compareDimension(
      candidateDimension.actualEase,
      otherDimension.actualEase,
      preference
    );

    /*
     * Pareto dominance requires the candidate to be
     * no worse on every required dimension.
     *
     * An incomparable dimension therefore prevents
     * dominance.
     */
    if (
      comparison === "WORSE" ||
      comparison === "INCOMPARABLE"
    ) {
      return false;
    }

    if (comparison === "BETTER") {
      betterOnAtLeastOne = true;
    }
  }

  return betterOnAtLeastOne;
}

export function rankSizePreferenceCandidates(
  input: SizePreferenceRankingInput
): SizePreferenceRankingResult {
  const { preference, candidates } = input;

  if (candidates.length < 2) {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      preferred: null,
      ranked: [],
    };
  }

  const candidateMaps = candidates.map(
    (candidate) => ({
      candidate,
      dimensions: buildDimensionMap(candidate),
    })
  );

  if (
    candidateMaps.some(
      (entry) => entry.dimensions === null
    )
  ) {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      preferred: null,
      ranked: [],
    };
  }

  const firstDimensions =
    candidateMaps[0]?.dimensions;

  if (!firstDimensions) {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      preferred: null,
      ranked: [],
    };
  }

  for (const entry of candidateMaps) {
    if (
      !entry.dimensions ||
      !haveSameDimensions(
        firstDimensions,
        entry.dimensions
      )
    ) {
      return {
        status: "INSUFFICIENT_EVIDENCE",
        preferred: null,
        ranked: [],
      };
    }
  }

  const completeCandidateMaps =
    candidateMaps as {
      candidate: SizePreferenceCandidate;
      dimensions: Map<
        string,
        SizePreferenceDimension
      >;
    }[];

  /*
   * We currently have no evidence-backed cross-size
   * target for REGULAR.
   *
   * The candidates are valid, but preference cannot
   * distinguish them responsibly.
   */
  if (
    preference === ShopperFitPreference.REGULAR
  ) {
    return {
      status: "NO_DOMINANT_CANDIDATE",
      preferred: null,
      ranked: completeCandidateMaps.map(
        ({ candidate }) => ({ candidate })
      ),
    };
  }

  const dominantCandidates =
    completeCandidateMaps.filter((candidate) =>
      completeCandidateMaps
        .filter(
          (other) =>
            other.candidate.sizeId !==
            candidate.candidate.sizeId
        )
        .every((other) =>
          dominates(
            candidate.dimensions,
            other.dimensions,
            preference
          )
        )
    );

  const ranked =
    completeCandidateMaps.map(
      ({ candidate }) => ({ candidate })
    );

  if (dominantCandidates.length !== 1) {
    return {
      status: "NO_DOMINANT_CANDIDATE",
      preferred: null,
      ranked,
    };
  }

  return {
    status: "PREFERRED",
    preferred: {
      candidate:
        dominantCandidates[0].candidate,
    },
    ranked,
  };
}