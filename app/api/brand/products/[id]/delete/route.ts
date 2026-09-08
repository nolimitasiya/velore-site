import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";
import { invalidateStorefrontProduct } from "@/lib/storefront/invalidate-product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { brandId } = await requireBrandContext();
    const { id } = await params;

    const existing = await prisma.product.findFirst({
  where: {
    id,
    brandId,
  },

  select: {
    id: true,
    slug: true,

    brand: {
      select: {
        slug: true,
      },
    },
  },
});

if (!existing) {
  return NextResponse.json(
    { ok: false, error: "Not found" },
    { status: 404 }
  );
}

await prisma.product.deleteMany({
  where: {
    id,
    brandId,
  },
});

invalidateStorefrontProduct({
  productId: existing.id,
  productSlug: existing.slug,
  brandSlug: existing.brand.slug,
});

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.message === "UNAUTHENTICATED") {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}