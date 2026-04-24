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
    const parent = (url.searchParams.get("parent") || "").trim().toLowerCase();

    if (!parent) {
      const items = await prisma.category.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true, parentId: true },
      });

      return NextResponse.json({ ok: true, items });
    }

    const parentCategory = await prisma.category.findUnique({
      where: { slug: parent },
      select: { id: true },
    });

    if (!parentCategory) {
      return NextResponse.json({ ok: true, items: [] });
    }

    const items = await prisma.category.findMany({
      where: { parentId: parentCategory.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to load categories" },
      { status: e?.message === "UNAUTHENTICATED" ? 401 : 500 }
    );
  }
}