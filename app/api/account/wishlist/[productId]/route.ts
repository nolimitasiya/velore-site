import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";

import {
  getAuthenticatedShopper,
} from "@/lib/auth/ShopperSession";

export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      productId: string;
    }>;
  }
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
  } = await params;

  await prisma.wishlistItem.deleteMany({
    where: {
      shopperId:
        shopper.id,
      productId,
    },
  });

  return NextResponse.json({
    ok: true,
  });
}