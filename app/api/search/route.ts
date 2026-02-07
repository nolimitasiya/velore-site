// app/api/search/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProductType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);

  const q = (url.searchParams.get("q") ?? "").trim();
  const category = (url.searchParams.get("category") ?? "").trim();
  const occasion = (url.searchParams.get("occasion") ?? "").trim();
  const material = (url.searchParams.get("material") ?? "").trim();

  const typeRaw = (url.searchParams.get("type") ?? "").trim();

  const productType =
    typeRaw &&
    (Object.values(ProductType) as string[]).includes(typeRaw.toUpperCase())
      ? (typeRaw.toUpperCase() as ProductType)
      : undefined;

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      publishedAt: { not: null }, // ✅ hide unpublished in search too

      ...(q && {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { brand: { name: { contains: q, mode: "insensitive" } } },
          { tags: { has: q.toLowerCase() } },
        ],
      }),

      ...(category && { category: { slug: category } }),
      ...(occasion && { occasion: { slug: occasion } }),
      ...(material && { material: { slug: material } }),
      ...(productType && { productType }),
    },

    orderBy: { createdAt: "desc" },
    take: 60,

    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      currency: true,
      affiliateUrl: true,
      brand: { select: { name: true, slug: true } },
      images: {
        take: 1,
        orderBy: { sortOrder: "asc" },
        select: { url: true },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    q,
    filters: { category, occasion, material, type: typeRaw },
    products,
  });
}
