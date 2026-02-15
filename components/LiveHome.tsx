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
  region?: string;  // e.g. "EUROPE"
  country?: string; // e.g. "GB"
};

function toStorefrontProducts(
  products: Array<{
    id: string;
    title: string;
    price: any | null;
    currency: any;
    affiliateUrl: string | null;
    sourceUrl: string | null;
    images: { url: string }[];
  }>
): StorefrontProduct[] {
  return products.map((p) => ({
    id: p.id,
    title: p.title,
    imageUrl: p.images?.[0]?.url ?? null,
    price: p.price ? p.price.toString() : null,
    currency: p.currency,
    buyUrl: (p.affiliateUrl || p.sourceUrl || null) as string | null,
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

async function fetchProductsByRegion(region: Region, take = 12) {
  const products = await prisma.product.findMany({
    where: {
      status: "APPROVED",
      isActive: true,
      publishedAt: { not: null },
      brand: { baseRegion: region },
    },
    orderBy: { publishedAt: "desc" },
    take,
    select: {
      id: true,
      title: true,
      price: true,
      currency: true,
      affiliateUrl: true,
      sourceUrl: true,
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { url: true },
      },
    },
  });

  return toStorefrontProducts(products as any);
}

const REGION_SECTIONS: Array<{ region: Region; title: string }> = [
  { region: "AFRICA", title: "AFRICA EDIT" },
  { region: "ASIA", title: "ASIA EDIT" },
  { region: "SOUTH_AMERICA", title: "SOUTH AMERICA EDIT" },
  { region: "EUROPE", title: "EUROPE EDIT" },
  { region: "NORTH_AMERICA", title: "NORTH AMERICA EDIT" },
  { region: "OCEANIA", title: "OCEANIA EDIT" },
  { region: "MIDDLE_EAST", title: "MIDDLE EAST EDIT" },
];

export default async function LiveHome({ region, country }: LiveHomeProps) {
  const selectedRegion = normalizeRegion(region);
  const selectedCountry = normalizeCountry(country);

  // ---------------------------
  // SHOP TRENDY (optionally filtered)
  // ---------------------------
  const trendyRaw = await prisma.product.findMany({
    where: {
      status: "APPROVED",
      isActive: true,
      publishedAt: { not: null },
      ...(selectedRegion ? { brand: { baseRegion: selectedRegion } } : {}),
      ...(selectedCountry ? { brand: { baseCountryCode: selectedCountry } } : {}),
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
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { url: true },
      },
    },
  });

  const trendy: StorefrontProduct[] = toStorefrontProducts(trendyRaw as any);

  // ---------------------------
  // Region edits (ALL 7)
  // If a region is selected in querystring, only show that region section.
  // ---------------------------
  const sectionsToShow = selectedRegion
    ? REGION_SECTIONS.filter((s) => s.region === selectedRegion)
    : REGION_SECTIONS;

  const regionResults = await Promise.all(
    sectionsToShow.map(async (s) => ({
      ...s,
      products: await fetchProductsByRegion(s.region, 12),
    }))
  );

  // ---------------------------
  // Live Style Feed
  // ---------------------------
  const stylePostsDb = await prisma.styleFeedPost.findMany({
    where: { isActive: true },
    orderBy: [{ isPinned: "desc" }, { postedAt: "desc" }, { createdAt: "desc" }],
    take: 12,
    select: {
      id: true,
      imageUrl: true,
      caption: true,
      permalink: true,
      postedAt: true,
    },
  });

  const liveStyleFeed: StyleFeedPost[] = stylePostsDb.map((p) => ({
    id: p.id,
    imageUrl: p.imageUrl,
    caption: p.caption,
    permalink: p.permalink,
    postedAt: p.postedAt ? p.postedAt.toISOString() : null,
  }));

  const styleFeedToShow =
    liveStyleFeed.length > 0 ? liveStyleFeed : (demo.styleFeed as any);

  // ---------------------------
  // Brand mosaic tiles
  // demo tiles may not match StorefrontBrandTile, so map safely
  // ---------------------------
  const mosaicTiles: StorefrontBrandTile[] = (demo.brandTiles as any[]).map((t) => ({
    id: String(t.id),
    name: String(t.name),
    slug: String(t.slug ?? "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, ""),
    imageUrl: String(t.imageUrl),
  }));

  return (
    <main className="min-h-screen w-full bg-[#eee]">
      <Hero imageUrl={demo.heroImage} />
      <SaleTicker />

      <SectionTitle>SHOP TRENDY</SectionTitle>
      <ProductRow products={trendy} />

      {regionResults.map((s) =>
        s.products.length > 0 ? (
          <div key={s.region}>
            <SectionTitle>{s.title}</SectionTitle>
            <ProductRow products={s.products} />
          </div>
        ) : null
      )}

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
