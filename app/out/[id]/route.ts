import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = params.id;

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      brandId: true,
      affiliateUrl: true,
    },
  });

  if (!product?.affiliateUrl) {
    return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL));
  }

  // ✅ track click
  await prisma.affiliateClick.create({
    data: { brandId: product.brandId, productId: product.id },
  });

  return NextResponse.redirect(product.affiliateUrl);
}
