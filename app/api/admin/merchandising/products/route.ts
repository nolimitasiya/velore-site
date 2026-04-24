import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_KEYS = ["CLOTHING", "SALE", "OCCASION"] as const;
type MerchPageKey = (typeof PAGE_KEYS)[number];

function isValidPageKey(value: unknown): value is MerchPageKey {
  return typeof value === "string" && PAGE_KEYS.includes(value as MerchPageKey);
}

function parseSearch(value: unknown) {
  return String(value ?? "").trim();
}

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();

    const { searchParams } = new URL(req.url);
    const q = parseSearch(searchParams.get("q"));
    const pageKeyParam = searchParams.get("pageKey");
    const pageKey = isValidPageKey(pageKeyParam) ? pageKeyParam : null;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      status: "APPROVED",
      publishedAt: { not: null },
    };

   if (q) {
  const normalized = q.trim().toUpperCase().replace(/[\s-]+/g, "_");

  where.OR = [
    { title: { contains: q, mode: "insensitive" } },
    { slug: { contains: q, mode: "insensitive" } },
    { brand: { name: { contains: q, mode: "insensitive" } } },
    ...(normalized in {
      ABAYA: true,
      DRESS: true,
      SKIRT: true,
      TOP: true,
      HIJAB: true,
      ACTIVEWEAR: true,
      SETS: true,
      MATERNITY: true,
      KHIMAR: true,
      JILBAB: true,
      COATS_JACKETS: true,
    }
      ? [{ productType: normalized as Prisma.EnumProductTypeFilter["equals"] }]
      : []),
  ];
}

    if (pageKey === "CLOTHING") {
      where.productType = { not: null };
    }

    if (pageKey === "SALE") {
      where.badges = {
        has: "sale",
      };
    }

    if (pageKey === "OCCASION") {
      where.productOccasions = {
        some: {},
      };
    }

    const products = await prisma.product.findMany({
      where,
      take: 24,
      orderBy: [
        { publishedAt: "desc" },
        { updatedAt: "desc" },
      ],
      select: {
        id: true,
        title: true,
        slug: true,
        price: true,
        currency: true,
        productType: true,
        badges: true,
        publishedAt: true,
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: {
            url: true,
          },
        },
        productOccasions: {
          take: 1,
          select: {
            occasion: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      products,
    });
  } catch (error) {
    console.error("GET /api/admin/merchandising/products failed", error);
    return NextResponse.json(
      { error: "Failed to search products." },
      { status: 500 }
    );
  }
}