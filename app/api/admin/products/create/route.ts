import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  Badge,
  Prisma,
  ProductStatus,
  ProductType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function makeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();

    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Invalid request body." },
        { status: 400 }
      );
    }

    const brandId =
      typeof body.brandId === "string" ? body.brandId.trim() : "";

    const title =
      typeof body.title === "string" ? body.title.trim() : "";

    const sourceUrl =
      typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";

    const affiliateUrl =
      typeof body.affiliateUrl === "string"
        ? body.affiliateUrl.trim()
        : "";

    const currency =
      typeof body.currency === "string"
        ? body.currency.trim().toUpperCase()
        : "GBP";

    const priceRaw =
  typeof body.price === "string" || typeof body.price === "number"
    ? String(body.price).trim()
    : "";

const originalPriceRaw =
  typeof body.originalPrice === "string" ||
  typeof body.originalPrice === "number"
    ? String(body.originalPrice).trim()
    : "";

const categoryId =
      typeof body.categoryId === "string" && body.categoryId.trim()
        ? body.categoryId.trim()
        : null;

    const productTypes = cleanStringArray(body.productTypes);
    const materialIds = cleanStringArray(body.materialIds);
    const occasionIds = cleanStringArray(body.occasionIds);
    const styleIds = cleanStringArray(body.styleIds);
    const colourIds = cleanStringArray(body.colourIds);
    const sizeIds = cleanStringArray(body.sizeIds);
    const lengths = cleanStringArray(body.lengths);
    const images = cleanStringArray(body.images);

    const polyesterFree = body.polyesterFree === true;
    const saleBadge = body.saleBadge === true;

    if (!brandId) {
      return NextResponse.json(
        { ok: false, error: "Select a brand." },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { ok: false, error: "Product name is required." },
        { status: 400 }
      );
    }

    if (!sourceUrl || !isHttpUrl(sourceUrl)) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid product URL." },
        { status: 400 }
      );
    }

    if (affiliateUrl && !isHttpUrl(affiliateUrl)) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid affiliate URL." },
        { status: 400 }
      );
    }

    const allowedCurrencies = ["GBP", "EUR", "CHF", "USD"];

    if (!allowedCurrencies.includes(currency)) {
      return NextResponse.json(
        { ok: false, error: "Unsupported currency." },
        { status: 400 }
      );
    }

    let price: Prisma.Decimal | null = null;

    if (priceRaw) {
      try {
        price = new Prisma.Decimal(priceRaw);

        if (price.isNegative()) {
          return NextResponse.json(
            { ok: false, error: "Price cannot be negative." },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { ok: false, error: "Enter a valid price." },
          { status: 400 }
        );
      }
    }

    let originalPrice: Prisma.Decimal | null = null;

if (originalPriceRaw) {
  try {
    originalPrice = new Prisma.Decimal(originalPriceRaw);

    if (originalPrice.isNegative()) {
      return NextResponse.json(
        { ok: false, error: "Original price cannot be negative." },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: "Enter a valid original price." },
      { status: 400 }
    );
  }
}

if (originalPrice && !price) {
  return NextResponse.json(
    {
      ok: false,
      error: "Enter a current price when adding an original price.",
    },
    { status: 400 }
  );
}

if (originalPrice && price && originalPrice.lte(price)) {
  return NextResponse.json(
    {
      ok: false,
      error: "Original price must be higher than the current price.",
    },
    { status: 400 }
  );
}

    if (!productTypes.length) {
      return NextResponse.json(
        { ok: false, error: "Select at least one product type." },
        { status: 400 }
      );
    }

    const validProductTypes = new Set(Object.values(ProductType));

    if (
      productTypes.some(
        (productType) =>
          !validProductTypes.has(productType as ProductType)
      )
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid product type." },
        { status: 400 }
      );
    }

    for (const image of images) {
      if (!isHttpUrl(image)) {
        return NextResponse.json(
          { ok: false, error: "One or more image URLs are invalid." },
          { status: 400 }
        );
      }
    }

    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!brand) {
      return NextResponse.json(
        { ok: false, error: "Brand not found." },
        { status: 404 }
      );
    }

    const existingSource = await prisma.product.findUnique({
      where: {
        brandId_sourceUrl: {
          brandId,
          sourceUrl,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingSource) {
      return NextResponse.json(
        {
          ok: false,
          error: "This product URL already exists for this brand.",
        },
        { status: 409 }
      );
    }

    if (categoryId) {
      const categoryExists = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });

      if (!categoryExists) {
        return NextResponse.json(
          { ok: false, error: "Selected category no longer exists." },
          { status: 400 }
        );
      }
    }

    const baseSlug = makeSlug(title) || "product";

    const matchingSlugs = await prisma.product.findMany({
      where: {
        brandId,
        slug: {
          startsWith: baseSlug,
        },
      },
      select: {
        slug: true,
      },
    });

    const usedSlugs = new Set(
      matchingSlugs.map((product) => product.slug)
    );

    let slug = baseSlug;
    let suffix = 2;

    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const created = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          brandId,
          title,
          slug,

          sourceUrl,
          affiliateUrl: affiliateUrl || null,

          currency,
          price,
          originalPrice,


          categoryId,

          productType: productTypes[0] as ProductType,

          lengths,
          polyesterFree,

          badges: saleBadge ? [Badge.sale] : [],

          status: ProductStatus.DRAFT,
          isActive: true,
          publishedAt: null,

          submittedAt: null,
          lastApprovedAt: null,
          reviewNote: null,
        },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          isActive: true,
          publishedAt: true,
        },
      });

      if (productTypes.length) {
        await tx.productProductType.createMany({
          data: productTypes.map((productType) => ({
            productId: product.id,
            productType: productType as ProductType,
          })),
          skipDuplicates: true,
        });
      }

      if (materialIds.length) {
        await tx.productMaterial.createMany({
          data: materialIds.map((materialId) => ({
            productId: product.id,
            materialId,
          })),
          skipDuplicates: true,
        });
      }

      if (occasionIds.length) {
        await tx.productOccasion.createMany({
          data: occasionIds.map((occasionId) => ({
            productId: product.id,
            occasionId,
          })),
          skipDuplicates: true,
        });
      }

      if (styleIds.length) {
        await tx.productStyle.createMany({
          data: styleIds.map((styleId) => ({
            productId: product.id,
            styleId,
          })),
          skipDuplicates: true,
        });
      }

      if (colourIds.length) {
        await tx.productColour.createMany({
          data: colourIds.map((colourId) => ({
            productId: product.id,
            colourId,
          })),
          skipDuplicates: true,
        });
      }

      if (sizeIds.length) {
        await tx.productSize.createMany({
          data: sizeIds.map((sizeId) => ({
            productId: product.id,
            sizeId,
          })),
          skipDuplicates: true,
        });
      }

      if (images.length) {
        await tx.productImage.createMany({
          data: images.map((url, index) => ({
            productId: product.id,
            url,
            sortOrder: index,
          })),
        });
      }

      return product;
    });

    return NextResponse.json(
      {
        ok: true,
        product: created,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[admin/products/create]", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          ok: false,
          error: "A product with these details already exists.",
        },
        { status: 409 }
      );
    }

    if (error?.code === "P2003") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "One of the selected taxonomy values no longer exists. Refresh and try again.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Failed to create product.",
      },
      {
        status:
          error?.message === "UNAUTHENTICATED"
            ? 401
            : error?.message === "FORBIDDEN"
            ? 403
            : 500,
      }
    );
  }
}