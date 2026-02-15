// C:\Users\Asiya\projects\dalra\app\api\storefront\products\route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Region } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toRegion(x: string | null): Region | null {
  const v = String(x ?? "").trim().toUpperCase();
  return (Object.values(Region) as string[]).includes(v) ? (v as Region) : null;
}

function toIso2(x: string | null): string | null {
  const v = String(x ?? "").trim().toUpperCase();
  return v.length === 2 ? v : null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const take = Math.min(Number(searchParams.get("take") ?? 12) || 12, 48);

  const region = toRegion(searchParams.get("region"));
  const country = toIso2(searchParams.get("country"));

  const products = await prisma.product.findMany({
    where: {
      status: "APPROVED",
      isActive: true,
      publishedAt: { not: null },

      // ✅ filter by brand region/country
      ...(region || country
        ? {
            brand: {
              ...(region ? { baseRegion: region } : {}),
              ...(country ? { baseCountryCode: country } : {}),
            },
          }
        : {}),
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
      brand: {
        select: {
          name: true,
          slug: true,
          baseRegion: true,
          baseCountryCode: true,
          baseCity: true,
        },
      },
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

      price: p.price ? p.price.toString() : null,
      currency: p.currency,

      brandName: p.brand?.name ?? "",
      brandSlug: p.brand?.slug ?? "",
      brandRegion: p.brand?.baseRegion ?? null,
      brandCountryCode: p.brand?.baseCountryCode ?? null,
      brandCity: p.brand?.baseCity ?? null,

      affiliateUrl: p.affiliateUrl,
      sourceUrl: p.sourceUrl,
      imageUrl: p.images?.[0]?.url ?? null,
    })),
  });
}
