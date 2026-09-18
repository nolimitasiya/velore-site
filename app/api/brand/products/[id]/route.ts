import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";



export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { brandId } = await requireBrandContext();
    const { id } = await ctx.params;

    const product = await prisma.product.findFirst({
      where: { id, brandId },
      select: {
        id: true,
        title: true,
        slug: true,
        sourceUrl: true,
        affiliateUrl: true,
        currency: true,
        price: true,
        stock: true,
        note: true,
        productType: true,
        status: true,
        isActive: true,
        publishedAt: true,
        badges: true,
        submittedAt: true,
        reviewNote: true,
        lastApprovedAt: true,
        polyesterFree: true, 
        lengths: true,
        images: { orderBy: { sortOrder: "asc" }, select: { url: true, sortOrder: true } },
        productTags : { select: { tag: { select: { id: true, slug: true, name: true } } } },
        productMaterials: { select: { material: { select: { id: true, slug: true, name: true } } } },
        productOccasions: { select: { occasion: { select: { id: true, slug: true, name: true } } } },
        productColours: { select: { colour: { select: { id: true, slug: true, name: true } } } },
        productSizes: { select: { size: { select: { id: true, slug: true, name: true } } } },
        productStyles: { select: { style: { select: { id: true, slug: true, name: true } } } },
        category: { select: { id: true, slug: true, name: true } },
productTypes: {
  select: {
    productType: true,
  },
},
  }});

    if (!product) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    return NextResponse.json({ ok: true, product });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to load product" },
      { status: e?.message === "UNAUTHENTICATED" ? 401 : e?.message === "FORBIDDEN" ? 403 : 500 }
    );
  }
}
