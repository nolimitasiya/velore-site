import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";

import {
  getAuthenticatedShopper,
} from "@/lib/auth/ShopperSession";

/*
 * GET — return all wishlist product IDs
 * for the authenticated shopper.
 */
export async function GET(
  req: NextRequest
) {
  const shopper =
    await getAuthenticatedShopper(req);

  if (!shopper) {
    return NextResponse.json(
      {
        items: [],
      },
      {
        status: 200,
      }
    );
  }

  const items =
    await prisma.wishlistItem.findMany({
      where: {
        shopperId:
          shopper.id,
      },

      select: {
        productId: true,
        createdAt: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  return NextResponse.json({
    items,
  });
}

/*
 * POST — add a product to the
 * authenticated shopper's wishlist.
 */
export async function POST(
  req: NextRequest
) {
  const shopper =
    await getAuthenticatedShopper(req);

  if (!shopper) {
    return NextResponse.json(
      {
        error: "Unauthorised",
      },
      {
        status: 401,
      }
    );
  }

  const {
    productId,
  } = await req.json();

  if (!productId) {
    return NextResponse.json(
      {
        error:
          "productId required",
      },
      {
        status: 400,
      }
    );
  }

  const item =
    await prisma.wishlistItem.upsert({
      where: {
        shopperId_productId: {
          shopperId:
            shopper.id,
          productId,
        },
      },

      create: {
        shopperId:
          shopper.id,
        productId,
      },

      update: {},
    });

  return NextResponse.json({
    ok: true,
    item,
  });
}