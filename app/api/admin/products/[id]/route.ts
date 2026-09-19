import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Badge, Prisma } from "@prisma/client";

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

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _req: NextRequest,
  { params }: RouteContext
) {
  try {
    await requireAdminSession();

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        sourceUrl: true,
        affiliateUrl: true,
        price: true,
        originalPrice: true,
        currency: true,
        badges: true,

        images: {
  orderBy: {
    sortOrder: "asc",
  },
  select: {
    id: true,
    url: true,
    sortOrder: true,
  },
},

        brand: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { ok: false, error: "Product not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      product: {
        ...product,
        price: product.price?.toString() ?? null,
        originalPrice: product.originalPrice?.toString() ?? null,
      },
    });
  } catch (error: any) {
    console.error("[admin/products/id GET]", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Failed to load product.",
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

export async function PATCH(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    await requireAdminSession();

    const { id } = await params;
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Invalid request body." },
        { status: 400 }
      );
    }

    const title =
      typeof body.title === "string" ? body.title.trim() : "";

    const sourceUrl =
      typeof body.sourceUrl === "string"
        ? body.sourceUrl.trim()
        : "";

    const affiliateUrl =
      typeof body.affiliateUrl === "string"
        ? body.affiliateUrl.trim()
        : "";

    const currency =
      typeof body.currency === "string"
        ? body.currency.trim().toUpperCase()
        : "GBP";

    const priceRaw =
      typeof body.price === "string" ||
      typeof body.price === "number"
        ? String(body.price).trim()
        : "";

    const originalPriceRaw =
      typeof body.originalPrice === "string" ||
      typeof body.originalPrice === "number"
        ? String(body.originalPrice).trim()
        : "";

    const saleBadge = body.saleBadge === true;

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
            {
              ok: false,
              error: "Original price cannot be negative.",
            },
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

    const existing = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        badges: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Product not found." },
        { status: 404 }
      );
    }

    const badges = saleBadge
      ? Array.from(new Set([...existing.badges, Badge.sale]))
      : existing.badges.filter((badge) => badge !== Badge.sale);

    const product = await prisma.product.update({
      where: { id },
      data: {
        title,
        sourceUrl,
        affiliateUrl: affiliateUrl || null,
        price,
        originalPrice,
        currency,
        badges,
      },
      select: {
        id: true,
        title: true,
        sourceUrl: true,
        affiliateUrl: true,
        price: true,
        originalPrice: true,
        currency: true,
        badges: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      product: {
        ...product,
        price: product.price?.toString() ?? null,
        originalPrice: product.originalPrice?.toString() ?? null,
      },
    });
  } catch (error: any) {
    console.error("[admin/products/id PATCH]", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Failed to update product.",
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