// C:\Users\Asiya\projects\dalra\app\api\storefront\products\route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Region, ProductType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toRegion(x: string | null): Region | null {
  const v = String(x ?? "").trim().toUpperCase();
  return (Object.values(Region) as string[]).includes(v) ? (v as Region) : null;
}

function toIso2(x: string | null): string | null {
  const v = String(x ?? "").trim().toUpperCase();
  return v.length === 2 ? v : null;
}

function splitCsv(x: string | null) {
  return String(x ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toProductType(x: string | null): ProductType | null {
  const v = String(x ?? "").trim().toUpperCase();
  return (Object.values(ProductType) as string[]).includes(v)
    ? (v as ProductType)
    : null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const take = Math.min(Number(searchParams.get("take") ?? 12) || 12, 48);

  const q = (searchParams.get("q") ?? "").trim();
  const brandId = (searchParams.get("brandId") ?? "").trim() || null;

  const region = toRegion(searchParams.get("region"));
  const country = toIso2(searchParams.get("country"));
  const type = toProductType(searchParams.get("type"));
  const material = (searchParams.get("material") ?? "").trim().toLowerCase();
  const sizes = splitCsv(searchParams.get("size")).map((s) => s.toLowerCase());

  const sectionId = searchParams.get("sectionId");

  

  let sectionCountry: string | null = null;

  if (sectionId) {
    const section = await prisma.storefrontSection.findUnique({
      where: { id: sectionId },
      select: {
        type: true,
        targetCountryCode: true,
      },
    });

    sectionCountry =
      section?.type === "COUNTRY" ? section.targetCountryCode ?? null : null;
  }

  const products = await prisma.product.findMany({
    where: {
      status: "APPROVED",
      isActive: true,
      publishedAt: { not: null },

      brand: {
        affiliateStatus: "ACTIVE",
        ...(brandId ? { id: brandId } : {}),
        ...(region ? { baseRegion: region } : {}),
        ...(sectionCountry
          ? { baseCountryCode: sectionCountry }
          : country
          ? { baseCountryCode: country }
          : {}),
      },

      ...(type ? { productType: type } : {}),

      ...(material
        ? { productMaterials: { some: { material: { slug: material } } } }
        : {}),

      ...(sizes.length
        ? { productSizes: { some: { size: { slug: { in: sizes } } } } }
        : {}),

      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { slug: { contains: q.toLowerCase() } },
              { brand: { name: { contains: q, mode: "insensitive" } } },
              { brand: { slug: { contains: q.toLowerCase() } } },
            ],
          }
        : {}),

      AND: [
        {
          OR: [
            { affiliateUrl: { not: null } },
            { brand: { affiliateBaseUrl: { not: null } } },
          ],
        },
      ],
    },

    orderBy: [
      ...(q ? [] : [{ publishedAt: "desc" as const }]),
      { updatedAt: "desc" as const },
    ],
    take,

    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      currency: true,
      isActive: true,
      publishedAt: true,
      status: true,
      affiliateUrl: true,
      sourceUrl: true,
      brand: {
        select: {
          id: true,
          name: true,
          slug: true,
          baseRegion: true,
          baseCountryCode: true,
          baseCity: true,
          affiliateStatus: true,
          affiliateBaseUrl: true,
        },
      },
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { url: true },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    products: products.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      price: p.price ? p.price.toString() : null,
      currency: p.currency,
      isActive: p.isActive,
      publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
      status: p.status,
      brand: {
        id: p.brand?.id ?? "",
        name: p.brand?.name ?? "",
        slug: p.brand?.slug ?? "",
      },
      brandName: p.brand?.name ?? "",
      brandSlug: p.brand?.slug ?? "",
      brandRegion: p.brand?.baseRegion ?? null,
      brandCountryCode: p.brand?.baseCountryCode ?? null,
      brandCity: p.brand?.baseCity ?? null,
      affiliateUrl: p.affiliateUrl ?? p.brand?.affiliateBaseUrl ?? null,
      sourceUrl: p.sourceUrl,
      imageUrl: p.images?.[0]?.url ?? null,
    })),
  });
}