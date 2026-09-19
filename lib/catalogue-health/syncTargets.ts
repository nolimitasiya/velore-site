import {
  CatalogueHealthIssueStatus,
  CatalogueHealthStatus,
  CatalogueHealthTargetType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

type DesiredTarget = {
  targetKey: string;
  targetType: CatalogueHealthTargetType;
  productId: string;
  productImageId: string | null;
  url: string;
};

/**
 * Synchronises the catalogue into CatalogueHealthTarget.
 *
 * Product / ProductImage remain the catalogue source of truth.
 *
 * Health targets are never deleted by this sync:
 * - new catalogue resources create targets
 * - changed URLs reset their existing target
 * - retired resources retain their operational history
 * - returning resources reactivate their historical target
 *
 * The common paths are deliberately bulk-based so catalogue growth
 * does not result in one database round trip per target.
 */
export async function syncCatalogueHealthTargets() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      sourceUrl: true,
      affiliateUrl: true,
      images: {
        select: {
          id: true,
          url: true,
        },
      },
    },
  });

  const desiredTargets = new Map<string, DesiredTarget>();

  for (const product of products) {
    const sourceUrl = product.sourceUrl.trim();

    if (sourceUrl) {
      const targetKey = `PRODUCT_SOURCE_URL:${product.id}`;

      desiredTargets.set(targetKey, {
        targetKey,
        targetType:
          CatalogueHealthTargetType.PRODUCT_SOURCE_URL,
        productId: product.id,
        productImageId: null,
        url: sourceUrl,
      });
    }

    const affiliateUrl = product.affiliateUrl?.trim();

    if (affiliateUrl) {
      const targetKey =
        `PRODUCT_AFFILIATE_URL:${product.id}`;

      desiredTargets.set(targetKey, {
        targetKey,
        targetType:
          CatalogueHealthTargetType.PRODUCT_AFFILIATE_URL,
        productId: product.id,
        productImageId: null,
        url: affiliateUrl,
      });
    }

    for (const image of product.images) {
      const imageUrl = image.url.trim();

      if (!imageUrl) continue;

      const targetKey = `PRODUCT_IMAGE:${image.id}`;

      desiredTargets.set(targetKey, {
        targetKey,
        targetType:
          CatalogueHealthTargetType.PRODUCT_IMAGE,
        productId: product.id,
        productImageId: image.id,
        url: imageUrl,
      });
    }
  }

  /*
   * Load active AND historical targets once.
   *
   * This replaces the old per-target findUnique() calls and lets us
   * classify everything in memory.
   */
  const existingTargets =
    await prisma.catalogueHealthTarget.findMany({
      select: {
        id: true,
        targetKey: true,
        url: true,
        isActive: true,
      },
    });

  const existingByKey = new Map(
    existingTargets.map((target) => [
      target.targetKey,
      target,
    ])
  );

  const newTargets: DesiredTarget[] = [];

  const changedTargets: Array<{
    id: string;
    desired: DesiredTarget;
  }> = [];

  const reactivatedTargets: Array<{
    id: string;
    desired: DesiredTarget;
  }> = [];

  let unchanged = 0;

  for (const [targetKey, desired] of desiredTargets) {
    const existing = existingByKey.get(targetKey);

    if (!existing) {
      newTargets.push(desired);
      continue;
    }

    /*
     * Anything found here still exists in the catalogue, so remove it
     * from the map. What remains afterward represents retired targets.
     */
    existingByKey.delete(targetKey);

    if (!existing.isActive) {
      reactivatedTargets.push({
        id: existing.id,
        desired,
      });

      continue;
    }

    if (existing.url !== desired.url) {
      changedTargets.push({
        id: existing.id,
        desired,
      });

      continue;
    }

    unchanged++;
  }

  /*
   * Insert genuinely new targets in bulk.
   *
   * skipDuplicates protects us if two sync invocations overlap between
   * reading existing targets and reaching this insert. targetKey's
   * unique constraint remains the final database-level protection.
   */
  let created = 0;

  if (newTargets.length > 0) {
    const now = new Date();

    const result =
      await prisma.catalogueHealthTarget.createMany({
        data: newTargets.map((target) => ({
          targetKey: target.targetKey,
          targetType: target.targetType,
          productId: target.productId,
          productImageId: target.productImageId,
          url: target.url,

          isActive: true,
          retiredAt: null,

          status: CatalogueHealthStatus.UNKNOWN,
          nextCheckAt: now,
        })),
        skipDuplicates: true,
      });

    created = result.count;
  }

  /*
   * URL changes are intentionally reset individually because each
   * target has its own URL and associations, and any active incident
   * for that exact target must be resolved atomically with the reset.
   *
   * This should be a comparatively rare path.
   */
  for (const target of changedTargets) {
    await resetTargetForChangedUrl({
      id: target.id,
      url: target.desired.url,
      productId: target.desired.productId,
      productImageId:
        target.desired.productImageId,
    });
  }

  /*
   * Historical targets are reactivated rather than recreated.
   * This preserves their previous checks and incident history.
   */
  for (const target of reactivatedTargets) {
    await resetTargetForChangedUrl({
      id: target.id,
      url: target.desired.url,
      productId: target.desired.productId,
      productImageId:
        target.desired.productImageId,
    });
  }

  /*
   * Anything left in existingByKey no longer exists in the current
   * catalogue. Only active targets need to be retired.
   */
  const targetsToRetire = Array.from(
    existingByKey.values()
  ).filter((target) => target.isActive);

  let retired = 0;

  if (targetsToRetire.length > 0) {
    const retiredAt = new Date();
    const targetIds = targetsToRetire.map(
      (target) => target.id
    );

    await prisma.$transaction(async (tx) => {
      await tx.catalogueHealthIssue.updateMany({
        where: {
          targetId: {
            in: targetIds,
          },
          status: {
            in: [
              CatalogueHealthIssueStatus.OPEN,
              CatalogueHealthIssueStatus.ACKNOWLEDGED,
            ],
          },
        },
        data: {
          status:
            CatalogueHealthIssueStatus.RESOLVED,
          resolvedAt: retiredAt,
        },
      });

      const result =
        await tx.catalogueHealthTarget.updateMany({
          where: {
            id: {
              in: targetIds,
            },
            isActive: true,
          },
          data: {
            isActive: false,
            retiredAt,
            nextCheckAt: null,
          },
        });

      retired = result.count;
    });
  }

  return {
    products: products.length,
    desiredTargets: desiredTargets.size,

    created,
    updated: changedTargets.length,
    reactivated: reactivatedTargets.length,
    retired,
    unchanged,
  };
}

