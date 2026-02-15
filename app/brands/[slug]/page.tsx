// C:\Users\Asiya\projects\dalra\app\brands\[slug]\page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/prisma";
import SiteShell from "@/components/SiteShell";
import { ProductRow, type StorefrontProduct } from "@/components/ProductRow";
import StorefrontFilters from "@/components/StorefrontFilters";

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const brand = await prisma.brand.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      baseCity: true,
      baseCountryCode: true,
      baseRegion: true,
      products: {
        where: { status: "APPROVED", isActive: true, publishedAt: { not: null } },
        orderBy: { publishedAt: "desc" },
        take: 48,
        select: {
          id: true,
          title: true,
          price: true,
          currency: true,
          affiliateUrl: true,
          sourceUrl: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        },
      },
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

  const products: StorefrontProduct[] = brand.products.map((p) => ({
    id: p.id,
    title: p.title,
    imageUrl: p.images?.[0]?.url ?? null,
    price: p.price ? p.price.toString() : null,
    currency: p.currency,
    buyUrl: (p.affiliateUrl || p.sourceUrl || null) as string | null,
  }));

  return (
    <SiteShell>
      <div className="mx-auto w-full max-w-[1800px] px-8 py-10 space-y-6">
        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <div className="text-2xl font-semibold">{brand.name}</div>
          <div className="mt-1 text-sm text-black/60">
            {/* We keep location subtle here (not on product cards) */}
            {brand.baseCity || brand.baseCountryCode || brand.baseRegion ? (
              <>
                {brand.baseCity ? brand.baseCity : ""}
                {brand.baseCity && brand.baseCountryCode ? ", " : ""}
                {brand.baseCountryCode ? brand.baseCountryCode : ""}
                {brand.baseRegion ? ` • ${brand.baseRegion.replaceAll("_", " ")}` : ""}
              </>
            ) : (
              " "
            )}
          </div>
        </div>

        {/* Optional: filter still useful to keep user within their chosen area */}
        <StorefrontFilters />

        <ProductRow products={products} />
      </div>
    </SiteShell>
  );
}
