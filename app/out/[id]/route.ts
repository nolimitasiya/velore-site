import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // ... your existing logic here (lookup product, record click, redirect)
  // Example skeleton:
  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, affiliateUrl: true, brandId: true },
  });

  if (!product?.affiliateUrl) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  await prisma.affiliateClick.create({
    data: { brandId: product.brandId, productId: product.id },
  });

  return NextResponse.redirect(product.affiliateUrl);
}
