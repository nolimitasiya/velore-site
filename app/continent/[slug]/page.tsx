export const dynamic = "force-dynamic";
export const revalidate = 0;

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SiteShell from "@/components/SiteShell";
import ContinentFilters from "@/components/ContinentFilters";
import { ProductGrid, type GridProduct } from "@/components/ProductGrid";
import { Badge, ProductType, type Region } from "@prisma/client";
import { sortSizes, formatSizeLabel } from "@/lib/sizing/order";
import { getAvailableStyles } from "@/lib/storefront/getAvailableStyles";
import { parseStorefrontFilters } from "@/lib/storefront/parseFilters";
import { buildStorefrontWhere } from "@/lib/storefront/buildStorefrontWhere";
import { countryNameFromIso2 } from "@/lib/geo/countries";

type Opt = { value: string; label: string };

function titleCaseLabel(s: string) {
  return s
    .toLowerCase()
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

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

  const filters = parseStorefrontFilters(sp);
  const { types, sort } = filters;

  const orderBy =
    sort === "price_asc"
      ? [{ price: "asc" as const }, { publishedAt: "desc" as const }]
      : sort === "price_desc"
      ? [{ price: "desc" as const }, { publishedAt: "desc" as const }]
      : [{ publishedAt: "desc" as const }];


  const brandsRaw = await prisma.brand.findMany({
    where: { baseRegion: region },
    orderBy: { name: "asc" },
    select: { slug: true, name: true, baseCountryCode: true },
    take: 500,
  });

  const brandOptions: Opt[] = brandsRaw.map((b) => ({
    value: b.slug,
    label: b.name,
  }));

    const countryOptions: Opt[] = Array.from(
    new Set(brandsRaw.map((b) => b.baseCountryCode).filter(Boolean))
  )
    .sort()
    .map((cc) => ({
      value: String(cc),
      label: countryNameFromIso2(String(cc)),
    }));

  const typeOptions: Opt[] = Object.values(ProductType).map((t) => ({
    value: t,
    label: titleCaseLabel(t),
  }));

    const styleOptions: Opt[] = await getAvailableStyles(types);

  const coloursRaw = await prisma.colour.findMany({
    orderBy: { name: "asc" },
    select: { slug: true, name: true },
    take: 200,
  });

  const colorOptions: Opt[] = coloursRaw.map((c) => ({
    value: c.slug,
    label: c.name.toLowerCase(),
  }));

  const sizesRaw = await prisma.size.findMany({
    orderBy: { name: "asc" },
    select: { slug: true, name: true },
    take: 500,
  });

  const sizeOptions = sizesRaw
    .sort(sortSizes)
    .map((s) => ({
      value: s.slug,
      label: formatSizeLabel(s.name),
    }));

     const where = buildStorefrontWhere({
    filters,
    region,
  });

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
    buyUrl: `/out/${p.id}`,
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
            styles={styleOptions}
            colors={colorOptions}
            sizes={sizeOptions}
          />

          <ProductGrid products={mapped} />
        </div>
      </main>
    </SiteShell>
  );
}