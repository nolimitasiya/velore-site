// C:\Users\Asiya\projects\dalra\app\categories\clothing\page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import SiteShell from "@/components/SiteShell";
import ContinentFilters from "@/components/ContinentFilters";
import { ProductGrid, type GridProduct } from "@/components/ProductGrid";
import { prisma } from "@/lib/prisma";
import { Badge, ProductType } from "@prisma/client";


type Opt = { value: string; label: string };

function qp(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return typeof v === "string" ? v : "";
}

/**
 * IMPORTANT:
 * Number("") === 0, so empty must become null.
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

const CLOTHING_CATEGORY_SLUGS = [
  // your seed slugs (excluding "clothing" umbrella)
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

  // ---- read filters from URL (same keys as continent)
  const brandSlug = qp(sp.brand);
  const country = qp(sp.country).toUpperCase();

  const typeRaw = qp(sp.type).toUpperCase();
  const type: ProductType | "" =
    typeRaw && isProductType(typeRaw) ? (typeRaw as ProductType) : "";

  const color = qp(sp.color).toLowerCase();
  const material = qp(sp.material).toLowerCase(); // slug

  // ✅ badge toggles from URL
  const saleOn = qp(sp.sale) === "1" || qp(sp.sale).toLowerCase() === "true";
  const nextDayOn =
    qp(sp.next_day) === "1" || qp(sp.next_day).toLowerCase() === "true";

  const min = toNum(qp(sp.min));
  const max = toNum(qp(sp.max));
  const sort = qp(sp.sort) || "new";

  const orderBy =
    sort === "price_asc"
      ? [{ price: "asc" as const }, { publishedAt: "desc" as const }]
      : sort === "price_desc"
      ? [{ price: "desc" as const }, { publishedAt: "desc" as const }]
      : [{ publishedAt: "desc" as const }];



  /* ===========================
     🧠 Clothing scope (umbrella)
     =========================== */
  const clothingCats = await prisma.category.findMany({
    where: { slug: { in: CLOTHING_CATEGORY_SLUGS } },
    select: { id: true },
  });
  const clothingCatIds = clothingCats.map((c) => c.id);

  /* ===========================
     🔽 Filter options (from DB)
     =========================== */
  const brandsRaw = await prisma.brand.findMany({
    where: {
      products: {
        some: {
          status: "APPROVED",
          isActive: true,
          publishedAt: { not: null },
          OR: [
  ...(clothingCatIds.length ? [{ categoryId: { in: clothingCatIds } }] : []),
  { categoryId: null, productType: { not: null } }, // ✅ tight fallback
],


        },
      },
    },
    orderBy: { name: "asc" },
    select: { slug: true, name: true, baseCountryCode: true },
    take: 1000,
  });

  const brandOptions: Opt[] = brandsRaw.map((b) => ({ value: b.slug, label: b.name }));

  const countryOptions: Opt[] = Array.from(
    new Set(brandsRaw.map((b) => b.baseCountryCode).filter(Boolean))
  )
    .sort()
    .map((cc) => ({ value: String(cc), label: String(cc) }));

  const typeOptions: Opt[] = Object.values(ProductType).map((t) => ({
    value: t,
    label: t.replaceAll("_", " "),
  }));

  const coloursRaw = await prisma.colour.findMany({
    orderBy: { name: "asc" },
    select: { slug: true, name: true },
    take: 300,
  });
  const colorOptions: Opt[] = coloursRaw.map((c) => ({ value: c.slug, label: c.name }));

  const materialsRaw = await prisma.material.findMany({
    orderBy: { name: "asc" },
    select: { slug: true, name: true },
    take: 500,
  });
  const materialOptions: Opt[] = materialsRaw.map((m) => ({ value: m.slug, label: m.name }));

  /* ===========================
     📦 Fetch products
     =========================== */
  const where: any = {
    status: "APPROVED",
    isActive: true,
    publishedAt: { not: null },

    // Clothing umbrella: include subcategories OR (fallback) products with productType set
    OR: [
  ...(clothingCatIds.length ? [{ categoryId: { in: clothingCatIds } }] : []),
  { categoryId: null, productType: { not: null } }, // ✅ tight fallback
],



    ...(brandSlug || country
      ? {
          brand: {
            is: {
              ...(brandSlug ? { slug: brandSlug } : {}),
              ...(country ? { baseCountryCode: country } : {}),
            },
          },
        }
      : {}),

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
            some: { colour: { slug: color } },
          },
        }
      : {}),

    ...(material
      ? {
          productMaterials: {
            some: { material: { slug: material } },
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
  badges: true,
  brand: { select: { name: true } }, // ✅ ADD THIS
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
              Clothing
            </h1>
            <p className="mt-3 text-sm text-black/60">
              Curated modest clothing across brands.
            </p>
          </header>

          <ContinentFilters
            brands={brandOptions}
            countries={countryOptions}
            types={typeOptions}
            colors={colorOptions}
            materials={materialOptions}
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
