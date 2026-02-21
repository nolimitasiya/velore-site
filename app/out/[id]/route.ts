import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      brandId: true,
      affiliateUrl: true,
      brand: {
        select: {
          affiliateStatus: true,
          affiliateBaseUrl: true,
        },
      },
    },
  });

  // Not found → home
  if (!product) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Brand must be ACTIVE
  if (product.brand?.affiliateStatus !== "ACTIVE") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Affiliate hierarchy: product override → brand base
  const destinationUrl =
    product.affiliateUrl?.trim() ||
    product.brand?.affiliateBaseUrl?.trim() ||
    null;

  // No affiliate link → do not redirect out
  if (!destinationUrl) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Track click (optionally store destinationUrl if you add it)
  await prisma.affiliateClick.create({
    data: {
      brandId: product.brandId,
      productId: product.id,
      destinationUrl,

    },
  });

  return NextResponse.redirect(destinationUrl);
}
