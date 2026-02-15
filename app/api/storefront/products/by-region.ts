import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const region = searchParams.get("region")?.toUpperCase(); // Region enum
  const take = Math.min(Number(searchParams.get("take") ?? 12) || 12, 48);

  if (!region) {
    return NextResponse.json({ ok: false, error: "Missing region" }, { status: 400 });
  }

  const products = await prisma.product.findMany({
    where: {
      status: "APPROVED",
      isActive: true,
      publishedAt: { not: null },
      brand: { baseRegion: region as any },
    },
    orderBy: { publishedAt: "desc" },
    take,
    select: {
      id: true,
      title: true,
      price: true,
      currency: true,
      affiliateUrl: true,
      sourceUrl: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    products: products.map((p) => ({
      id: p.id,
      title: p.title,
      imageUrl: p.images?.[0]?.url ?? null,
      price: p.price ? p.price.toString() : null,
      currency: p.currency,
      buyUrl: (p.affiliateUrl || p.sourceUrl || null) as string | null,
    })),
  });
}
