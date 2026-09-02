// app/search/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import SiteShell from "@/components/SiteShell";
import ContinentFilters from "@/components/ContinentFilters";
import { ProductGrid, type GridProduct } from "@/components/ProductGrid";
import { prisma } from "@/lib/prisma";
import { AffiliateStatus, BrandAccountStatus, ProductType } from "@prisma/client";
import { sortSizes, formatSizeLabel } from "@/lib/sizing/order";
import { parseStorefrontFilters } from "@/lib/storefront/parseFilters";
import { getAvailableStyles } from "@/lib/storefront/getAvailableStyles";
import { buildStorefrontWhere } from "@/lib/storefront/buildStorefrontWhere";
import { countryNameFromIso2 } from "@/lib/geo/countries";
import { buildTrackedOutboundUrl } from "@/lib/affiliate/tracking";
import SearchAnalyticsTracker from "@/components/analytics/SearchAnalyticsTracker";

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
  return s
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function singularizeSimpleWord(word: string) {
  const normalized = normalizeText(word);

  if (normalized.endsWith("ies") && normalized.length > 3) {
    return `${normalized.slice(0, -3)}y`;
  }

  if (normalized.endsWith("s") && normalized.length > 3) {
    return normalized.slice(0, -1);
  }

  return normalized;
}
function queryContainsTaxonomyValue(
  query: string,
  name: string,
  slug: string
) {
  const normalizedQuery = normalizeText(query);

  const candidates = [
    normalizeText(name),
    normalizeText(slug),
  ].filter(Boolean);

  return candidates.some((candidate) => {
    const escaped = candidate.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const pattern = new RegExp(
      `(^|\\s)${escaped}(?=\\s|$)`,
      "i"
    );

    return pattern.test(normalizedQuery);
  });
}

function productTypeSearchTerms(type: ProductType) {
  const enumText = normalizeText(type);
  const labelText = normalizeText(
    STOREFRONT_TYPE_LABELS[type] ?? titleCaseLabel(type)
  );

  return new Set([
    enumText,
    labelText,
    singularizeSimpleWord(enumText),
    singularizeSimpleWord(labelText),
  ]);
}

  
  const PRODUCT_TYPE_SEARCH_ALIASES: Partial<
  Record<ProductType, string[]>
> = {
  ABAYA: [
    "abaya",
    "abayas",
  ],

  DRESS: [
    "dress",
    "dresses",
    "maxi dress",
    "long dress",
  ],

  SKIRT: [
    "skirt",
    "skirts",
    "maxi skirt",
    "long skirt",
  ],

  TOP: [
    "top",
    "tops",
    "blouse",
    "blouses",
    "shirt",
    "shirts",
  ],


  HIJAB: [
    "hijab",
    "hijabs",
    "scarf",
    "scarves",
    "headscarf",
    "headscarves",
    "head scarf",
    "head scarves",
  ],

  ACTIVEWEAR: [
    "activewear",
    "sportswear",
    "gymwear",
    "gym wear",
    "workout wear",
  ],

  SETS: [
    "set",
    "sets",
    "matching set",
    "matching sets",
    "co ord",
    "co ords",
    "coord",
    "coords",
    "two piece",
    "two piece set",
  ],

  MATERNITY: [
    "maternity",
    "pregnancy",
    "pregnancy wear",
    "maternity wear",
  ],

  KHIMAR: [
    "khimar",
    "khimars",
  ],

  JILBAB: [
    "jilbab",
    "jilbabs",
  ],

   COATS_JACKETS: [
    "coat",
    "coats",
    "jacket",
    "jackets",
    "coat jacket",
    "coats jackets",
  ],

  HOODIE_SWEATSHIRT: [
    "hoodie",
    "hoodies",
    "sweatshirt",
    "sweatshirts",
    "sweater",
    "sweaters",
  ],

  PANTS: [
    "pants",
    "trousers",
    "trouser",
    "wide leg trousers",
    "wide leg pants",
  ],

  BLAZER: [
    "blazer",
    "blazers",
  ],


};

