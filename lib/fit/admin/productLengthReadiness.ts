import type {
  ProductSizeRecommendationInput,
} from "@/lib/fit/recommendation";

import {
  resolveProductSizeGarmentLength,
} from "@/lib/fit/resolveProductSizeGarmentLength";

export type ProductLengthReadinessResult = {
  status: "READY" | "NOT_READY";

  catalogueSizeCount: number;
  evidencedSizeCount: number;

  hasCompleteEvidence: boolean;
};

export function assessProductLengthReadiness(
  sizes: ProductSizeRecommendationInput["sizes"]
): ProductLengthReadinessResult {
  const catalogueSizeCount = sizes.length;

  const evidencedSizeCount = sizes.filter(
    (size) =>
      resolveProductSizeGarmentLength(size) !==
      null
  ).length;

  const hasCompleteEvidence =
    catalogueSizeCount > 0 &&
    evidencedSizeCount === catalogueSizeCount;

  return {
    status: hasCompleteEvidence
      ? "READY"
      : "NOT_READY",

    catalogueSizeCount,
    evidencedSizeCount,
    hasCompleteEvidence,
  };
}