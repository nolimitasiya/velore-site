import {
  FabricStretch,
  FitMeasurementType,
  ProductIntendedFit,
  ProductType,
  ShopperFitPreference,
} from "@prisma/client";

export const EASE_POLICY_MEASUREMENTS = [
  FitMeasurementType.BUST,
  FitMeasurementType.WAIST,
  FitMeasurementType.HIP,
] as const;

export type EasePolicyMeasurement =
  (typeof EASE_POLICY_MEASUREMENTS)[number];

export type EasePolicyKey = {
  productType: ProductType;
  measurementType: EasePolicyMeasurement;
  intendedFit: ProductIntendedFit;
  stretch: Exclude<
    FabricStretch,
    typeof FabricStretch.UNKNOWN
  >;

  shopperFitPreference: ShopperFitPreference;
};

export function isEasePolicyMeasurement(
  type: FitMeasurementType
): type is EasePolicyMeasurement {
  return EASE_POLICY_MEASUREMENTS.includes(
    type as EasePolicyMeasurement
  );
}

export type EaseRange = {
  /*
   * garment measurement - shopper body measurement
   *
   * Example:
   * body bust    = 90 cm
   * garment bust = 98 cm
   * ease         = 8 cm
   */
  minEaseCm: number;
  maxEaseCm: number;
};

export type EasePolicySource =
  | "BRAND_GUIDANCE"
  | "DERIVED_FROM_BRAND_DATA"
  | "GARMENT_TECHNICAL_STANDARD"
  | "VEILORA_CALIBRATION";

export type EasePolicyProvenance = {
  source: EasePolicySource;

  /*
   * Human-readable explanation of why this policy exists.
   *
   * This should describe the evidence or calibration
   * behind the range rather than merely restating it.
   */
  rationale: string;

  /*
   * Optional external evidence location.
   *
   * Brand guidance or technical references can be linked
   * here when applicable.
   */
  sourceUrl?: string;

  /*
   * Allows policies to evolve without losing track of
   * which calibration produced a recommendation.
   */
  version: number;

  /*
   * ISO date on which the policy was last reviewed.
   */
  reviewedAt: string;
};

export type EasePolicy = EasePolicyKey & {
  acceptableEase: EaseRange;
  provenance: EasePolicyProvenance;
};

export type EasePolicyLookupResult =
  | {
      status: "FOUND";
      policy: EasePolicy;
    }
  | {
      status: "NOT_FOUND";
    };

/*
 * Central registry for evidence-backed Veilora ease policies.
 *
 * Important:
 * Do not populate this with guessed universal fashion
 * allowances.
 *
 * Policies should be introduced deliberately and remain
 * auditable here rather than being scattered throughout
 * recommendation logic.
 */
export const EASE_POLICIES: readonly EasePolicy[] = [];

export function findEasePolicy(
  key: EasePolicyKey,
  policies: readonly EasePolicy[] =
    EASE_POLICIES
): EasePolicyLookupResult {
  const policy = policies.find(
    (candidate) =>
      candidate.productType ===
        key.productType &&
      candidate.measurementType ===
        key.measurementType &&
      candidate.intendedFit ===
        key.intendedFit &&
      candidate.stretch === key.stretch &&
      candidate.shopperFitPreference ===
        key.shopperFitPreference
  );

  if (!policy) {
    return {
      status: "NOT_FOUND",
    };
  }

  return {
    status: "FOUND",
    policy,
  };
}