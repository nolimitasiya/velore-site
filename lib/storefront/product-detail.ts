import "server-only";

import { prisma } from "@/lib/prisma";
import {
  AffiliateStatus,
  BrandAccountStatus,
  ProductType,
} from "@prisma/client";

import { unstable_cache } from "next/cache";

async function fetchStorefrontProductDetail(
  brandSlug: string,
  productSlug: string
) {
  return prisma.product.findFirst({
    where: {
      slug: productSlug,

      brand: {
        slug: brandSlug,
      },

      isActive: true,

      publishedAt: {
        not: null,
      },

      status: "APPROVED",
    },

    include: {
      brand: {
        select: {
          id: true,
          name: true,
          slug: true,
          websiteUrl: true,
          instagramHandle: true,
          baseCity: true,
          baseCountryCode: true,
          baseRegion: true,
          accountStatus: true,
          affiliateStatus: true,

          shippingDomestic: true,
          shippingInternational: true,
          returnWindowDays: true,
          returnsPaidBy: true,
          shippingCountryCodes: true,
        },
      },

      
     

      images: {
        orderBy: {
          sortOrder: "asc",
        },
      },

      productColours: {
        include: {
          colour: true,
        },
      },

      productSizes: {
        include: {
          size: true,
        },
      },

      productMaterials: {
        include: {
          material: true,
        },
      },

      shippingCountries: true,

      
    },
  });
  
}

export async function getStorefrontProductDetail(
  brandSlug: string,
  productSlug: string
) {
  return unstable_cache(
    () =>
      fetchStorefrontProductDetail(
        brandSlug,
        productSlug
      ),
    [
      "storefront-product-detail",
      brandSlug,
      productSlug,
    ],
    {
      tags: [
        `product:${brandSlug}:${productSlug}`,
        `brand:${brandSlug}`,
        "storefront-products",
      ],
    }
  )();
}

export async function fetchCompleteTheLook(
  productId: string
) {
  const [forward, reverse] = await Promise.all([
    prisma.productCompleteTheLook.findMany({
      where: {
        productId,
      },

      orderBy: {
        position: "asc",
      },

      select: {
        linkedProduct: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            currency: true,
            badges: true,
            isActive: true,
            publishedAt: true,
            status: true,

            brand: {
              select: {
                id: true,
                name: true,
                slug: true,
                accountStatus: true,
                affiliateStatus: true,
              },
            },

            images: {
              orderBy: {
                sortOrder: "asc",
              },

              take: 1,

              select: {
                url: true,
              },
            },
          },
        },
      },
    }),

    prisma.productCompleteTheLook.findMany({
      where: {
        linkedProductId: productId,
      },

      orderBy: {
        position: "asc",
      },

      select: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            currency: true,
            badges: true,
            isActive: true,
            publishedAt: true,
            status: true,

            brand: {
              select: {
                id: true,
                name: true,
                slug: true,
                accountStatus: true,
                affiliateStatus: true,
              },
            },

            images: {
              orderBy: {
                sortOrder: "asc",
              },

              take: 1,

              select: {
                url: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return [
    ...forward.map(
      (item) => item.linkedProduct
    ),

    ...reverse.map(
      (item) => item.product
    ),
  ]
    .filter(
      (product, index, array) =>
        array.findIndex(
          (item) =>
            item.id === product.id
        ) === index
    )
    .filter(
      (product) =>
        product.isActive &&
        product.publishedAt !== null &&
        product.status === "APPROVED" &&
        product.brand.accountStatus ===
          BrandAccountStatus.ACTIVE &&
        product.brand.affiliateStatus ===
          AffiliateStatus.ACTIVE
    );
}

export async function getCompleteTheLook(
  productId: string
) {
  return unstable_cache(
    () =>
      fetchCompleteTheLook(productId),
    [
      "product-complete-the-look",
      productId,
    ],
    {
      tags: [
        `product:${productId}`,
        "storefront-products",
      ],
    }
  )();
}

export async function fetchProductDiaryPosts(
  productId: string
) {
  const links =
  await prisma.diaryPostProduct.findMany({
    where: {
      productId,

      diaryPost: {
        status: "PUBLISHED",
      },
    },

    orderBy: {
      sortOrder: "asc",
    },

    take: 2,

      select: {
        diaryPost: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverImageUrl: true,
            status: true,
          },
        },
      },
    });

  return links.map(
    (link) => link.diaryPost
  );
}

export async function getProductDiaryPosts(
  productId: string
) {
  return unstable_cache(
    () =>
      fetchProductDiaryPosts(productId),
    [
      "product-diary-posts",
      productId,
    ],
    {
      tags: [
        `product:${productId}`,
        "storefront-products",
      ],
    }
  )();
}
async function fetchRelatedProducts({
  productId,
  brandId,
  categoryId,
  productType,
}: {
  productId: string;
  brandId: string;
  categoryId: string | null;
  productType: ProductType | null;
}) {
  return prisma.product.findMany({
    where: {
      id: {
        not: productId,
      },

      isActive: true,

      publishedAt: {
        not: null,
      },

      status: "APPROVED",

      brand: {
        accountStatus: BrandAccountStatus.ACTIVE,
        affiliateStatus: AffiliateStatus.ACTIVE,
      },

      OR: [
        {
          brandId,
        },

        categoryId
          ? {
              categoryId,
            }
          : {},

        productType
          ? {
              productType,
            }
          : {},
      ].filter(
        (item) =>
          Object.keys(item).length > 0
      ),
    },

    orderBy: {
      publishedAt: "desc",
    },

    take: 4,

    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      currency: true,
      badges: true,

      brand: {
        select: {
          name: true,
          slug: true,
        },
      },

      images: {
        orderBy: {
          sortOrder: "asc",
        },
        take: 1,
        select: {
          url: true,
        },
      },
    },
  });
}


export async function getRelatedProducts(args: {
  productId: string;
  brandId: string;
  categoryId: string | null;
  productType: ProductType | null;
}) {
  return unstable_cache(
    () => fetchRelatedProducts(args),
    [
      "product-related",
      args.productId,
      args.brandId,
      args.categoryId ?? "none",
      args.productType ?? "none",
    ],
    {
      tags: [
        `product:${args.productId}`,
        "storefront-products",
      ],
      // Tag invalidation (above) is the primary freshness mechanism and
      // fires immediately on every product/brand mutation that affects
      // eligibility. This revalidate is a bounded safety backstop only,
      // in case a future mutation path is ever added without wiring the
      // corresponding revalidateTag call.
      revalidate: 300,
    }
  )();
}