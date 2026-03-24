// app/search/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import SiteShell from "@/components/SiteShell";
import ContinentFilters from "@/components/ContinentFilters";
import { ProductGrid, type GridProduct } from "@/components/ProductGrid";
import { prisma } from "@/lib/prisma";
import { ProductType } from "@prisma/client";
import { sortSizes, formatSizeLabel } from "@/lib/sizing/order";
import { parseStorefrontFilters } from "@/lib/storefront/parseFilters";
import { getAvailableStyles } from "@/lib/storefront/getAvailableStyles";
import { buildStorefrontWhere } from "@/lib/storefront/buildStorefrontWhere";
import { countryNameFromIso2 } from "@/lib/geo/countries";
import { buildTrackedOutboundUrl } from "@/lib/affiliate/tracking";

type Opt = { value: string; label: string };

const STOREFRONT_TYPE_LABELS: Record<string, string> = {
  ABAYA: "Abayas",
  DRESS: "Dresses",
  SKIRT: "Skirts",
  TOP: "Tops",
  HIJAB: "Hijabs",
  ACTIVEWEAR: "Activewear",
  SETS: "Sets",
  MATERNITY: "Maternity",
  KHIMAR: "Khimars",
  JILBAB: "Jilbabs",
  COATS_JACKETS: "Coats & Jackets",
};


function titleCaseLabel(s: string) {
  return s
    .toLowerCase()
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function normalizeText(s: string) {
  return s.toLowerCase().replaceAll("_", " ").trim();
}

function matchingProductTypes(q: string): ProductType[] {
  const nq = normalizeText(q);

  return (Object.values(ProductType) as ProductType[]).filter((t) => {
    const enumText = normalizeText(t);
    const labelText = normalizeText(titleCaseLabel(t));
    return enumText.includes(nq) || labelText.includes(nq);
  });
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};

  const qRaw = Array.isArray(sp.q) ? sp.q[0] ?? "" : sp.q ?? "";
  const q = String(qRaw).trim();

  const filters = parseStorefrontFilters(sp);
  const { types, sort } = filters;

  const orderBy =
    sort === "price_asc"
      ? [{ price: "asc" as const }, { publishedAt: "desc" as const }]
      : sort === "price_desc"
      ? [{ price: "desc" as const }, { publishedAt: "desc" as const }]
      : [{ publishedAt: "desc" as const }];

  const brandsRaw = await prisma.brand.findMany({
    where: {
      products: {
        some: {
          status: "APPROVED",
          isActive: true,
          publishedAt: { not: null },
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
  label: STOREFRONT_TYPE_LABELS[t] ?? titleCaseLabel(t),
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

  const baseWhere = buildStorefrontWhere({
    filters,
  });

  const matchedTypes = q ? matchingProductTypes(q) : [];

  const where = q
    ? {
        AND: [
          baseWhere,
          {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              {
                brand: {
                  is: {
                    name: { contains: q, mode: "insensitive" as const },
                  },
                },
              },
              ...(matchedTypes.length
                ? [{ productType: { in: matchedTypes } }]
                : []),
              {
                category: {
                  is: {
                    name: { contains: q, mode: "insensitive" as const },
                  },
                },
              },
              {
                category: {
                  is: {
                    slug: { contains: q.toLowerCase(), mode: "insensitive" as const },
                  },
                },
              },
              {
                productTags: {
                  some: {
                    tag: {
                      name: { contains: q, mode: "insensitive" as const },
                    },
                  },
                },
              },
              {
                productTags: {
                  some: {
                    tag: {
                      slug: { contains: q.toLowerCase(), mode: "insensitive" as const },
                    },
                  },
                },
              },
              {
                productStyles: {
                  some: {
                    style: {
                      name: { contains: q, mode: "insensitive" as const },
                    },
                  },
                },
              },
              {
                productStyles: {
                  some: {
                    style: {
                      slug: { contains: q.toLowerCase(), mode: "insensitive" as const },
                    },
                  },
                },
              },
              {
                productMaterials: {
                  some: {
                    material: {
                      name: { contains: q, mode: "insensitive" as const },
                    },
                  },
                },
              },
              {
                productMaterials: {
                  some: {
                    material: {
                      slug: { contains: q.toLowerCase(), mode: "insensitive" as const },
                    },
                  },
                },
              },
              {
                productOccasions: {
                  some: {
                    occasion: {
                      name: { contains: q, mode: "insensitive" as const },
                    },
                  },
                },
              },
              {
                productOccasions: {
                  some: {
                    occasion: {
                      slug: { contains: q.toLowerCase(), mode: "insensitive" as const },
                    },
                  },
                },
              },
            ],
          },
        ],
      }
    : baseWhere;

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

  const mapped: GridProduct[] = products.map((p, index) => ({
  id: p.id,
  title: p.title,
  brandName: p.brand?.name ?? null,
  imageUrl: p.images?.[0]?.url ?? null,
  price: p.price ? p.price.toString() : null,
  currency: String(p.currency),
  buyUrl: buildTrackedOutboundUrl(p.id, {
    sourcePage: "SEARCH",
    position: index + 1,
  }),
  badges: (p.badges ?? []) as any,
}));


  return (
    <SiteShell>
      <main className="min-h-screen w-full bg-white">
        <div className="mx-auto w-full max-w-[1800px] px-8 py-10 space-y-10">
          <header className="space-y-2 text-center">
  <h1 className="font-display text-4xl md:text-5xl tracking-[0.12em]">
    {q ? `Results for "${q}"` : "All Products"}
  </h1>

  <div className="text-sm tracking-wide text-black/50">
    {mapped.length} item{mapped.length === 1 ? "" : "s"}
  </div>
</header>

          <div className="sticky top-0 z-30 bg-white/95 pb-4 backdrop-blur supports-[backdrop-filter]:bg-white/80">
  <ContinentFilters
    brands={brandOptions}
    countries={countryOptions}
    types={typeOptions}
    styles={styleOptions}
    colors={colorOptions}
    sizes={sizeOptions}
  />
</div>

          {mapped.length === 0 ? (
            <div className="rounded-2xl border border-black/10 bg-white p-10 text-center text-black/60">
              No products found.
            </div>
          ) : (
            <ProductGrid products={mapped} />
          )}
        </div>
      </main>
    </SiteShell>
  );
}