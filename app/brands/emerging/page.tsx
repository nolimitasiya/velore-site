export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import SiteShell from "@/components/SiteShell";
import {
  BrandAccountStatus,
  AffiliateStatus,
} from "@prisma/client";

export default async function EmergingBrandsPage() {
  const brands = await prisma.brand.findMany({
    where: {
      showOnHomepage: true,

      coverImageUrl: {
        not: null,
      },

      accountStatus:
        BrandAccountStatus.ACTIVE,

      affiliateStatus:
        AffiliateStatus.ACTIVE,
    },

    orderBy: [
      {
        homepageOrder: "asc",
      },
      {
        createdAt: "desc",
      },
    ],

    take: 50,

    select: {
      id: true,
      name: true,
      slug: true,

      coverImageUrl: true,
      coverImageFocalX: true,
      coverImageFocalY: true,

      baseCity: true,
      baseCountryCode: true,
    },
  });

  return (
    <SiteShell>
      <main className="min-h-screen bg-[#fcfbf8]">
        <div className="mx-auto w-full max-w-[1800px] px-5 py-10 md:px-8 md:py-14">

          {/* Hero */}
          <header className="mb-14 max-w-3xl md:mb-20">
            <p className="font-body text-[11px] uppercase tracking-[0.24em] text-black/45">
              Discover
            </p>

            <h1 className="mt-4 font-display text-[52px] font-normal leading-none tracking-[-0.02em] text-black md:text-[76px]">
              Emerging Brands
            </h1>

            <p className="mt-5 max-w-2xl font-body text-[15px] leading-7 text-black/55 md:text-[17px]">
              Discover independent labels shaping the next chapter of modest fashion.
            </p>

            <div className="mt-7 h-px w-20 bg-black/20" />
          </header>

          {/* Top navigation */}
          <div className="mb-10 flex items-center justify-between border-b border-black/10 pb-5 md:mb-14">
            <p className="font-body text-[11px] uppercase tracking-[0.18em] text-black/40">
              {brands.length} curated{" "}
              {brands.length === 1
                ? "brand"
                : "brands"}
            </p>

            <Link
              href="/brands"
              className="group flex items-center gap-4 font-body text-[11px] uppercase tracking-[0.18em] text-black/55 transition-colors hover:text-[#7B2D3E]"
            >
              <span className="border-b border-black/20 pb-1">
                Browse all brands
              </span>

              <span className="text-lg transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>

          {brands.length === 0 ? (
            <div className="border-y border-black/10 py-24 text-center">
              <h2 className="font-display text-[36px] font-normal text-black">
                No emerging brands yet
              </h2>

              <p className="mt-3 font-body text-sm text-black/45">
                Curated brands will appear here once selected.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">

              {brands.map((brand, index) => (
                <Link
                  key={brand.id}
                  href={
  `/brands/${brand.slug}` +
  `?src=EMERGING_BRANDS` +
  `&skey=emerging_brands_grid` +
  `&pos=${index + 1}` +
  `&page=1` +
  `&ctx=EMERGING_BRANDS_GRID`
}
                  className="group block"
                >
                  <article>
                    <div className="relative aspect-[4/5] overflow-hidden bg-black/[0.04]">

                      {brand.coverImageUrl ? (
                        <Image
                          src={brand.coverImageUrl}
                          alt={brand.name}
                          fill
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
                          style={{
                            objectPosition: `${
                              brand.coverImageFocalX ?? 50
                            }% ${
                              brand.coverImageFocalY ?? 50
                            }%`,
                          }}
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#f0ebe5] via-[#ddd4ca] to-[#c9b9aa]" />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                      <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-7">
                        <p className="font-body text-[10px] uppercase tracking-[0.2em] text-white/65">
                          Emerging brand
                        </p>

                        <h2 className="mt-2 font-display text-[34px] font-normal leading-none md:text-[42px]">
                          {brand.name}
                        </h2>

                        {(brand.baseCity ||
                          brand.baseCountryCode) && (
                          <p className="mt-3 font-body text-[10px] uppercase tracking-[0.16em] text-white/65">
                            {[
                              brand.baseCity,
                              brand.baseCountryCode,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}

                        <div className="mt-5 flex items-center gap-4 font-body text-[10px] uppercase tracking-[0.2em] text-white/90">
                          <span className="border-b border-white/50 pb-1">
                            Discover
                          </span>

                          <span className="text-base transition-transform duration-300 group-hover:translate-x-1">
                            →
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Editorial number */}
                    <div className="mt-3 flex items-start justify-between gap-4">
                      <p className="font-body text-[10px] uppercase tracking-[0.18em] text-black/35">
                        {String(
                          index + 1
                        ).padStart(2, "0")}
                      </p>

                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </SiteShell>
  );
}