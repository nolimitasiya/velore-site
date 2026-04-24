export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/prisma";
import SiteShell from "@/components/SiteShell";
import { ProductRow, type StorefrontProduct } from "@/components/ProductRow";
import StorefrontFilters from "@/components/StorefrontFilters";
import { Prisma, BrandAccountStatus, AffiliateStatus } from "@prisma/client";
import { buildTrackedOutboundUrl } from "@/lib/affiliate/tracking";


function regionLabel(value: string | null) {
  return value ? value.replaceAll("_", " ") : null;
}

function allParams(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const raw = searchParams[key];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];

  return Array.from(
    new Set(
      list
        .flatMap((v) => String(v).split(","))
        .map((v) => v.trim())
        .filter(Boolean)
    )
  );
}

function firstParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const raw = searchParams[key];
  if (Array.isArray(raw)) return raw[0] ?? "";
  return raw ?? "";
}

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const types = allParams(sp, "type").map((v) => v.toUpperCase());
  const styles = allParams(sp, "style").map((v) => v.toLowerCase());
  const colors = allParams(sp, "color").map((v) => v.toLowerCase());
  const sizes = allParams(sp, "size").map((v) => v.toLowerCase());

  const sort = firstParam(sp, "sort") || "new";
  const min = firstParam(sp, "min");
  const max = firstParam(sp, "max");
  const sale = ["1", "true", "yes", "on"].includes(
    firstParam(sp, "sale").toLowerCase()
  );

  const brand = await prisma.brand.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      coverImageUrl: true,
      coverImageFocalX: true,
      coverImageFocalY: true,
      baseCity: true,
      baseCountryCode: true,
      baseRegion: true,
      accountStatus: true,
      affiliateStatus: true,
    },
  });

  if (!brand) {
    return (
      <SiteShell>
        <div className="mx-auto w-full max-w-[1800px] px-8 py-12 text-sm text-black/60">
          Brand not found.
        </div>
      </SiteShell>
    );
  }

  // Public brand pages should only show operational + affiliate-active brands
  if (
    brand.accountStatus !== BrandAccountStatus.ACTIVE ||
    brand.affiliateStatus !== AffiliateStatus.ACTIVE
  ) {
    return (
      <SiteShell>
        <div className="mx-auto w-full max-w-[1800px] px-8 py-12 text-sm text-black/60">
          This brand is not currently available for shopping.
        </div>
      </SiteShell>
    );
  }

  const where: Prisma.ProductWhereInput = {
    brandId: brand.id,
    status: "APPROVED",
    isActive: true,
    publishedAt: { not: null },
    brand: {
      is: {
        accountStatus: BrandAccountStatus.ACTIVE,
        affiliateStatus: AffiliateStatus.ACTIVE,
      },
    },
  };

  if (types.length) {
    where.productType = { in: types as any };
  }

  if (styles.length) {
    where.productStyles = {
      some: {
        style: {
          slug: { in: styles },
        },
      },
    };
  }

  if (colors.length) {
    where.productColours = {
      some: {
        colour: {
          slug: { in: colors },
        },
      },
    };
  }

  if (sizes.length) {
    where.productSizes = {
      some: {
        size: {
          slug: { in: sizes },
        },
      },
    };
  }

  if (min || max) {
    where.price = {};
    if (min && !Number.isNaN(Number(min))) {
      where.price.gte = new Prisma.Decimal(min);
    }
    if (max && !Number.isNaN(Number(max))) {
      where.price.lte = new Prisma.Decimal(max);
    }
  }

  if (sale) {
    where.badges = {
      has: "sale",
    };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price_asc"
      ? { price: "asc" }
      : sort === "price_desc"
      ? { price: "desc" }
      : { publishedAt: "desc" };

  const productsDb = await prisma.product.findMany({
    where,
    orderBy,
    take: 48,
    select: {
      id: true,
      title: true,
      price: true,
      currency: true,
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { url: true },
      },
    },
  });

  const products: StorefrontProduct[] = productsDb.map((p, index) => ({
    id: p.id,
    title: p.title,
    imageUrl: p.images?.[0]?.url ?? null,
    price: p.price ? p.price.toString() : null,
    currency: p.currency,
    buyUrl: buildTrackedOutboundUrl(p.id, {
      sourcePage: "BRAND",
      position: index + 1,
    }),
  }));

  const location = [brand.baseCity, brand.baseCountryCode, regionLabel(brand.baseRegion)]
    .filter(Boolean)
    .join(" • ");

  return (
    <SiteShell>
      <div className="mx-auto w-full max-w-[1800px] px-8 py-10 space-y-8">
        <section className="overflow-hidden rounded-[32px]">
          <div className="relative h-[340px] md:h-[500px] bg-[#d8d0c5]">
            <div
              className="absolute inset-0 bg-cover"
              style={
                brand.coverImageUrl
                  ? {
                      backgroundImage: `url("${brand.coverImageUrl}")`,
                      backgroundSize: "cover",
                      backgroundPosition: `${brand.coverImageFocalX ?? 50}% ${brand.coverImageFocalY ?? 50}%`,
                    }
                  : undefined
              }
            />

            {!brand.coverImageUrl && (
              <div className="absolute inset-0 bg-gradient-to-br from-[#c8bbab] via-[#d8d0c5] to-[#b7aa98]" />
            )}

            <div className="absolute inset-0 bg-black/30" />

            <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
              <div>
                <h1 className="text-3xl font-semibold tracking-[0.18em] text-white md:text-6xl">
                  {brand.name}
                </h1>
                {location ? (
                  <p className="mt-4 text-sm uppercase tracking-[0.22em] text-white/85">
                    {location}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <StorefrontFilters showLocation={false} showCountries={false} />

        <div>
          <div className="mb-4 text-sm text-black/60">
            {products.length} product{products.length === 1 ? "" : "s"}
          </div>
          <ProductRow products={products} />
        </div>
      </div>
    </SiteShell>
  );
}