async function resetTargetForChangedUrl(args: {
  id: string;
  url: string;
  productId: string;
  productImageId: string | null;
}) {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.catalogueHealthIssue.updateMany({
      where: {
        targetId: args.id,
        status: {
          in: [
            CatalogueHealthIssueStatus.OPEN,
            CatalogueHealthIssueStatus.ACKNOWLEDGED,
          ],
        },
      },
      data: {
        status:
          CatalogueHealthIssueStatus.RESOLVED,
        resolvedAt: now,
      },
    });

    await tx.catalogueHealthTarget.update({
      where: {
        id: args.id,
      },
      data: {
        productId: args.productId,
        productImageId: args.productImageId,

        url: args.url,

        isActive: true,
        retiredAt: null,

        status: CatalogueHealthStatus.UNKNOWN,
        failureType: null,

        httpStatus: null,
        finalUrl: null,
        contentType: null,
        responseTimeMs: null,

        consecutiveFailures: 0,
        consecutiveSuccesses: 0,

        firstCheckedAt: null,
        lastCheckedAt: null,
        lastHealthyAt: null,
        lastFailedAt: null,

        nextCheckAt: now,
      },
    });
  });
}

export async function syncCatalogueHealthTarget(
  targetId: string
) {
  const target =
    await prisma.catalogueHealthTarget.findUnique({
      where: {
        id: targetId,
      },
      select: {
        id: true,
        targetKey: true,
        targetType: true,
        productId: true,
        productImageId: true,
        url: true,
        isActive: true,
      },
    });

  if (!target) {
    return {
      outcome: "TARGET_NOT_FOUND" as const,
    };
  }

  let currentUrl: string | null = null;

  if (
    target.targetType ===
    CatalogueHealthTargetType.PRODUCT_SOURCE_URL
  ) {
    if (!target.productId) {
      return {
        outcome: "SOURCE_REMOVED" as const,
      };
    }

    const product = await prisma.product.findUnique({
      where: {
        id: target.productId,
      },
      select: {
        sourceUrl: true,
      },
    });

    currentUrl = product?.sourceUrl?.trim() || null;
  } else if (
    target.targetType ===
    CatalogueHealthTargetType.PRODUCT_AFFILIATE_URL
  ) {
    if (!target.productId) {
      return {
        outcome: "SOURCE_REMOVED" as const,
      };
    }

    const product = await prisma.product.findUnique({
      where: {
        id: target.productId,
      },
      select: {
        affiliateUrl: true,
      },
    });

    currentUrl =
      product?.affiliateUrl?.trim() || null;
  } else if (
    target.targetType ===
    CatalogueHealthTargetType.PRODUCT_IMAGE
  ) {
    if (!target.productImageId) {
      return {
        outcome: "SOURCE_REMOVED" as const,
      };
    }

    const image =
      await prisma.productImage.findUnique({
        where: {
          id: target.productImageId,
        },
        select: {
          productId: true,
          url: true,
        },
      });

    if (!image) {
      return {
        outcome: "SOURCE_REMOVED" as const,
      };
    }

   currentUrl = image.url.trim() || null;

if (!currentUrl) {
  return {
    outcome: "SOURCE_REMOVED" as const,
  };
}

if (
  target.productId !== image.productId ||
  target.url !== currentUrl ||
  !target.isActive
) {
  await resetTargetForChangedUrl({
    id: target.id,
    url: currentUrl,
    productId: image.productId,
    productImageId: target.productImageId,
  });

  return {
    outcome: "UPDATED" as const,
  };
}

    return {
      outcome: "UNCHANGED" as const,
    };
  }

  if (!currentUrl) {
    return {
      outcome: "SOURCE_REMOVED" as const,
    };
  }

  if (
    target.url !== currentUrl ||
    !target.isActive
  ) {
    await resetTargetForChangedUrl({
      id: target.id,
      url: currentUrl,
      productId: target.productId!,
      productImageId: null,
    });

    return {
      outcome: "UPDATED" as const,
    };
  }

  return {
    outcome: "UNCHANGED" as const,
  };
}