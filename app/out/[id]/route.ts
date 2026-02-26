// C:\Users\Asiya\projects\dalra\app\out\[id]\route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildTrackedProductUrl } from "@/lib/affiliate/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      brandId: true,
      sourceUrl: true, // ✅ needed
      affiliateUrl: true, // optional (per-product override if you ever use it)
      brand: {
        select: {
          affiliateStatus: true,
          affiliateBaseUrl: true,
        },
      },
    },
  });

  // Not found → home
  if (!product) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // If brand is not ACTIVE, you can either block or still allow plain sourceUrl.
  // Your current logic blocks, so we keep it consistent:
  if (product.brand?.affiliateStatus !== "ACTIVE") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const sourceUrl = String(product.sourceUrl || "").trim();
  if (!sourceUrl) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // ✅ Destination logic:
  // - If product.affiliateUrl exists, it is already a fully tracked URL → use it as-is
  // - Otherwise build tracked URL from sourceUrl + brand affiliateBaseUrl params
  const destinationUrl =
    (product.affiliateUrl?.trim() || "") ||
    buildTrackedProductUrl({
      sourceUrl,
      affiliateBaseUrl: product.brand?.affiliateBaseUrl ?? null,
    });

  if (!destinationUrl) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Track click
  await prisma.affiliateClick.create({
    data: {
      brandId: product.brandId,
      productId: product.id,
      destinationUrl,
    },
  });

  return NextResponse.redirect(destinationUrl);
}
