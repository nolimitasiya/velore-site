import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireAdminSession();

    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const active = searchParams.get("active"); // "true" | "false" | null
    const brand = searchParams.get("brand");   // brand slug | null

    const where: any = {};

    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { brand: { name: { contains: q, mode: "insensitive" } } },
        { brand: { slug: { contains: q, mode: "insensitive" } } },
      ];
    }

    if (active === "true") where.isActive = true;
    if (active === "false") where.isActive = false;

    if (brand && brand !== "all") {
      where.brand = { slug: brand };
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true,
        title: true,
        slug: true,
        price: true,
        currency: true,
        isActive: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        brand: { select: { name: true, slug: true } },
      },
    });

    const brands = await prisma.brand.findMany({
      orderBy: { name: "asc" },
      select: { name: true, slug: true },
    });

    return NextResponse.json({ ok: true, products, brands });
  } catch (e: any) {
  const status = e?.message === "UNAUTHENTICATED" ? 401 : 500;
  return NextResponse.json(
    { ok: false, error: e?.message ?? "Failed to load products" },
    { status }
  );
}

}
