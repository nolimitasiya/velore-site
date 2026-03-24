export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SiteShell from "@/components/SiteShell";
import countries from "world-countries";
import BrandFilters from "@/components/BrandFilters";
import type { Region } from "@prisma/client";

function regionLabel(value: string | null) {
  return value ? value.replaceAll("_", " ") : null;
}

function iso2NameMap() {
  const m = new Map<string, string>();
  for (const c of countries as any[]) {
    const code = String(c.cca2 ?? "").toUpperCase();
    const name = String(c.name?.common ?? "").trim();
    if (code && name) m.set(code, name);
  }
  return m;
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

export default async function BrandsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const selectedRegion = String(
    Array.isArray(sp.region) ? sp.region[0] ?? "" : sp.region ?? ""
  )
    .trim()
    .toUpperCase();

  const selectedCountries = allParams(sp, "country").map((v) => v.toUpperCase());

  const where = {
    ...(selectedRegion ? { baseRegion: selectedRegion as any } : {}),
    ...(selectedCountries.length
      ? {
          baseCountryCode: {
            in: selectedCountries,
          },
        }
      : {}),
  };

  const [brands, availableMeta] = await Promise.all([
    prisma.brand.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
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
        _count: {
          select: {
            products: true,
          },
        },
      },
    }),

    prisma.brand.findMany({
      where: {
        OR: [
          { baseCountryCode: { not: null } },
          { baseRegion: { not: null } },
        ],
      },
      select: {
        baseCountryCode: true,
        baseRegion: true,
      },
      distinct: ["baseCountryCode", "baseRegion"],
    }),
  ]);

  const nameMap = iso2NameMap();

  const countryOptions = availableMeta
    .map((b) => b.baseCountryCode)
    .filter((v): v is string => !!v)
    .map((code) => ({
      value: code,
      label: nameMap.get(code) ?? code,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const regionValues = Array.from(
  new Set(availableMeta.map((b) => b.baseRegion).filter(Boolean))
);

const regionOptions = regionValues
  .map((r) => {
    const value = String(r);
    return {
      value,
      label: regionLabel(value) || value.replaceAll("_", " "),
    };
  })
  .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <SiteShell>
      <main className="mx-auto w-full max-w-[1800px] px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold">Shop by Brands</h1>
          <p className="mt-2 text-sm text-black/60">
            Discover global modest fashion brands on Veilora Club.
          </p>
        </div>

        <div className="mb-8 flex justify-end">
          <BrandFilters
            regions={regionOptions}
            countries={countryOptions}
          />
        </div>

        {brands.length === 0 ? (
          <div className="text-sm text-black/60">No brands found for this selection.</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {brands.map((b) => (
              <Link
                key={b.id}
                href={`/brands/${b.slug}`}
                className="group block overflow-hidden rounded-[24px]"
              >
                <div className="relative h-[160px] overflow-hidden rounded-[24px] bg-[#d8d0c5]">
                  <div
  className="absolute inset-0 bg-cover transition-transform duration-500 group-hover:scale-[1.03]"
  style={
    b.coverImageUrl
      ? {
          backgroundImage: `url("${b.coverImageUrl}")`,
          backgroundSize: "cover",
          backgroundPosition: `${b.coverImageFocalX ?? 50}% ${b.coverImageFocalY ?? 50}%`,
        }
      : undefined
  }
/>

                  {!b.coverImageUrl && (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#c8bbab] via-[#d8d0c5] to-[#b7aa98]" />
                  )}

                  <div className="absolute inset-0 bg-black/30" />

                  <div className="absolute inset-0 flex items-center justify-center px-5 text-center">
                    <div>
                      <div className="text-xl font-semibold tracking-[0.14em] text-white md:text-2xl">
                        {b.name}
                      </div>

                      <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/85">
                        {[regionLabel(b.baseRegion), b.baseCountryCode, b.baseCity]
                          .filter(Boolean)
                          .join(" • ")}
                      </div>

                      <div className="mt-2 text-xs text-white/90">
                        {b._count.products} product{b._count.products === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </SiteShell>
  );
}