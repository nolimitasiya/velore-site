export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

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
import { unstable_cache } from "next/cache";

import {  buildTrackedOutboundUrl,} from "@/lib/affiliate/tracking";

type Opt = { value: string; label: string };

const OCCASION_PRODUCT_TYPES: ProductType[] = [
  ProductType.ABAYA,
  ProductType.DRESS,
  ProductType.SKIRT,
  ProductType.TOP,
  ProductType.HIJAB,
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

const PUBLIC_OCCASION_SLUGS = [
  "everyday",
  "workwear",
  "wedding",
  "graduation",
  "evening",
] as const;

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

const getCachedOccasionBrandFacets = unstable_cache(
  async () =>
    prisma.brand.findMany({
      where: {
        products: {
          some: {
            status: "APPROVED",
            isActive: true,
            publishedAt: { not: null },

            AND: [
              {
                productOccasions: {
                  some: {
                    occasion: {
                      slug: {
                        in: [...PUBLIC_OCCASION_SLUGS],
                      },
                    },
                  },
                },
              },
              {
                productOccasions: {
                  none: {
                    occasion: {
                      slug: "activewear",
                    },
                  },
                },
              },
            ],

            productType: { in: OCCASION_PRODUCT_TYPES },
          },
        },
      },
      orderBy: { name: "asc" },
      select: { slug: true, name: true, baseCountryCode: true },
      take: 1000,
    }),
  ["occasion-brand-facets"],
  { tags: ["storefront-products"], revalidate: 300 }
);

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

  const typeOptions: Opt[] = OCCASION_PRODUCT_TYPES.map((t) => ({
    value: t,
    label: titleCaseLabel(t),
  }));

  const where = {
  ...buildStorefrontWhere({
    filters,
  }),
  AND: [
    {
  productOccasions: {
    some: {
      occasion: {
        slug: {
          in: [...PUBLIC_OCCASION_SLUGS],
        },
      },
    },
  },
},
    {
      productOccasions: {
        none: {
          occasion: {
            slug: "activewear",
          },
        },
      },
    },
  ],
  productType: filters.types.length
    ? { in: filters.types }
    : { in: OCCASION_PRODUCT_TYPES },
};

  // Everything below is independent of every other query in this list, so
  // it all runs concurrently instead of as a chain of sequential round
  // trips to the database (this previously ran one-after-another, which is
  // most of why this route felt slow even though each individual query is
  // fast on its own).
  const mappedPromise: Promise<GridProduct[]> = (async () => {
    if (shouldUseMerchPageOne && currentPage === 1) {
      return getMerchPageOneProducts("OCCASION", pageOneVisibleCount);
    }

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
        slug: true,
        title: true,
        price: true,
        currency: true,
        badges: true,
        brand: { select: { name: true, slug: true } },
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { url: true },
        },
      },
    });

    return products.map((p, index) => ({
      id: p.id,
      title: p.title,

      brandName:
        p.brand?.name ?? null,

      brandSlug:
        p.brand?.slug ?? null,

      productSlug:
        p.slug ?? null,

      imageUrl:
        p.images?.[0]?.url ?? null,

      price:
        p.price
          ? p.price.toString()
          : null,

      currency:
        String(p.currency),

      buyUrl: buildTrackedOutboundUrl(
        p.id,
        {
          sourcePage: "CATEGORY",
          sectionKey: "occasion_grid",
          position: index + 1,
          pageNumber: currentPage,
          contextType: "OCCASION",
        }
      ),

      badges:
        (p.badges ?? []) as any,

      analytics: {
        sourcePage: "CATEGORY" as const,
        sectionKey: "occasion_grid",
        position: index + 1,
        pageNumber: currentPage,

        isExpandedPageOne:
          currentPage === 1
            ? isExpandedPageOne
            : false,

        contextType: "OCCASION",
      },
    }));
  })();

  const [brandsRaw, styleOptions, coloursRaw, sizesRaw, totalCount, mapped] =
    await Promise.all([
      getCachedOccasionBrandFacets(),
      getAvailableStyles(types),
      prisma.colour.findMany({
        orderBy: { name: "asc" },
        select: { slug: true, name: true },
        take: 300,
      }),
      prisma.size.findMany({
        orderBy: { name: "asc" },
        select: { slug: true, name: true },
        take: 500,
      }),
      prisma.product.count({ where }),
      mappedPromise,
    ]);

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

  const colorOptions: Opt[] = coloursRaw.map((c) => ({
    value: c.slug,
    label: c.name.toLowerCase(),
  }));

  const sizeOptions = sizesRaw.sort(sortSizes).map((s) => ({
    value: s.slug,
    label: formatSizeLabel(s.name),
  }));

  return (
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
  );
}