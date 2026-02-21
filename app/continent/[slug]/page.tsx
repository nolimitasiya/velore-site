export const dynamic = "force-dynamic";
export const revalidate = 0;

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SiteShell from "@/components/SiteShell";
import ContinentFilters from "@/components/ContinentFilters";
import { ProductGrid, type GridProduct } from "@/components/ProductGrid";
import { Badge, ProductType, type Region } from "@prisma/client";

const REGION_MAP: Record<string, Region> = {
  africa: "AFRICA",
  asia: "ASIA",
  "south-america": "SOUTH_AMERICA",
  europe: "EUROPE",
  "north-america": "NORTH_AMERICA",
  australia: "OCEANIA",
  "middle-east": "MIDDLE_EAST",
};

function qp(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return typeof v === "string" ? v : "";
}

function niceTitle(slug: string) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * IMPORTANT:
 * Number("") === 0, so we must treat empty strings as null
 * otherwise you accidentally apply price >= 0 and exclude null prices.
 */
function toNum(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function isProductType(v: string): v is ProductType {
  return (Object.values(ProductType) as string[]).includes(v);
}

export default async function ContinentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = (await searchParams) ?? {};

  const region = REGION_MAP[slug.toLowerCase()];
  if (!region) return notFound();

  // ---- read filters from URL (robust parsing)
  const brandSlug = qp(sp.brand);
  const country = qp(sp.country).toUpperCase();

  const typeRaw = qp(sp.type).toUpperCase();
  const type: ProductType | "" =
    typeRaw && isProductType(typeRaw) ? (typeRaw as ProductType) : "";

  const color = qp(sp.color).toLowerCase();

  // ✅ NEW: material slug (stored lowercase in URL)
  const material = qp(sp.material).toLowerCase();

  const min = toNum(qp(sp.min));
  const max = toNum(qp(sp.max));
  const sort = qp(sp.sort) || "new";

  const orderBy =
    sort === "price_asc"
      ? [{ price: "asc" as const }, { publishedAt: "desc" as const }]
      : sort === "price_desc"
      ? [{ price: "desc" as const }, { publishedAt: "desc" as const }]
      : [{ publishedAt: "desc" as const }];

  const sale = qp(sp.sale);
  const nextDay = qp(sp.next_day);
  
  const saleOn = sale === "1" || sale.toLowerCase() === "true";
  const nextDayOn = nextDay === "1" || nextDay.toLowerCase() === "true";

  // ---- options for filters (from DB)
  const brandsRaw = await prisma.brand.findMany({
    where: { baseRegion: region },
    orderBy: { name: "asc" },
    select: { slug: true, name: true, baseCountryCode: true },
    take: 500,
  });

  const brandOptions = brandsRaw.map((b) => ({ value: b.slug, label: b.name }));

  const countryOptions = Array.from(
    new Set(brandsRaw.map((b) => b.baseCountryCode).filter(Boolean))
  )
    .sort()
    .map((cc) => ({ value: String(cc), label: String(cc) }));

  const typeOptions = Object.values(ProductType).map((t) => ({
    value: t,
    label: t.replaceAll("_", " "),
  }));

  const coloursRaw = await prisma.colour.findMany({
    orderBy: { name: "asc" },
    select: { slug: true, name: true },
    take: 200,
  });
  const colorOptions = coloursRaw.map((c) => ({ value: c.slug, label: c.name }));

  // ✅ NEW: materials options (uses your Material model)
  const materialsRaw = await prisma.material.findMany({
  where: {
    productMaterials: {
      some: {
        product: {
          status: "APPROVED",
          isActive: true,
          publishedAt: { not: null },
          brand: { is: { baseRegion: region } },
        },
      },
    },
  },
  orderBy: { name: "asc" },
  select: { slug: true, name: true },
  take: 300,
});
const materialOptions = materialsRaw.map((m) => ({ value: m.slug, label: m.name }));


  // ---- build prisma filters (matches your schema)
  const where: any = {
    status: "APPROVED",
    isActive: true,
    publishedAt: { not: null },

    brand: {
      is: {
        baseRegion: region,
        ...(brandSlug ? { slug: brandSlug } : {}),
        ...(country ? { baseCountryCode: country } : {}),
      },
    },

    ...(type ? { productType: type } : {}),

    ...(min != null || max != null
      ? {
          price: {
            ...(min != null ? { gte: min } : {}),
            ...(max != null ? { lte: max } : {}),
          },
        }
      : {}),

    ...(color
      ? {
          productColours: {
            some: {
              colour: { slug: color },
            },
          },
        }
      : {}),

    // ✅ NEW: material filter via join table ProductMaterial
    ...(material
      ? {
          productMaterials: {
            some: {
              material: { slug: material },
            },
          },
        }
      : {}),

      ...(saleOn ? { badges: { has: Badge.sale } } : {}),
      ...(nextDayOn ? { badges: { has: Badge.next_day } } : {}),
  };

  const products = await prisma.product.findMany({
    where,
    orderBy,
    take: 120,
    select: {
      id: true,
      title: true,
      price: true,
      currency: true,
      affiliateUrl: true,
      sourceUrl: true,
      badges: true,
      brand: { select: { name: true } },
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { url: true },
      },
    },
  });

  const mapped: GridProduct[] = products.map((p) => ({
  id: p.id,
  title: p.title,
  brandName: p.brand?.name ?? null,
  imageUrl: p.images?.[0]?.url ?? null,
  price: p.price ? p.price.toString() : null,
  currency: String(p.currency),
  buyUrl: `/out/${p.id}`, // ✅ tracked everywhere
  badges: (p.badges ?? []) as any,
}));



  const title = niceTitle(slug);

  return (
    <SiteShell>
      <main className="min-h-screen w-full bg-white">
        <div className="mx-auto w-full max-w-[1800px] px-8 py-10 space-y-8">
          <div className="text-center">
            <div className="font-display text-4xl md:text-5xl tracking-[0.2em]">
              {title.toUpperCase()}
            </div>
            <div className="mt-3 text-sm text-black/60">
              Curated brands based in {title}.
            </div>
          </div>

          <ContinentFilters
            brands={brandOptions}
            countries={countryOptions}
            types={typeOptions}
            colors={colorOptions}
            materials={materialOptions} // ✅ NEW
          />

          <ProductGrid products={mapped} />
        </div>
      </main>
    </SiteShell>
  );
}
