import { NextRequest, NextResponse } from "next/server";
import { Badge, Region, ProductType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { parseStorefrontFilters, type RawSearchParams } from "@/lib/storefront/parseFilters";
import { buildStorefrontWhere } from "@/lib/storefront/buildStorefrontWhere";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLOTHING_CATEGORY_SLUGS = [
  "abaya",
  "modest_dresses",
  "coats",
  "jackets",
  "knitwear",
  "tops",
  "skirts",
  "trousers",
  "co_ords",
  "activewear",
  "maternity",
  "khimar",
  "swimwear_modest",
  "hijabs",
];
const ACCESSORY_CATEGORY_SLUGS = [
  "accessories",
  "rings",
  "bracelets",
  "necklaces",
  "earrings",
  "watches",
];

const OCCASION_PRODUCT_TYPES: ProductType[] = [
  ProductType.ABAYA,
  ProductType.DRESS,
  ProductType.SKIRT,
  ProductType.TOP,
  ProductType.HIJAB,
  ProductType.ACTIVEWEAR,
  ProductType.SETS,
  ProductType.MATERNITY,
  ProductType.KHIMAR,
  ProductType.JILBAB,
  ProductType.COATS_JACKETS,
  ProductType.HOODIE_SWEATSHIRT,
  ProductType.PANTS,
  ProductType.BLAZER,
  ProductType.T_SHIRT,
];

const ALLOWED_OCCASION_SLUGS = ["wedding", "eid", "formal"];

const REGION_MAP: Record<string, Region> = {
  africa: "AFRICA",
  asia: "ASIA",
  "south-america": "SOUTH_AMERICA",
  europe: "EUROPE",
  "north-america": "NORTH_AMERICA",
  australia: "OCEANIA",
  "middle-east": "MIDDLE_EAST",
};

function searchParamsToRaw(sp: URLSearchParams): RawSearchParams {
  return {
    brand: sp.getAll("brand"),
    country: sp.getAll("country"),
    type: sp.getAll("type"),
    style: sp.getAll("style"),
    color: sp.getAll("color"),
    size: sp.getAll("size"),
    min: sp.get("min") ?? undefined,
    max: sp.get("max") ?? undefined,
    sort: sp.get("sort") ?? undefined,
    sale: sp.get("sale") ?? undefined,
    next_day: sp.get("next_day") ?? undefined,
  };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const pathname = url.searchParams.get("pathname") || "";

    const raw = searchParamsToRaw(url.searchParams);
    const filters = parseStorefrontFilters(raw);

    let where;

    if (pathname.startsWith("/categories/clothing")) {
      const clothingCats = await prisma.category.findMany({
        where: { slug: { in: CLOTHING_CATEGORY_SLUGS } },
        select: { id: true },
      });

      const clothingCatIds = clothingCats.map((c) => c.id);

      where = buildStorefrontWhere({
        filters,
        categoryIds: clothingCatIds,
      });
    }else if (pathname.startsWith("/categories/accessories")) {
      const selectedAccessoryCategory =
        (url.searchParams.get("category") || "").trim().toLowerCase();

      const accessoryCategories = await prisma.category.findMany({
        where: { slug: { in: ACCESSORY_CATEGORY_SLUGS } },
        select: { id: true, slug: true },
      });

      const selectedAccessoryRow = selectedAccessoryCategory
        ? accessoryCategories.find((c) => c.slug === selectedAccessoryCategory)
        : null;

      const accessoryCategoryIds = selectedAccessoryRow
        ? [selectedAccessoryRow.id]
        : accessoryCategories.map((c) => c.id);

      where = selectedAccessoryRow
  ? {
      ...buildStorefrontWhere({
        filters: {
          ...filters,
          types: filters.types.length ? filters.types : ["ACCESSORIES" as const],
        },
      }),
      categoryId: selectedAccessoryRow.id,
    }
  : {
      ...buildStorefrontWhere({
        filters: {
          ...filters,
          types: filters.types.length ? filters.types : ["ACCESSORIES" as const],
        },
      }),
      AND: [
        {
          OR: [
            { categoryId: { in: accessoryCategoryIds } },
            { productType: "ACCESSORIES" as const },
          ],
        },
      ],
    };
        }else if (pathname.startsWith("/categories/occasion/")) {
      const slug = pathname.replace("/categories/occasion/", "").split("/")[0]?.toLowerCase() || "";

      if (!ALLOWED_OCCASION_SLUGS.includes(slug)) {
        return NextResponse.json({ ok: false, error: "Invalid occasion" }, { status: 400 });
      }

      where = {
  ...buildStorefrontWhere({
    filters,
    occasionSlug: slug,
  }),
  productType: filters.types.length
    ? { in: filters.types }
    : { in: OCCASION_PRODUCT_TYPES },
};
    } else if (pathname.startsWith("/sale")) {
      where = {
        ...buildStorefrontWhere({
          filters,
        }),
        badges: { has: Badge.sale },
      };
    
    
    }else if (pathname.startsWith("/continent/")) {
      const slug = pathname.replace("/continent/", "").split("/")[0]?.toLowerCase() || "";
      const region = REGION_MAP[slug];

      if (!region) {
        return NextResponse.json({ ok: false, error: "Invalid continent" }, { status: 400 });
      }

      where = buildStorefrontWhere({
        filters,
        region,
      });

      
    } else {
      where = buildStorefrontWhere({
        filters,
      });
    }

    const count = await prisma.product.count({ where });

    return NextResponse.json({ ok: true, count });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to count items" },
      { status: 500 }
    );
  }
}