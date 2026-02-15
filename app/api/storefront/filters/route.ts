// C:\Users\Asiya\projects\dalra\app\api\storefront\filters\route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Region } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const brands = await prisma.brand.findMany({
    where: {
      products: {
        some: { status: "APPROVED", isActive: true, publishedAt: { not: null } },
      },
    },
    select: { baseCountryCode: true, baseRegion: true },
  });

  const countries = Array.from(
    new Set(brands.map((b) => b.baseCountryCode).filter(Boolean) as string[])
  ).sort();

  const regions = Array.from(
    new Set(brands.map((b) => b.baseRegion).filter(Boolean) as Region[])
  ).sort();

  return NextResponse.json({ ok: true, countries, regions });
}
