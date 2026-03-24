import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdminSession();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const take = Math.min(Number(searchParams.get("take") ?? 8) || 8, 20);

    if (!q) {
      return NextResponse.json({ ok: true, brands: [] });
    }

    const brands = await prisma.brand.findMany({
      where: {
        affiliateStatus: "ACTIVE",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q.toLowerCase() } },
        ],
      },
      orderBy: [{ name: "asc" }],
      take,
      select: {
        id: true,
        name: true,
        slug: true,
        baseCountryCode: true,
      },
    });

    return NextResponse.json({
      ok: true,
      brands,
    });
  } catch (error) {
    console.error("GET /api/admin/brands/search failed:", error);

    return NextResponse.json(
      { ok: false, error: "Failed to search brands" },
      { status: 500 }
    );
  }
}