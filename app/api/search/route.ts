import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);

  const q = (url.searchParams.get("q") ?? "").trim();
  const category = (url.searchParams.get("category") ?? "").trim();
  const occasion = (url.searchParams.get("occasion") ?? "").trim();
  const type = (url.searchParams.get("type") ?? "").trim();

  const where: any = {
    isActive: true,
  };

  // text search (basic + good enough for V1)
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { brand: { name: { contains: q, mode: "insensitive" } } },
      { tags: { has: q.toLowerCase() } }, // if you store tags as string[]
    ];
  }

  if (category) where.categorySlug = category;
  if (occasion) where.occasionSlugs = { has: occasion }; // if array
  if (type) where.typeSlug = type;

  const products = await prisma.product.findMany({
    where,
    take: 60,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      images: true,
      price: true,
      currency: true,
      brand: { select: { id: true, name: true, slug: true } },
    },
  });

  return NextResponse.json({ ok: true, q, filters: { category, occasion, type }, products });
}
