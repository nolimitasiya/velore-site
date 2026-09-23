import {
  AffiliateStatus,
  BrandAccountStatus,
  ProductStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type PlatformHealthProductProbeTarget = {
  productId: string;
  brandSlug: string;
  productSlug: string;
  pdpPath: string;
  outboundPath: string;
};

/*
 * Resolve a real, currently eligible storefront
 * product for synthetic Platform Health probes.
 *
 * Nothing is hardcoded to a particular brand or
 * product. If the catalogue changes, the monitor
 * automatically follows the live catalogue.
 */
export async function resolvePlatformHealthProductProbeTarget():
  Promise<PlatformHealthProductProbeTarget | null> {
  const product =
    await prisma.product.findFirst({
      where: {
        isActive: true,

        publishedAt: {
          not: null,
        },

        status:
          ProductStatus.APPROVED,

        /*
         * The outbound resolver requires a
         * source URL even when an affiliate URL
         * is already present.
         */
        sourceUrl: {
          not: "",
        },

        brand: {
          accountStatus:
            BrandAccountStatus.ACTIVE,

          affiliateStatus:
            AffiliateStatus.ACTIVE,
        },
      },

      /*
       * Deterministic preference:
       *
       * use the newest eligible published
       * product rather than an arbitrary row.
       */
      orderBy: [
        {
          publishedAt: "desc",
        },
        {
          id: "asc",
        },
      ],

      select: {
        id: true,
        slug: true,

        brand: {
          select: {
            slug: true,
          },
        },
      },
    });

  if (!product) {
    return null;
  }

  return {
    productId: product.id,
    brandSlug: product.brand.slug,
    productSlug: product.slug,

    pdpPath:
      `/b/${product.brand.slug}/p/${product.slug}`,

    outboundPath:
      `/api/out/${product.id}` +
      `?src=PRODUCT&pos=1&ctx=PLATFORM_HEALTH`,
  };
}