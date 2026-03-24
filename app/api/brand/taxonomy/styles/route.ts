import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireBrandContext();

    const url = new URL(req.url);
    const productType = (url.searchParams.get("productType") || "").trim();

    // If no productType passed -> return all styles
    if (!productType) {
      const items = await prisma.style.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      });

      return NextResponse.json({ ok: true, items });
    }

    // Load allowed styles for this productType
    const allowed = await prisma.styleAllowedProductType.findMany({
      where: { productType: productType as any },
      select: { styleId: true },
    });

    // Fallback: if nothing mapped yet -> show all styles
    if (!allowed.length) {
      const items = await prisma.style.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      });

      return NextResponse.json({ ok: true, items, fallbackAll: true });
    }

    const ids = allowed.map((x) => x.styleId);

    const items = await prisma.style.findMany({
      where: { id: { in: ids } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to load styles" },
      { status: e?.message === "UNAUTHENTICATED" ? 401 : 500 }
    );
  }
}