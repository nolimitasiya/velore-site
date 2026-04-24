export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import SiteShell from "@/components/SiteShell";
import ContinentFilters from "@/components/ContinentFilters";
import StorefrontPagination from "@/components/StorefrontPagination";
import { ProductGrid, type GridProduct } from "@/components/ProductGrid";
import { prisma } from "@/lib/prisma";
import { ProductType } from "@prisma/client";
import { sortSizes, formatSizeLabel } from "@/lib/sizing/order";
import { parseStorefrontFilters } from "@/lib/storefront/parseFilters";
import { getAvailableStyles } from "@/lib/storefront/getAvailableStyles";
import { buildStorefrontWhere } from "@/lib/storefront/buildStorefrontWhere";
import { countryNameFromIso2 } from "@/lib/geo/countries";
import { getMerchPageOneProducts } from "@/lib/storefront/getMerchPageOneProducts";
import { getStorefrontPaginationState } from "@/lib/storefront/pagination";

type Opt = { value: string; label: string };

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

function titleCaseLabel(s: string) {
  if (s === "COATS_JACKETS") return "Coats & Jackets";
  if (s === "HOODIE_SWEATSHIRT") return "Hoodie & Sweatshirt";
  if (s === "T_SHIRT") return "T-Shirt";

  return s
    .toLowerCase()
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function OccasionPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const filters = parseStorefrontFilters(sp);
  const { types, sort } = filters;

  const hasActiveFilters =
    filters.brands.length > 0 ||
    filters.countries.length > 0 ||
    filters.types.length > 0 ||
    filters.styles.length > 0 ||
    filters.colors.length > 0 ||
    filters.sizes.length > 0 ||
    filters.min != null ||
    filters.max != null ||
    filters.saleOn;

  const shouldUseMerchPageOne = !hasActiveFilters && sort === "new";

  const pagination = getStorefrontPaginationState(sp);
  const { currentPage, isExpandedPageOne, pageOneVisibleCount, take } =
    pagination;

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
    productOccasions: {
      some: {},
    },
    productType: { in: OCCASION_PRODUCT_TYPES },
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

  const typeOptions: Opt[] = OCCASION_PRODUCT_TYPES.map((t) => ({
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

  const sizeOptions = sizesRaw.sort(sortSizes).map((s) => ({
    value: s.slug,
    label: formatSizeLabel(s.name),
  }));

  const where = {
  ...buildStorefrontWhere({
    filters,
  }),
  productOccasions: {
    some: {},
  },
  productType: filters.types.length
    ? { in: filters.types }
    : { in: OCCASION_PRODUCT_TYPES },
};

  const totalCount = await prisma.product.count({ where });

  let mapped: GridProduct[] = [];

  if (shouldUseMerchPageOne && currentPage === 1) {
    mapped = await getMerchPageOneProducts("OCCASION", pageOneVisibleCount);
  } else {
    let whereForPage = where;
    let skip = 0;

    if (shouldUseMerchPageOne && currentPage >= 2) {
      const protectedPageOneProducts = await getMerchPageOneProducts(
        "OCCASION",
        48
      );

      const protectedIds = protectedPageOneProducts.map((p) => p.id);

      whereForPage = {
        ...where,
        id: { notIn: protectedIds },
      };

      skip = (currentPage - 2) * 24;
    } else if (currentPage === 1) {
      skip = 0;
    } else {
      skip = 48 + (currentPage - 2) * 24;
    }

    const products = await prisma.product.findMany({
      where: whereForPage,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        title: true,
        price: true,
        currency: true,
        badges: true,
        brand: { select: { name: true } },
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { url: true },
        },
      },
    });

    mapped = products.map((p, index) => ({
  id: p.id,
  title: p.title,
  brandName: p.brand?.name ?? null,
  imageUrl: p.images?.[0]?.url ?? null,
  price: p.price ? p.price.toString() : null,
  currency: String(p.currency),
  buyUrl: `/out/${p.id}`,
  badges: (p.badges ?? []) as any,
  analytics: {
    sourcePage: "SEARCH" as const,
    sectionKey: "occasion_grid",
    position: index + 1,
    pageNumber: currentPage,
    isExpandedPageOne: currentPage === 1 ? isExpandedPageOne : false,
    contextType:
      shouldUseMerchPageOne && currentPage >= 2 ? "GRID_AFTER_MERCH" : "GRID",
  },
}));
  }

  return (
    <SiteShell>
      <main className="min-h-screen w-full bg-white">
        <div className="mx-auto w-full max-w-[1800px] space-y-8 px-8 py-10">
          <header className="text-center">
            <h1 className="font-display text-4xl tracking-[0.12em] md:text-5xl">
              Occasion
            </h1>
            <p className="mt-3 text-sm text-black/60 md:text-base">
              Discover clothing for every occasion.
            </p>
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
            <section id="products">
              <ProductGrid products={mapped} />
              <StorefrontPagination
                pathname="/categories/occasion"
                searchParams={sp}
                totalItems={totalCount}
                currentPage={currentPage}
                isExpandedPageOne={isExpandedPageOne}
              />
            </section>
          )}
        </div>
      </main>
    </SiteShell>
  );
}