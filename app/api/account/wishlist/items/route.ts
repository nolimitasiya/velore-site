import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
 
export async function GET(req: NextRequest) {
  const shopperId = req.cookies.get("shopper_authed")?.value;
  if (!shopperId) return NextResponse.json({ items: [] });
 
  const wishlistItems = await prisma.wishlistItem.findMany({
    where: { shopperId },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
          currency: true,
          brand: { select: { name: true, slug: true, websiteUrl: true } },
          images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        },
      },
    },
  });
 
  const items = wishlistItems.map((w) => ({
  productId: w.productId,
  title: w.product.title,
  brandName: w.product.brand.name,
  brandSlug: w.product.brand.slug,
  brandWebsiteUrl: w.product.brand.websiteUrl ?? null,  // ← add this
  productSlug: w.product.slug,
  imageUrl: w.product.images[0]?.url ?? null,
  price: w.product.price?.toString() ?? null,
  currency: w.product.currency,
}));
 
  return NextResponse.json({ items });
}