import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { brandId } = await requireBrandContext();

  const products = await prisma.product.findMany({
    where: { brandId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
  id: true,
  title: true,
  price: true,
  currency: true,
  isActive: true,
  sourceUrl: true,
  affiliateUrl: true,
  createdAt: true,
  status: true,
  publishedAt: true,
  submittedAt: true,
  reviewNote: true,
  images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { url: true },
      },
    },
  });

  return NextResponse.json({
  ok: true,
  brandId, // 👈 add this line
  products: products.map((p) => ({
    id: p.id,
    title: p.title,
    price: p.price,
    currency: p.currency,
    isActive: p.isActive,
    createdAt: p.createdAt,
    sourceUrl: p.sourceUrl,
    affiliateUrl: p.affiliateUrl,
    imageUrl: p.images?.[0]?.url ?? null,
    status: p.status,
    publishedAt: p.publishedAt,
    submittedAt: p.submittedAt,
    reviewNote: p.reviewNote,
  })),
});

}
