import { NextRequest, NextResponse } from "next/server";
import { invalidateStorefrontProduct } from "@/lib/storefront/invalidate-product";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    await requireAdminSession();

    const { id } = await params;
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const url =
      typeof body.url === "string"
        ? body.url.trim()
        : "";

    if (!url || !isHttpUrl(url)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Enter a valid image URL.",
        },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: {
        id,
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

    if (!product) {
      return NextResponse.json(
        {
          ok: false,
          error: "Product not found.",
        },
        { status: 404 }
      );
    }

    const lastImage =
      await prisma.productImage.findFirst({
        where: {
          productId: id,
        },
        orderBy: {
          sortOrder: "desc",
        },
        select: {
          sortOrder: true,
        },
      });

    const nextSortOrder =
      lastImage === null
        ? 0
        : lastImage.sortOrder + 1;

    const image = await prisma.productImage.create({
      data: {
        productId: id,
        url,
        sortOrder: nextSortOrder,
      },
      select: {
        id: true,
        productId: true,
        url: true,
        sortOrder: true,
      },
    });

    invalidateStorefrontProduct({
  productId: product.id,
  productSlug: product.slug,
  brandSlug: product.brand.slug,
});

    return NextResponse.json({
      ok: true,
      image,
    });
  } catch (error: any) {
    console.error(
      "[admin/products/id/images POST]",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ??
          "Failed to add product image.",
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