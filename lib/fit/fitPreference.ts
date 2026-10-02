import {
  ShopperFitPreference,
} from "@prisma/client";

import type {
  DesignedFitRelationship,
} from "@/lib/fit/designedFitInterpretation";

export type FitPreferenceRank = {
  rank: number;
  relationship: DesignedFitRelationship;
  preference: ShopperFitPreference;
};

const REGULAR_ORDER: readonly DesignedFitRelationship[] = [
  "PRESERVES_DESIGNED_FIT",
  "PARTIALLY_CLOSER_THAN_DESIGNED",
  "PARTIALLY_LOOSER_THAN_DESIGNED",
  "CLOSER_THAN_DESIGNED",
  "LOOSER_THAN_DESIGNED",
  "AMBIGUOUS_AROUND_DESIGNED_FIT",
];

const CLOSER_ORDER: readonly DesignedFitRelationship[] = [
  "PARTIALLY_CLOSER_THAN_DESIGNED",
  "PRESERVES_DESIGNED_FIT",
  "CLOSER_THAN_DESIGNED",
  "PARTIALLY_LOOSER_THAN_DESIGNED",
  "LOOSER_THAN_DESIGNED",
  "AMBIGUOUS_AROUND_DESIGNED_FIT",
];

const RELAXED_ORDER: readonly DesignedFitRelationship[] = [
  "PARTIALLY_LOOSER_THAN_DESIGNED",
  "PRESERVES_DESIGNED_FIT",
  "LOOSER_THAN_DESIGNED",
  "PARTIALLY_CLOSER_THAN_DESIGNED",
  "CLOSER_THAN_DESIGNED",
  "AMBIGUOUS_AROUND_DESIGNED_FIT",
];

function preferenceOrder(
  preference: ShopperFitPreference
): readonly DesignedFitRelationship[] {
  switch (preference) {
    case "CLOSER":
      return CLOSER_ORDER;

    case "REGULAR":
      return REGULAR_ORDER;

    case "RELAXED":
      return RELAXED_ORDER;
  }
}

export function rankDesignedFitForPreference(
  relationship: DesignedFitRelationship,
  preference: ShopperFitPreference
): FitPreferenceRank {
  const order = preferenceOrder(preference);

  const index = order.indexOf(relationship);

  return {
    rank:
      index === -1
        ? Number.MAX_SAFE_INTEGER
        : index,
    relationship,
    preference,
  };
}