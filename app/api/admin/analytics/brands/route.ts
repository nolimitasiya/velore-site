import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        baseCountryCode: true,
        baseRegion: true,
        affiliateStatus: true,

        products: {
          select: {
            id: true,
            isActive: true,
            publishedAt: true,
            affiliateUrl: true,
            status: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const rows = brands
      .map((brand) => {
        const totalProducts = brand.products.length;

        const activeProducts = brand.products.filter(
          (product) => product.isActive
        ).length;

        const publishedProducts = brand.products.filter(
          (product) => Boolean(product.publishedAt)
        ).length;

        const liveProducts = brand.products.filter(
          (product) =>
            product.isActive &&
            Boolean(product.publishedAt)
        ).length;

        const notLiveProducts =
          activeProducts - liveProducts;

        const approvedProducts = brand.products.filter(
          (product) => product.status === "APPROVED"
        ).length;

        const affiliateReadyProducts =
          brand.products.filter(
            (product) =>
              product.isActive &&
              Boolean(product.publishedAt) &&
              Boolean(product.affiliateUrl?.trim())
          ).length;

        const missingAffiliateProducts =
          brand.products.filter(
            (product) =>
              product.isActive &&
              Boolean(product.publishedAt) &&
              !product.affiliateUrl?.trim()
          ).length;

        return {
          id: brand.id,
          name: brand.name,
          slug: brand.slug,

          countryCode:
            brand.baseCountryCode ?? null,

          region:
            brand.baseRegion ?? null,

          affiliateStatus:
            brand.affiliateStatus,

          totalProducts,
          activeProducts,
          publishedProducts,
          liveProducts,
          notLiveProducts,
          approvedProducts,
          affiliateReadyProducts,
          missingAffiliateProducts,
        };
      })
      .filter(
        (brand) =>
          brand.totalProducts > 0
      )
      .sort(
        (a, b) =>
          b.liveProducts -
          a.liveProducts
      );

    const summary = {
      brands: rows.length,

      liveProducts: rows.reduce(
        (sum, brand) =>
          sum + brand.liveProducts,
        0
      ),

      notLiveProducts: rows.reduce(
  (sum, brand) =>
    sum + brand.notLiveProducts,
  0
),

      affiliateReadyProducts:
        rows.reduce(
          (sum, brand) =>
            sum +
            brand.affiliateReadyProducts,
          0
        ),

      missingAffiliateProducts:
        rows.reduce(
          (sum, brand) =>
            sum +
            brand.missingAffiliateProducts,
          0
        ),

      healthyBrands: rows.filter(
        (brand) =>
          brand.liveProducts >= 6
      ).length,

      thinBrands: rows.filter(
        (brand) =>
          brand.liveProducts >= 3 &&
          brand.liveProducts <= 5
      ).length,

      attentionBrands: rows.filter(
        (brand) =>
          brand.liveProducts <= 2
      ).length,
    };

    return NextResponse.json({
      ok: true,
      summary,
      brands: rows,
    });
  } catch (error) {
    console.error(
      "Failed to load brand catalogue analytics:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Failed to load brand catalogue analytics",
      },
      {
        status: 500,
      }
    );
  }
}