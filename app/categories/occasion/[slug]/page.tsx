export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { notFound } from "next/navigation";
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
import { getStorefrontPaginationState } from "@/lib/storefront/pagination";
import {
  getCategoryMerchProducts,
  getCategoryMerchLiveIds,
} from "@/lib/storefront/getCategoryMerchProducts";

import {
  buildTrackedOutboundUrl,
} from "@/lib/affiliate/tracking";


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

  return s
    .toLowerCase()
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function OccasionSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const key = String(slug).trim().toLowerCase();

  if (!PUBLIC_OCCASION_SLUGS.includes(key as any)) {
  return notFound();
}

  const occasion = await prisma.occasion.findUnique({
    where: { slug: key },
    select: { id: true, name: true, slug: true },
  });

  if (!occasion) return notFound();

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
  filters.saleOn ||
  filters.polyesterFree;

const shouldUseOccasionMerch =
  !hasActiveFilters &&
  sort === "new";

  const pagination = getStorefrontPaginationState(sp);
  const { currentPage, isExpandedPageOne, take } = pagination;

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
            some: {
              occasionId: occasion.id,
            },
          },
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

  const sizeOptions = sizesRaw
    .sort(sortSizes)
    .map((s) => ({
      value: s.slug,
      label: formatSizeLabel(s.name),
    }));

  const where = buildStorefrontWhere({
    filters,
    occasionSlug: occasion.slug,
  });

  const totalCount = await prisma.product.count({ where });

  let mapped: GridProduct[] = [];

if (
  shouldUseOccasionMerch &&
  currentPage === 1
) {
  mapped = await getCategoryMerchProducts({
    scopeType: "OCCASION",
    scopeKey: occasion.slug,
    visibleCount: isExpandedPageOne ? 48 : 24,
  });
} else {
  let whereForPage = where;
  let skip = 0;

  if (
    shouldUseOccasionMerch &&
    currentPage >= 2
  ) {
    const protectedIds =
      await getCategoryMerchLiveIds({
        scopeType: "OCCASION",
        scopeKey: occasion.slug,
      });

    whereForPage = {
      ...where,
      id: {
        notIn: protectedIds,
      },
    };

    skip = (currentPage - 2) * 24;
  } else if (currentPage === 1) {
    skip = 0;
  } else {
    skip =
      48 +
      (currentPage - 2) * 24;
  }

  const products =
    await prisma.product.findMany({
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
        brand: {
          select: {
            name: true,
            slug: true,
          },
        },
        images: {
          orderBy: {
            sortOrder: "asc",
          },
          take: 1,
          select: {
            url: true,
          },
        },
      },
    });

  mapped = products.map((p, index) => ({
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
      sectionKey: `occasion_${occasion.slug}_grid`,
      position: index + 1,
      pageNumber: currentPage,
      contextType: "OCCASION_TYPE",
    }
  ),

  badges:
    (p.badges ?? []) as string[],

  analytics: {
    sourcePage: "CATEGORY" as const,
    sectionKey: `occasion_${occasion.slug}_grid`,
    position: index + 1,
    pageNumber: currentPage,

    isExpandedPageOne:
      currentPage === 1
        ? isExpandedPageOne
        : false,

    contextType: "OCCASION_TYPE",
  },
}));
}

  

  return (
    <SiteShell>
      <main className="min-h-screen w-full bg-white">
        <div className="mx-auto w-full max-w-[1800px] px-8 py-10 space-y-8">
          <header className="text-center">
            <h1 className="font-display text-4xl md:text-5xl tracking-[0.12em]">
              {occasion.name}
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
            <section id="products">
              <ProductGrid products={mapped} />
              <StorefrontPagination
                pathname={`/categories/occasion/${occasion.slug}`}
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