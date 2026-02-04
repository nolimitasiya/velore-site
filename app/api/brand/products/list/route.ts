// app/api/brand/products/list/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandSession } from "@/lib/auth/BrandSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { brandId } = await requireBrandSession();

  const products = await prisma.product.findMany({
    where: { brandId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      title: true,
      price: true,
      currency: true,
      isActive: true,
      sourceUrl: true,
      affiliateUrl: true,
      createdAt: true,

      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: {
          url: true,
        },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    products: products.map((p) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      currency: p.currency,
      isActive: p.isActive,
      createdAt: p.createdAt,
      sourceUrl: p.sourceUrl,
      affiliateUrl: p.affiliateUrl,
      imageUrl: p.images[0]?.url ?? null,
    })),
  });
}
