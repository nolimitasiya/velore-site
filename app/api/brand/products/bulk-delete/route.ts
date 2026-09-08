import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";
import { invalidateStorefrontProduct } from "@/lib/storefront/invalidate-product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  ids: z.array(z.string().min(1)).optional(),
  deleteAll: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const { brandId } = await requireBrandContext();

    const parsed = BodySchema.safeParse(
      await req.json().catch(() => ({}))
    );

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid request",
        },
        { status: 400 }
      );
    }

    const { ids, deleteAll } = parsed.data;

    const hasIds = !!ids?.length;
    const wantsDeleteAll = !!deleteAll;

    if (wantsDeleteAll === hasIds) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Provide either { deleteAll: true } OR { ids: [...] }",
        },
        { status: 400 }
      );
    }

    // DELETE ALL
    if (wantsDeleteAll) {
      const products = await prisma.product.findMany({
        where: {
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

      const res = await prisma.product.deleteMany({
        where: {
          brandId,
        },
      });

      for (const product of products) {
        invalidateStorefrontProduct({
          productId: product.id,
          productSlug: product.slug,
          brandSlug: product.brand.slug,
        });
      }

      return NextResponse.json({
        ok: true,
        deleted: res.count,
      });
    }

    // DELETE SELECTED
    const products = await prisma.product.findMany({
      where: {
        brandId,

        id: {
          in: ids!,
        },
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

    const res = await prisma.product.deleteMany({
      where: {
        brandId,

        id: {
          in: ids!,
        },
      },
    });

    for (const product of products) {
      invalidateStorefrontProduct({
        productId: product.id,
        productSlug: product.slug,
        brandSlug: product.brand.slug,
      });
    }

    return NextResponse.json({
      ok: true,
      deleted: res.count,
    });
  } catch (e: any) {
    if (e?.message === "UNAUTHENTICATED") {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: e?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}