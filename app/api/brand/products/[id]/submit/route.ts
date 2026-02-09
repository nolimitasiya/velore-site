import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";
import { AdminNotificationType, ProductStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { brandId } = await requireBrandContext();
    const { id } = await ctx.params;

    const product = await prisma.product.findFirst({
      where: { id, brandId },
      select: {
        id: true,
        status: true,
        brandId: true,
        title: true,
        sourceUrl: true,
        affiliateUrl: true,
        productType: true,
        price: true,
        currency: true,
        worldwideShipping: true,
        images: { select: { id: true } },
        shippingCountries: { select: { countryCode: true } },
      },
    });

    if (!product) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    if (product.status === ProductStatus.PENDING_REVIEW) {
      return NextResponse.json(
        { ok: false, error: "Already pending review." },
        { status: 400 }
      );
    }

    // ✅ Quality gate (ready-for-review validations)
    const problems: string[] = [];

    if (!product.affiliateUrl) problems.push("Add an affiliate link (Buy Now link).");
    if (!product.productType) problems.push("Select a product type (e.g., ABAYA, DRESS…).");
    if (!product.sourceUrl) problems.push("Add the source URL (product page).");

    // I recommend requiring price before review:
   if (product.price == null) problems.push("Set a price.");
   if (!product.title?.trim()) problems.push("Add a product title.");
   if (!product.currency) problems.push("Select a currency.");

    // Must have at least 1 image
    if (!product.images?.length) problems.push("Add at least 1 image.");

    // Shipping rule: either worldwide OR at least one country selected
    const hasCountries = (product.shippingCountries?.length ?? 0) > 0;
    if (!product.worldwideShipping && !hasCountries) {
      problems.push("Set shipping (Worldwide or select at least 1 shipping country).");
    }

    if (problems.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "This product isn’t ready for review yet.",
          fields: problems, // frontend can render nicely
        },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id: product.id },
        data: {
          status: ProductStatus.PENDING_REVIEW,
          submittedAt: new Date(),
          // optional: clear note on resubmission
          reviewNote: null,
        },
        select: { id: true, status: true, submittedAt: true },
      });

      await tx.adminNotification.create({
        data: {
          type: AdminNotificationType.PRODUCT_SUBMITTED,
          brandId: product.brandId,
          productId: product.id,
        },
      });

      return p;
    });

    return NextResponse.json({ ok: true, product: updated });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to submit product" },
      {
        status:
          e?.message === "UNAUTHENTICATED"
            ? 401
            : e?.message === "FORBIDDEN"
            ? 403
            : 500,
      }
    );
  }
}
