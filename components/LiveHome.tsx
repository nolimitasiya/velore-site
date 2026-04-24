import { Hero, type StorefrontHeroData } from "@/components/Hero";
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
import { resolveHomepageStorefrontSection } from "@/lib/storefrontSections";
import { buildTrackedOutboundUrl } from "@/lib/affiliate/tracking";
import { getStorefrontHero } from "@/lib/storefront/getStorefrontHero";


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
  return products.map((p, index) => ({
    id: p.id,
    title: p.title,
    brandName: p.brand?.name ?? null,
    imageUrl: p.images?.[0]?.url ?? null,
    price: p.price ? p.price.toString() : null,
    currency: p.currency,
    buyUrl: buildTrackedOutboundUrl(p.id, {
      sourcePage: "HOME",
      position: index + 1,
    }),
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

function normalizeHero(hero: Awaited<ReturnType<typeof getStorefrontHero>>): StorefrontHeroData {
  return {
    ...hero,
    textAlign:
      hero.textAlign === "LEFT" ||
      hero.textAlign === "CENTER" ||
      hero.textAlign === "RIGHT"
        ? hero.textAlign
        : "LEFT",
  };
}

/* ---------------------------------- */
/* Component */
/* ---------------------------------- */

export default async function LiveHome({ region, country }: LiveHomeProps) {
  const selectedRegion = normalizeRegion(region);
  const selectedCountry = normalizeCountry(country);

  const rawHero = await getStorefrontHero();
  const hero = normalizeHero(rawHero);

  /* --------------------------- */
  /* SHOP TRENDY / PERSONALISED SLOT */
  /* --------------------------- */

  const finalSection = await resolveHomepageStorefrontSection(selectedCountry);

  /* map to UI */
  const trendy: StorefrontProduct[] =
    finalSection?.items.map((i, index) => ({
      id: i.product.id,
      title: i.product.title,
      brandName: i.product.brand?.name ?? null,
      imageUrl: i.product.images?.[0]?.url ?? null,
      price: i.product.price ? i.product.price.toString() : null,
      currency: i.product.currency,
      buyUrl: buildTrackedOutboundUrl(i.product.id, {
        sourcePage: "HOME",
        sectionId: finalSection.id,
        sectionKey: finalSection.key,
        position: index + 1,
      }),
    })) ?? [];


    const continentsDb = await prisma.continent.findMany({
  where: {
    isActive: true,
  },
  orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  select: {
    slug: true,
    name: true,
    imageUrl: true,
  },
});
  /* --------------------------- */
/* STYLE FEED (MANUAL) */
/* --------------------------- */

const homepageStyleFeedDb = await prisma.homepageStyleFeedItem.findMany({
  where: {
    isActive: true,
  },
  orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  take: 4,
  select: {
    id: true,
    imageUrl: true,
    imageAlt: true,
    imageFocalX: true,
    imageFocalY: true,
    postUrl: true,
    caption: true,
    sortOrder: true,
    title: true,
    instagramHandle: true,
  },
});

const liveStyleFeed: StyleFeedPost[] = homepageStyleFeedDb.map((p) => ({
  id: p.id,
  imageUrl: p.imageUrl,
  imageAlt: p.imageAlt ?? null,
  imageFocalX: p.imageFocalX,
  imageFocalY: p.imageFocalY,
  brandName: p.title ?? null,
brandInstagramHandle: p.instagramHandle ?? null,
brandInstagramUrl: p.instagramHandle
  ? `https://instagram.com/${p.instagramHandle.replace(/^@/, "")}`
  : null,
  caption: p.caption,
  permalink: p.postUrl ?? null,
  postedAt: null,
}));

const styleFeedToShow =
  liveStyleFeed.length > 0 ? liveStyleFeed : (demo.styleFeed as any);

  /* --------------------------- */
  /* Brand Mosaic */
  /* --------------------------- */

  const brandsDb = await prisma.brand.findMany({
    where: {
      showOnHomepage: true,
      coverImageUrl: { not: null },
    },
    orderBy: [{ homepageOrder: "asc" }, { createdAt: "desc" }],
    take: 6,
    select: {
      id: true,
      name: true,
      slug: true,
      coverImageUrl: true,
    },
  });

  const mosaicTiles: StorefrontBrandTile[] = brandsDb.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    imageUrl: b.coverImageUrl!,
  }));

  const diaryPosts = await prisma.diaryPost.findMany({
    where: {
      status: "PUBLISHED",
    },
    orderBy: {
      publishedAt: "desc",
    },
    take: 3,
  });

  const diaryCards = diaryPosts.map((post) => ({
    id: post.id,
    title: post.title,
    excerpt: post.excerpt,
    imageUrl: post.coverImageUrl,
    href: `/diary/${post.slug}`,
  }));

  /* --------------------------- */
  /* Render */
  /* --------------------------- */

  return (
    <main className="min-h-screen w-full bg-background text-foreground">
      <Hero hero={hero} />
      {/* <SaleTicker /> */}


      <div className="pt-8">
      <SectionTitle>{finalSection?.title ?? "Shop Trendy"}</SectionTitle>
</div>

<div className="mt-8">
  <ProductRow products={trendy} />
</div>

      <SloganAndContinents
  slogan="Where global brands and international style meet"
  continents={continentsDb}
/>

      <StyleFeed posts={styleFeedToShow} />
      <DalrasDiary posts={diaryCards} />
      <BrandMosaic tiles={mosaicTiles} />
    </main>
  );
}