function matchingProductTypesFromQuery(
  q: string
): ProductType[] {
  const normalizedQuery = normalizeText(q);

  return (Object.values(ProductType) as ProductType[]).filter(
    (type) => {
      const enumText = normalizeText(type);

      const labelText = normalizeText(
        STOREFRONT_TYPE_LABELS[type] ??
          titleCaseLabel(type)
      );

      const candidates = new Set([
  enumText,
  labelText,
  singularizeSimpleWord(enumText),
  singularizeSimpleWord(labelText),

  ...(
    PRODUCT_TYPE_SEARCH_ALIASES[type] ??
    []
  ).map(normalizeText),
]);

      return Array.from(candidates).some((candidate) => {
        const escaped = candidate.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

        const pattern = new RegExp(
          `(^|\\s)${escaped}(?=\\s|$)`,
          "i"
        );

        return pattern.test(normalizedQuery);
      });
    }
  );
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

  const normalizedQuery = normalizeText(q);
  

  const matchedTypes = q
  ? matchingProductTypesFromQuery(q)
  : [];

  const orderBy =
    sort === "price_asc"
      ? [{ price: "asc" as const }, { publishedAt: "desc" as const }]
      : sort === "price_desc"
      ? [{ price: "desc" as const }, { publishedAt: "desc" as const }]
      : [{ publishedAt: "desc" as const }];

  const brandsRaw = await prisma.brand.findMany({
  where: {
    accountStatus: BrandAccountStatus.ACTIVE,
    affiliateStatus: AffiliateStatus.ACTIVE,
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
  select: {
    id: true,
    slug: true,
    name: true,
  },
  take: 300,
});

  const colorOptions: Opt[] = coloursRaw.map((c) => ({
    value: c.slug,
    label: c.name.toLowerCase(),
  }));

  

  const stylesRaw = await prisma.style.findMany({
  orderBy: {
    name: "asc",
  },
  select: {
    id: true,
    name: true,
    slug: true,
  },
  take: 300,
});

const matchedStyles = q
  ? stylesRaw.filter((style) =>
      queryContainsTaxonomyValue(
        q,
        style.name,
        style.slug
      )
    )
  : [];

  const materialsRaw = await prisma.material.findMany({
  orderBy: {
    name: "asc",
  },
  select: {
    id: true,
    name: true,
    slug: true,
  },
  take: 300,
});

const matchedMaterials = q
  ? materialsRaw.filter((material) =>
      queryContainsTaxonomyValue(
        q,
        material.name,
        material.slug
      )
    )
  : [];

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

  const occasionsRaw = await prisma.occasion.findMany({
  orderBy: {
    name: "asc",
  },
  select: {
    id: true,
    name: true,
    slug: true,
  },
});

const matchedOccasions = q
  ? occasionsRaw.filter((occasion) =>
      queryContainsTaxonomyValue(
        q,
        occasion.name,
        occasion.slug
      )
    )
  : [];

const matchedColours = q
  ? coloursRaw.filter((colour) =>
      queryContainsTaxonomyValue(
        q,
        colour.name,
        colour.slug
      )
    )
  : [];

  const baseWhere = buildStorefrontWhere({
    filters,
  });


  const hasStructuredIntent =
  matchedTypes.length > 0 ||
  matchedOccasions.length > 0 ||
  matchedColours.length > 0 ||
  matchedStyles.length > 0 ||
  matchedMaterials.length > 0;

const structuredIntentWhere = hasStructuredIntent
  ? {
      AND: [
        ...(matchedTypes.length
          ? [
              {
                OR: [
                  {
                    productType: {
                      in: matchedTypes,
                    },
                  },
                  {
                    productTypes: {
                      some: {
                        productType: {
                          in: matchedTypes,
                        },
                      },
                    },
                  },
                ],
              },
            ]
          : []),

        ...(matchedOccasions.length
          ? [
              {
                productOccasions: {
                  some: {
                    occasionId: {
                      in: matchedOccasions.map(
                        (occasion) => occasion.id
                      ),
                    },
                  },
                },
              },
            ]
          : []),

          ...(matchedColours.length
  ? [
      {
        productColours: {
          some: {
            colourId: {
              in: matchedColours.map(
                (colour) => colour.id
              ),
            },
          },
        },
      },
    ]
  : []),

  ...(matchedStyles.length
  ? [
      {
        productStyles: {
          some: {
            styleId: {
              in: matchedStyles.map(
                (style) => style.id
              ),
            },
          },
        },
      },
    ]
  : []),

  ...(matchedMaterials.length
  ? [
      {
        productMaterials: {
          some: {
            materialId: {
              in: matchedMaterials.map(
                (material) => material.id
              ),
            },
          },
        },
      },
    ]
  : []),

      ],
    }
  : null;

const freeTextWhere = q
  ? {
      OR: [
        {
          title: {
            contains: q,
            mode: "insensitive" as const,
          },
        },
        {
          brand: {
            is: {
              name: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
          },
        },
        {
          category: {
            is: {
              name: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
          },
        },
        {
          category: {
            is: {
              slug: {
                contains: q.toLowerCase(),
                mode: "insensitive" as const,
              },
            },
          },
        },
        {
          productTags: {
            some: {
              tag: {
                name: {
                  contains: q,
                  mode: "insensitive" as const,
                },
              },
            },
          },
        },
        {
          productTags: {
            some: {
              tag: {
                slug: {
                  contains: q.toLowerCase(),
                  mode: "insensitive" as const,
                },
              },
            },
          },
        },
        {
          productStyles: {
            some: {
              style: {
                name: {
                  contains: q,
                  mode: "insensitive" as const,
                },
              },
            },
          },
        },
        {
          productMaterials: {
            some: {
              material: {
                name: {
                  contains: q,
                  mode: "insensitive" as const,
                },
              },
            },
          },
        },
        {
          productOccasions: {
            some: {
              occasion: {
                name: {
                  contains: q,
                  mode: "insensitive" as const,
                },
              },
            },
          },
        },
      ],
    }
  : null;

const where = q
  ? {
      AND: [
        baseWhere,

        hasStructuredIntent
          ? structuredIntentWhere!
          : freeTextWhere!,
      ],
    }
  : baseWhere;

  const products = await prisma.product.findMany({
    where,
    orderBy,
    take: 120,
    select: {
      id: true,
      slug: true,
      title: true,
      price: true,
      currency: true,
      badges: true,
      brand: { select: { name: true, slug: true } },
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
  brandSlug: p.brand?.slug ?? null, // ← ADD
  productSlug: p.slug ?? null,       // ← ADD
  badges: (p.badges ?? []) as any,

  analytics: {
  sourcePage: "SEARCH",
  sectionKey: "search_results",
  position: index + 1,
  pageNumber: 1,
  contextType: "SEARCH_RESULTS",
  searchQuery: q,
},

}));

const searchIntent = {
  productTypes: matchedTypes,

  occasions: matchedOccasions.map(
    (occasion) => occasion.slug
  ),

  colours: matchedColours.map(
    (colour) => colour.slug
  ),

  styles: matchedStyles.map(
    (style) => style.slug
  ),

  materials: matchedMaterials.map(
    (material) => material.slug
  ),
};


  return (
    <SiteShell>
      {q ? (
  <SearchAnalyticsTracker
    query={q}
    resultsCount={mapped.length}
    intent={searchIntent}
    filters={filters}
  />
) : null}

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