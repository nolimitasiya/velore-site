// app/api/storefront/products/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const take = Math.min(Number(searchParams.get("take") ?? 12) || 12, 48);

  const products = await prisma.product.findMany({
    where: {
      status: "APPROVED",
      isActive: true,
      publishedAt: { not: null },
    },
    orderBy: { publishedAt: "desc" },
    take,
    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      currency: true,
      affiliateUrl: true,
      sourceUrl: true,
      brand: { select: { name: true, slug: true } },
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { url: true },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    products: products.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      price: p.price,
      currency: p.currency,
      brandName: p.brand?.name ?? "",
      brandSlug: p.brand?.slug ?? "",
      affiliateUrl: p.affiliateUrl,
      sourceUrl: p.sourceUrl,
      imageUrl: p.images?.[0]?.url ?? null,
    })),
  });
}
