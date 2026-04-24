export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import SiteShell from "@/components/SiteShell";
import ContinentFilters from "@/components/ContinentFilters";
import StorefrontPagination from "@/components/StorefrontPagination";
import { ProductGrid, type GridProduct } from "@/components/ProductGrid";
import { prisma } from "@/lib/prisma";
import {
  AffiliateStatus,
  BrandAccountStatus,
  ProductType,
} from "@prisma/client";
import { } from "@/lib/sizing/order";
import { parseStorefrontFilters } from "@/lib/storefront/parseFilters";
import { getAvailableStyles } from "@/lib/storefront/getAvailableStyles";
import { buildStorefrontWhere } from "@/lib/storefront/buildStorefrontWhere";
import { countryNameFromIso2 } from "@/lib/geo/countries";
import { getStorefrontPaginationState } from "@/lib/storefront/pagination";

type Opt = { value: string; label: string };

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

function accessoryTitleFromSlug(slug: string) {
  switch (slug) {
    case "rings":
      return "Rings";
    case "bracelets":
      return "Bracelets";
    case "necklaces":
      return "Necklaces";
    case "earrings":
      return "Earrings";
    case "watches":
      return "Watches";
    default:
      return "Accessories";
  }
}

const ACCESSORIES_ROOT_SLUG = "accessories";

const ACCESSORY_CATEGORY_SLUGS = [
  "accessories",
  "rings",
  "bracelets",
  "necklaces",
  "earrings",
  "watches",
];

const ACCESSORIES_PRODUCT_TYPES: ProductType[] = [
  ProductType.ACCESSORIES,
];

export default async function AccessoriesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const selectedAccessoryCategory =
    typeof sp.category === "string" ? sp.category.toLowerCase() : "";

  const filters = parseStorefrontFilters(sp);
  const { types, sort } = filters;

  const pagination = getStorefrontPaginationState(sp);
  const { currentPage, isExpandedPageOne, take } = pagination;

  const shouldUseMerchPageOne = false;

  const pageTitle = accessoryTitleFromSlug(selectedAccessoryCategory);

  const orderBy =
    sort === "price_asc"
      ? [{ price: "asc" as const }, { publishedAt: "desc" as const }]
      : sort === "price_desc"
      ? [{ price: "desc" as const }, { publishedAt: "desc" as const }]
      : [{ publishedAt: "desc" as const }];

  const accessoryCategories = await prisma.category.findMany({
    where: { slug: { in: ACCESSORY_CATEGORY_SLUGS } },
    select: { id: true, slug: true, parentId: true },
  });

  const accessoryRoot = accessoryCategories.find(
    (c) => c.slug === ACCESSORIES_ROOT_SLUG
  );

  const accessoryChildCategoryIds = accessoryCategories
    .filter((c) => c.slug !== ACCESSORIES_ROOT_SLUG)
    .map((c) => c.id);

  const selectedAccessoryCategoryRow = selectedAccessoryCategory
    ? accessoryCategories.find((c) => c.slug === selectedAccessoryCategory)
    : null;

  const accessoryCategoryIds = selectedAccessoryCategoryRow
    ? [selectedAccessoryCategoryRow.id]
    : [
        ...(accessoryRoot ? [accessoryRoot.id] : []),
        ...accessoryChildCategoryIds,
      ];

  const brandsRaw = await prisma.brand.findMany({
  where: {
    accountStatus: BrandAccountStatus.ACTIVE,
    affiliateStatus: AffiliateStatus.ACTIVE,
    products: {
      some: selectedAccessoryCategoryRow
        ? {
            status: "APPROVED",
            isActive: true,
            publishedAt: { not: null },
            categoryId: selectedAccessoryCategoryRow.id,
          }
        : {
            status: "APPROVED",
            isActive: true,
            publishedAt: { not: null },
            OR: [
              ...(accessoryCategoryIds.length
                ? [{ categoryId: { in: accessoryCategoryIds } }]
                : []),
              { productType: ProductType.ACCESSORIES },
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

  const typeOptions: Opt[] = ACCESSORIES_PRODUCT_TYPES.map((t) => ({
    value: t,
    label: titleCaseLabel(t),
  }));

  const accessoryTypesForFilters =
  types.length > 0 ? types : [ProductType.ACCESSORIES];

const styleOptions: Opt[] = await getAvailableStyles(accessoryTypesForFilters);

  const ACCESSORY_COLOUR_SLUGS = [
  "gold",
  "silver",
  "rose-gold",
  "platinum",
  "pearl",
  "black",
];

const coloursRaw = await prisma.colour.findMany({
  where: {
    slug: { in: ACCESSORY_COLOUR_SLUGS },
  },
  orderBy: { name: "asc" },
  select: { slug: true, name: true },
  take: 300,
});

  const colorOptions: Opt[] = coloursRaw.map((c) => ({
    value: c.slug,
    label: c.name.toLowerCase(),
  }));

  

  const where = selectedAccessoryCategoryRow
  ? {
      ...buildStorefrontWhere({
        filters: {
          ...filters,
          types: filters.types.length ? filters.types : [ProductType.ACCESSORIES],
        },
      }),
      categoryId: selectedAccessoryCategoryRow.id,
    }
  : {
      ...buildStorefrontWhere({
        filters: {
          ...filters,
          types: filters.types.length ? filters.types : [ProductType.ACCESSORIES],
        },
      }),
      AND: [
        {
          OR: [
            { categoryId: { in: accessoryCategoryIds } },
            { productType: ProductType.ACCESSORIES },
          ],
        },
      ],
    };

  const totalCount = await prisma.product.count({ where });

  let mapped: GridProduct[] = [];

  {
    let whereForPage = where;
    let skip = 0;

    if (currentPage === 1) {
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
        sectionKey: "accessories_grid",
        position: index + 1,
        pageNumber: currentPage,
        isExpandedPageOne: currentPage === 1 ? isExpandedPageOne : false,
        contextType: "GRID",
      },
    }));
  }

  return (
    <SiteShell>
      <main className="min-h-screen w-full bg-white">
        <div className="mx-auto w-full max-w-[1800px] space-y-8 px-8 py-10">
          <header className="text-center">
            <h1 className="font-display text-4xl tracking-[0.12em] md:text-5xl">
              {pageTitle}
            </h1>
            <p className="mt-3 text-sm text-black/60 md:text-base">
              Discover curated accessories and refined finishing touches.
            </p>
          </header>

          <ContinentFilters
            brands={brandOptions}
            countries={countryOptions}
            types={typeOptions}
            styles={styleOptions}
            colors={colorOptions}
            sizes={[]}
          />

          {mapped.length === 0 ? (
            <div className="rounded-2xl border border-black/10 bg-white p-10 text-center text-black/60">
              No items match your filters.
            </div>
          ) : (
            <section id="products">
              <ProductGrid products={mapped} />
              <StorefrontPagination
                pathname="/categories/accessories"
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