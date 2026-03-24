// C:\Users\Asiya\projects\dalra\app\categories\clothing\page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import SiteShell from "@/components/SiteShell";
import ContinentFilters from "@/components/ContinentFilters";
import { ProductGrid, type GridProduct } from "@/components/ProductGrid";
import { prisma } from "@/lib/prisma";
import { Badge, ProductType } from "@prisma/client";
import { sortSizes, formatSizeLabel } from "@/lib/sizing/order";
import { parseStorefrontFilters } from "@/lib/storefront/parseFilters";
import { getAvailableStyles } from "@/lib/storefront/getAvailableStyles";
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

function qp(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return typeof v === "string" ? v : "";
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
  "accessories",
  "shoes",
];

export default async function ClothingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};

  const filters = parseStorefrontFilters(sp);
  const { types, sort } = filters;

    const pageTitle =
    types.length === 1
      ? titleCaseLabel(types[0])
      : "Clothing";

  const orderBy =
    sort === "price_asc"
      ? [{ price: "asc" as const }, { publishedAt: "desc" as const }]
      : sort === "price_desc"
      ? [{ price: "desc" as const }, { publishedAt: "desc" as const }]
      : [{ publishedAt: "desc" as const }];

  const clothingCats = await prisma.category.findMany({
    where: { slug: { in: CLOTHING_CATEGORY_SLUGS } },
    select: { id: true },
  });
  const clothingCatIds = clothingCats.map((c) => c.id);

  const brandsRaw = await prisma.brand.findMany({
    where: {
      products: {
        some: {
          status: "APPROVED",
          isActive: true,
          publishedAt: { not: null },
          OR: [
            ...(clothingCatIds.length ? [{ categoryId: { in: clothingCatIds } }] : []),
            { categoryId: null, productType: { not: null } },
          ],
        },
      },
    },
    orderBy: { name: "asc" },
    select: { slug: true, name: true, baseCountryCode: true },
    take: 1000,
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
    take: 300,
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
    categoryIds: clothingCatIds,
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
      badges: true,
      brand: { select: { name: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
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

  return (
    <SiteShell>
      <main className="min-h-screen w-full bg-white">
        <div className="mx-auto w-full max-w-[1800px] px-8 py-10 space-y-8">
          <header className="text-center">
  <h1 className="font-display text-4xl md:text-5xl tracking-[0.12em]">
    {pageTitle}
  </h1>
</header>

          <ContinentFilters
            brands={brandOptions}
            countries={countryOptions}
            types={typeOptions}
            styles={styleOptions}
            colors={colorOptions}
            sizes={sizeOptions}
          />

          {mapped.length === 0 ? (
            <div className="rounded-2xl border border-black/10 bg-white p-10 text-center text-black/60">
              No items match your filters.
            </div>
          ) : (
            <ProductGrid products={mapped} />
          )}
        </div>
      </main>
    </SiteShell>
  );
}