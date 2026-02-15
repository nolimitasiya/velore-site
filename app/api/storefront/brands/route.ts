import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const region = searchParams.get("region")?.toUpperCase() || null;      // e.g. "EUROPE"
  const country = searchParams.get("country")?.toUpperCase() || null;    // e.g. "GB"
  const take = Math.min(Number(searchParams.get("take") ?? 200) || 200, 500);

  const where: any = {};
  if (region) where.baseRegion = region;
  if (country) where.baseCountryCode = country;

  const brands = await prisma.brand.findMany({
    where,
    orderBy: { name: "asc" },
    take,
    select: {
      id: true,
      name: true,
      slug: true,
      baseCity: true,
      baseCountryCode: true,
      baseRegion: true,
      _count: { select: { products: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    brands: brands.map((b) => ({
      ...b,
      productCount: b._count.products,
    })),
  });
}
