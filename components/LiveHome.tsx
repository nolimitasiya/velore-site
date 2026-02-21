// C:\Users\Asiya\projects\dalra\components\LiveHome.tsx
import { Hero } from "@/components/Hero";
import { SaleTicker } from "@/components/SaleTicker";
import { SectionTitle } from "@/components/SectionTitle";
import { ProductRow, type StorefrontProduct } from "@/components/ProductRow";
import { SloganAndContinents } from "@/components/SloganAndContinents";
import { StyleFeed, type StyleFeedPost } from "@/components/StyleFeed";
import { DalrasDiary } from "@/components/DalrasDiary";
import { BrandMosaic, type StorefrontBrandTile } from "@/components/BrandMosaic";
import { prisma } from "@/lib/prisma";
import { demo } from "@/data/demo";
import type { Region } from "@prisma/client";

type LiveHomeProps = {
  region?: string;
  country?: string;
};

/* ---------------------------------- */
/* Helpers */
/* ---------------------------------- */

function toStorefrontProducts(
  products: Array<{
    id: string;
    title: string;
    price: any | null;
    currency: any;
    images: { url: string }[];
    brand: { name: string } | null;
  }>
): StorefrontProduct[] {
  return products.map((p) => ({
    id: p.id,
    title: p.title,
    brandName: p.brand?.name ?? null,
    imageUrl: p.images?.[0]?.url ?? null,
    price: p.price ? p.price.toString() : null,
    currency: p.currency,
    buyUrl: `/out/${p.id}`, // ✅ always tracked
  }));
}


function normalizeRegion(input?: string): Region | null {
  const r = String(input ?? "").trim().toUpperCase();
  const allowed: Region[] = [
    "AFRICA",
    "ASIA",
    "SOUTH_AMERICA",
    "EUROPE",
    "NORTH_AMERICA",
    "OCEANIA",
    "MIDDLE_EAST",
  ];
  return (allowed as string[]).includes(r) ? (r as Region) : null;
}

function normalizeCountry(input?: string): string | null {
  const c = String(input ?? "").trim().toUpperCase();
  return c.length === 2 ? c : null;
}

/* ---------------------------------- */
/* Component */
/* ---------------------------------- */

export default async function LiveHome({ region, country }: LiveHomeProps) {
  const selectedRegion = normalizeRegion(region);
  const selectedCountry = normalizeCountry(country);

  /* --------------------------- */
  /* SHOP TRENDY */
  /* --------------------------- */

  const trendyRaw = await prisma.product.findMany({
    where: {
  status: "APPROVED",
  isActive: true,
  publishedAt: { not: null },

  brand: {
    affiliateStatus: "ACTIVE",
    ...(selectedRegion ? { baseRegion: selectedRegion } : {}),
    ...(selectedCountry ? { baseCountryCode: selectedCountry } : {}),
  },

  OR: [
    { affiliateUrl: { not: null } },
    { brand: { affiliateBaseUrl: { not: null } } },
  ],
},



    orderBy: { publishedAt: "desc" },
    take: 12,
    select: {
  id: true,
  title: true,
  price: true,
  currency: true,
  affiliateUrl: true,
  sourceUrl: true,
  brand: { select: { name: true, affiliateBaseUrl: true } },
  images: { 

        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { url: true },
      },
    },
  });

  const trendy: StorefrontProduct[] = toStorefrontProducts(
    trendyRaw as any
  );

  /* --------------------------- */
  /* STYLE FEED */
  /* --------------------------- */

  const stylePostsDb = await prisma.styleFeedPost.findMany({
    where: { isActive: true },
    orderBy: [
      { isPinned: "desc" },
      { postedAt: "desc" },
      { createdAt: "desc" },
    ],
    take: 12,
    select: {
      id: true,
      imageUrl: true,
      caption: true,
      permalink: true,
      postedAt: true,
      brand: { select: { name: true } }, // ✅ correct
    },
  });

  const liveStyleFeed: StyleFeedPost[] = stylePostsDb.map((p) => ({
    id: p.id,
    imageUrl: p.imageUrl,
    brandName: p.brand?.name ?? null,
    caption: p.caption,
    permalink: p.permalink,
    postedAt: p.postedAt ? p.postedAt.toISOString() : null,
  }));

  const styleFeedToShow =
    liveStyleFeed.length > 0
      ? liveStyleFeed
      : (demo.styleFeed as any);

  /* --------------------------- */
  /* Brand Mosaic */
  /* --------------------------- */

  const mosaicTiles: StorefrontBrandTile[] = (
    demo.brandTiles as any[]
  ).map((t) => ({
    id: String(t.id),
    name: String(t.name),
    slug: String(t.slug ?? "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, ""),
    imageUrl: String(t.imageUrl),
  }));

  /* --------------------------- */
  /* Render */
  /* --------------------------- */

  return (
    <main className="min-h-screen w-full bg-[#eee]">
      <Hero imageUrl={demo.heroImage} />
      <SaleTicker />

      <SectionTitle>SHOP TRENDY</SectionTitle>
      <ProductRow products={trendy} />

      <SloganAndContinents
        slogan="Where global brands and international style meet"
        continents={demo.continents}
      />

      <StyleFeed posts={styleFeedToShow} />
      <DalrasDiary posts={demo.diary} />
      <BrandMosaic tiles={mosaicTiles} />
    </main>
  );
}
