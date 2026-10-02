import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";

import {
  getAuthenticatedShopper,
} from "@/lib/auth/ShopperSession";

export async function GET(
  req: NextRequest
) {
  const shopper =
    await getAuthenticatedShopper(req);

  if (!shopper) {
    return NextResponse.json({
      items: [],
    });
  }

  const wishlistItems =
    await prisma.wishlistItem.findMany({
      where: {
        shopperId:
          shopper.id,
      },

      orderBy: {
        createdAt: "desc",
      },

      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            currency: true,

            brand: {
              select: {
                name: true,
                slug: true,
                websiteUrl: true,
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
    });

  const items =
    wishlistItems.map(
      (wishlistItem) => ({
        productId:
          wishlistItem.productId,

        title:
          wishlistItem.product.title,

        brandName:
          wishlistItem.product.brand.name,

        brandSlug:
          wishlistItem.product.brand.slug,

        brandWebsiteUrl:
          wishlistItem.product.brand
            .websiteUrl ?? null,

        productSlug:
          wishlistItem.product.slug,

        imageUrl:
          wishlistItem.product.images[0]
            ?.url ?? null,

        price:
          wishlistItem.product.price
            ?.toString() ?? null,

        currency:
          wishlistItem.product.currency,
      })
    );

  return NextResponse.json({
    items,
  });
}