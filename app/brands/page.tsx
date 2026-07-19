export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SiteShell from "@/components/SiteShell";
import countries from "world-countries";
import BrandFilters from "@/components/BrandFilters";
import BrandProfileTrackingLink from "@/components/analytics/BrandProfileTrackingLink";

function iso2NameMap() {
  const map = new Map<string, string>();

  for (const country of countries as any[]) {
    const code = String(country.cca2 ?? "").toUpperCase();
    const name = String(country.name?.common ?? "").trim();

    if (code && name) {
      map.set(code, name);
    }
  }

  return map;
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
        .flatMap((value) => String(value).split(","))
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function getBrandLetter(name: string) {
  const firstCharacter = name.trim().charAt(0).toUpperCase();

  return /^[A-Z]$/.test(firstCharacter) ? firstCharacter : "#";
}

function buildLetterHref(
  searchParams: Record<string, string | string[] | undefined>,
  letter?: string
) {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (key === "letter") return;

    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
    } else if (value) {
      params.set(key, value);
    }
  });

  if (letter) {
    params.set("letter", letter);
  }

  const queryString = params.toString();

  return queryString ? `/brands?${queryString}` : "/brands";
}

export default async function BrandsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const selectedLetterRaw = String(
    Array.isArray(sp.letter) ? sp.letter[0] ?? "" : sp.letter ?? ""
  )
    .trim()
    .toUpperCase();

  const selectedLetter =
    selectedLetterRaw === "#" || /^[A-Z]$/.test(selectedLetterRaw)
      ? selectedLetterRaw
      : "";

  const selectedCountries = allParams(sp, "country").map((value) =>
    value.toUpperCase()
  );

  const where = {
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
      orderBy: {
        name: "asc",
      },
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
        _count: {
          select: {
            products: true,
          },
        },
      },
    }),

    prisma.brand.findMany({
      where: {
        baseCountryCode: {
          not: null,
        },
      },
      select: {
        baseCountryCode: true,
      },
      distinct: ["baseCountryCode"],
    }),
  ]);

  const nameMap = iso2NameMap();

  const countryOptions = availableMeta
    .map((brand) => brand.baseCountryCode)
    .filter((value): value is string => Boolean(value))
    .map((code) => ({
      value: code,
      label: nameMap.get(code) ?? code,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const availableLetters = new Set(
    brands.map((brand) => getBrandLetter(brand.name))
  );

  const filteredBrands = selectedLetter
    ? brands.filter((brand) => getBrandLetter(brand.name) === selectedLetter)
    : brands;

  const groupedBrands = filteredBrands.reduce<
    Record<string, typeof filteredBrands>
  >((groups, brand) => {
    const letter = getBrandLetter(brand.name);

    if (!groups[letter]) {
      groups[letter] = [];
    }

    groups[letter].push(brand);

    return groups;
  }, {});

  const groupOrder = [
    ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
    "#",
  ].filter((letter) => groupedBrands[letter]?.length);

  const alphabet = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), "#"];

  return (
    <SiteShell>
      <main className="min-h-screen w-full bg-[#fcfbf8]">
        <div className="mx-auto w-full max-w-[1800px] px-5 py-10 md:px-8 md:py-14">
          {/* Page heading */}
          <header className="mb-12 text-center md:mb-16">
           
            <h1 className="mt-3 font-display text-[52px] font-normal leading-none tracking-normal text-black md:text-[72px]">
              Shop by Brand
            </h1>

            <p className="mt-4 font-body text-[15px] text-black/55 md:text-[17px]">
              Discover modest fashion brands from around the world.
            </p>
          </header>

          {/* Country filter */}
          <div className="mb-8 flex justify-end">
            <BrandFilters regions={[]} countries={countryOptions} />
          </div>

          {/* Alphabet navigation */}
          <nav
            aria-label="Filter brands alphabetically"
            className="mb-16 flex flex-wrap gap-2 md:mb-20"
          >
            <Link
              href={buildLetterHref(sp)}
              className={`flex min-h-12 items-center justify-center rounded-[8px] px-5 font-body text-[14px] font-medium transition-colors ${
                !selectedLetter
                  ? "bg-[#7B2D3E] text-white"
                  : "bg-black/[0.035] text-black hover:bg-black/[0.07]"
              }`}
            >
              Show all
            </Link>

            {alphabet.map((letter) => {
              const isAvailable = availableLetters.has(letter);
              const isActive = selectedLetter === letter;

              if (!isAvailable) {
                return (
                  <span
                    key={letter}
                    aria-disabled="true"
                    className="flex h-12 min-w-12 cursor-not-allowed items-center justify-center rounded-[8px] bg-black/[0.025] px-4 font-body text-[14px] text-black/20"
                  >
                    {letter}
                  </span>
                );
              }

              return (
                <Link
                  key={letter}
                  href={buildLetterHref(sp, letter)}
                  className={`flex h-12 min-w-12 items-center justify-center rounded-[8px] px-4 font-body text-[14px] font-medium transition-colors ${
                    isActive
                      ? "bg-[#7B2D3E] text-white"
                      : "bg-black/[0.035] text-black hover:bg-black/[0.07]"
                  }`}
                >
                  {letter}
                </Link>
              );
            })}
          </nav>

          {filteredBrands.length === 0 ? (
            <div className="border-y border-black/10 py-20 text-center">
              <p className="font-display text-3xl text-black">
                No brands found
              </p>

              <p className="mt-3 font-body text-sm text-black/50">
                Try another letter or country.
              </p>
            </div>
          ) : (
            <div className="space-y-20 md:space-y-28">
              {groupOrder.map((letter) => (
                <section key={letter}>
                  {/* Letter heading */}
                  <div className="mb-8 flex items-end gap-5 border-b border-black/10 pb-5 md:mb-10">
                    <h2 className="font-display text-[72px] font-normal leading-[0.8] tracking-normal text-black md:text-[96px]">
                      {letter}
                    </h2>

                    <p className="pb-1 font-body text-[12px] uppercase tracking-[0.18em] text-black/35">
                      {groupedBrands[letter].length}{" "}
                      {groupedBrands[letter].length === 1 ? "brand" : "brands"}
                    </p>
                  </div>

                  {/* Brand cards */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4">
                    {groupedBrands[letter].map((brand) => (
                      <BrandProfileTrackingLink
                        key={brand.id}
                        href={`/brands/${brand.slug}`}
                        brandName={brand.name}
                        brandId={brand.id}
                        className="group block"
                      >
                        <article>
                          <div className="relative aspect-[4/3] overflow-hidden rounded-[8px] bg-[#e7e1d9]">
                            {brand.coverImageUrl ? (
                              <div
                                className="absolute inset-0 bg-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
                                style={{
                                  backgroundImage: `url("${brand.coverImageUrl}")`,
                                  backgroundPosition: `${
                                    brand.coverImageFocalX ?? 50
                                  }% ${brand.coverImageFocalY ?? 50}%`,
                                }}
                              />
                            ) : (
                              <div className="absolute inset-0 bg-gradient-to-br from-[#f0ebe5] via-[#ddd4ca] to-[#c9b9aa]" />
                            )}

                            <div className="absolute inset-0 bg-black/15 transition-colors duration-300 group-hover:bg-black/25" />

                            <div className="absolute inset-0 flex items-center justify-center px-5 text-center">
                              <h3 className="font-display text-[28px] font-normal leading-none text-white drop-shadow-sm md:text-[36px]">
                                {brand.name}
                              </h3>
                            </div>
                          </div>

                          <div className="mt-3 flex items-start justify-between gap-4">
                            <div>
                              <p className="font-display text-[21px] leading-tight text-black md:text-[24px]">
                                {brand.name}
                              </p>

                              {(brand.baseCity || brand.baseCountryCode) && (
                                <p className="mt-1 font-body text-[11px] uppercase tracking-[0.15em] text-black/40">
                                  {[brand.baseCity, brand.baseCountryCode]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              )}
                            </div>

                            <span className="mt-1 font-body text-lg text-black/40 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#7B2D3E]">
                              →
                            </span>
                          </div>
                        </article>
                      </BrandProfileTrackingLink>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </SiteShell>
  );
}